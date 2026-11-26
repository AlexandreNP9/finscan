import { and, asc, desc, eq, getTableColumns, gt, inArray, isNull, lte, notInArray, sql, type Column } from 'drizzle-orm';
import { db, type Db } from './index';
import { agentes, categorias, grupos, itens, sessoes, transacoes, usuarios } from './schema';
import { brParaNumeric, ErroValidacao, numericParaBr, validarData, validarHora } from './formato';
import { CATEGORIAS_PADRAO } from './categorias-padrao';
import type { Item, Transacao } from '../../types';

// Camada de acesso a dados. A API continua expondo o mesmo formato da época dos arquivos JSON
// (valores em string no padrão brasileiro, `categoria: ''` para item pendente, nomes em vez de ids),
// então as páginas não precisam saber que existe um banco relacional por trás.

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type TabelaLista = typeof categorias | typeof agentes;

/**
 * De quem são os dados que uma operação lê ou grava: a conta pessoal de um usuário ou um grupo.
 * Em `pessoal`, `usuarioId` null só ocorre no seed sem e-mail, que trabalha com os dados ainda
 * sem dono. Em `grupo`, `usuarioId` é quem está agindo (vira o autor das transações que registrar).
 */
export type Escopo =
  | { tipo: 'pessoal'; usuarioId: number | null }
  | { tipo: 'grupo'; usuarioId: number; grupoId: number };

export const escopoPessoal = (usuarioId: number | null): Escopo => ({ tipo: 'pessoal', usuarioId });

function doDono(coluna: Column, usuarioId: number | null) {
  return usuarioId === null ? isNull(coluna) : eq(coluna, usuarioId);
}

/**
 * Filtro "pertence a este escopo" para tabelas com `usuario_id` + `grupo_id`. No pessoal, exigir
 * `grupo_id` null é essencial: transações de grupo também guardam o `usuario_id` de quem registrou.
 */
function doEscopo(tabela: { usuarioId: Column; grupoId: Column }, e: Escopo) {
  return e.tipo === 'grupo' ? eq(tabela.grupoId, e.grupoId) : and(doDono(tabela.usuarioId, e.usuarioId), isNull(tabela.grupoId));
}

/** Colunas de dono de uma linha nova de categoria/agente. */
function donoDaLista(e: Escopo) {
  return e.tipo === 'grupo' ? { usuarioId: null, grupoId: e.grupoId } : { usuarioId: e.usuarioId, grupoId: null };
}

// ---------- Categorias / Agentes (listas de nomes, uma por dono) ----------

export async function listarNomes(tabela: TabelaLista, escopo: Escopo): Promise<string[]> {
  const linhas = await db
    .select({ nome: tabela.nome })
    .from(tabela)
    .where(doEscopo(tabela, escopo))
    .orderBy(asc(tabela.ordem), asc(tabela.id));
  return linhas.map((l) => l.nome);
}

/** Substitui a lista inteira do dono (semântica do POST das telas de gerenciamento). */
export async function substituirLista(tabela: TabelaLista, nomes: unknown, escopo: Escopo): Promise<void> {
  if (!Array.isArray(nomes) || nomes.some((n) => typeof n !== 'string')) {
    throw new ErroValidacao('A lista deve ser um array de textos.');
  }
  const limpos = [...new Set((nomes as string[]).map((n) => n.trim()).filter(Boolean))];
  const doDonoDaLista = doEscopo(tabela, escopo);
  const dono = donoDaLista(escopo);

  await db.transaction(async (tx) => {
    if (limpos.length > 0) {
      await tx.delete(tabela).where(and(doDonoDaLista, notInArray(tabela.nome, limpos)));
      await tx
        .insert(tabela)
        .values(limpos.map((nome, ordem) => ({ ...dono, nome, ordem })))
        .onConflictDoUpdate({ target: [tabela.usuarioId, tabela.grupoId, tabela.nome], set: { ordem: sql`excluded.ordem` } });
    } else {
      await tx.delete(tabela).where(doDonoDaLista);
    }
  });
}

/** Acrescenta nomes ao fim da lista do dono, ignorando os que já existem (usado pelo seed). */
export async function acrescentarNomes(tabela: TabelaLista, nomes: string[], escopo: Escopo): Promise<void> {
  if (nomes.length === 0) return;
  const [{ maior }] = await db
    .select({ maior: sql<number>`coalesce(max(${tabela.ordem}), -1)::int` })
    .from(tabela)
    .where(doEscopo(tabela, escopo));
  await db
    .insert(tabela)
    .values(nomes.map((nome, i) => ({ ...donoDaLista(escopo), nome, ordem: maior + 1 + i })))
    .onConflictDoNothing({ target: [tabela.usuarioId, tabela.grupoId, tabela.nome] });
}

// ---------- Objetivo (do usuário ou do grupo) e remapeamento de categorias ----------

const TAMANHO_MAX_OBJETIVO = 300;

export async function lerObjetivo(escopo: Escopo): Promise<string> {
  const [linha] =
    escopo.tipo === 'grupo'
      ? await db.select({ objetivo: grupos.objetivo }).from(grupos).where(eq(grupos.id, escopo.grupoId))
      : escopo.usuarioId === null
        ? []
        : await db.select({ objetivo: usuarios.objetivo }).from(usuarios).where(eq(usuarios.id, escopo.usuarioId));
  return linha?.objetivo ?? '';
}

export async function gravarObjetivo(escopo: Escopo, objetivo: unknown): Promise<string> {
  if (typeof objetivo !== 'string') throw new ErroValidacao('O objetivo deve ser um texto.');
  const limpo = objetivo.trim();
  if (limpo.length > TAMANHO_MAX_OBJETIVO) {
    throw new ErroValidacao(`O objetivo pode ter no máximo ${TAMANHO_MAX_OBJETIVO} caracteres.`);
  }
  if (escopo.tipo === 'grupo') {
    await db.update(grupos).set({ objetivo: limpo }).where(eq(grupos.id, escopo.grupoId));
  } else if (escopo.usuarioId !== null) {
    await db.update(usuarios).set({ objetivo: limpo }).where(eq(usuarios.id, escopo.usuarioId));
  }
  return limpo;
}

export type ItemCategorizado = { id: number; descricao: string; categoria: string };

/**
 * Itens já categorizados do escopo (os mais recentes primeiro), exceto os da categoria
 * informada: candidatos a serem movidos para ela.
 */
export async function listarItensCategorizados(escopo: Escopo, excetoCategoria: string, limite: number): Promise<ItemCategorizado[]> {
  return db
    .select({ id: itens.id, descricao: itens.descricao, categoria: categorias.nome })
    .from(itens)
    .innerJoin(transacoes, eq(itens.transacaoId, transacoes.id))
    .innerJoin(categorias, eq(itens.categoriaId, categorias.id))
    .where(and(doEscopo(transacoes, escopo), sql`${categorias.nome} <> ${excetoCategoria}`))
    .orderBy(desc(transacoes.dataEmissao), desc(itens.id))
    .limit(limite);
}

/** Move itens do escopo para uma categoria dele. Ids de fora do escopo são ignorados. */
export async function moverItensParaCategoria(escopo: Escopo, idsItens: unknown, nomeCategoria: unknown): Promise<number> {
  if (!Array.isArray(idsItens) || idsItens.some((id) => !Number.isInteger(id))) {
    throw new ErroValidacao('"itens" deve ser uma lista de ids.');
  }
  const nome = texto(nomeCategoria);
  const [categoria] = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(and(doEscopo(categorias, escopo), eq(categorias.nome, nome)));
  if (!categoria) throw new ErroValidacao(`Categoria "${nome}" não está cadastrada.`);
  if (idsItens.length === 0) return 0;

  const movidos = await db
    .update(itens)
    .set({ categoriaId: categoria.id })
    .where(
      and(
        inArray(itens.id, idsItens as number[]),
        inArray(itens.transacaoId, db.select({ id: transacoes.id }).from(transacoes).where(doEscopo(transacoes, escopo))),
      ),
    )
    .returning({ id: itens.id });
  return movidos.length;
}

// ---------- Transações ----------

/** Transações do escopo (as mais recentes primeiro). */
export async function listarTransacoes(escopo: Escopo): Promise<Transacao[]> {
  const cabecalhos = await db
    .select({ ...getTableColumns(transacoes), agente: agentes.nome, usuario: usuarios.nome })
    .from(transacoes)
    .leftJoin(agentes, eq(transacoes.agenteId, agentes.id))
    .leftJoin(usuarios, eq(transacoes.usuarioId, usuarios.id))
    .where(doEscopo(transacoes, escopo))
    .orderBy(desc(transacoes.id));

  const linhasItens = await db
    .select({ ...getTableColumns(itens), categoria: categorias.nome })
    .from(itens)
    .innerJoin(transacoes, eq(itens.transacaoId, transacoes.id))
    .leftJoin(categorias, eq(itens.categoriaId, categorias.id))
    .where(doEscopo(transacoes, escopo))
    .orderBy(asc(itens.transacaoId), asc(itens.ordem), asc(itens.id));

  const itensPorTransacao = new Map<number, Item[]>();
  for (const i of linhasItens) {
    const lista = itensPorTransacao.get(i.transacaoId) ?? [];
    lista.push({
      id: i.id,
      codigo: i.codigo ?? '',
      descricao: i.descricao,
      qtd: numericParaBr(i.qtd, 0),
      un: i.un,
      vlUnit: numericParaBr(i.vlUnit, 2),
      vlTotal: numericParaBr(i.vlTotal, 2),
      categoria: i.categoria ?? '',
    });
    itensPorTransacao.set(i.transacaoId, lista);
  }

  return cabecalhos.map((t) => ({
    id: t.id,
    chaveAcesso: t.chaveAcesso ?? '',
    valorTotal: numericParaBr(t.valorTotal, 2),
    desconto: numericParaBr(t.desconto, 2),
    estabelecimento: t.estabelecimento,
    dataEmissao: t.dataEmissao ?? '',
    horaEmissao: t.horaEmissao ? t.horaEmissao.slice(0, 5) : '',
    agenteOrigem: t.agente ?? '',
    usuario: t.usuario ?? '',
    items: itensPorTransacao.get(t.id) ?? [],
  }));
}

/**
 * Insere uma transação vinda da UI no escopo; o autor é `escopo.usuarioId` (null só no seed sem
 * usuário). Ids de itens enviados pelo cliente são ignorados.
 */
export async function criarTransacao(payload: unknown, escopo: Escopo): Promise<number> {
  const p = exigirObjeto(payload, 'transação');
  const itensEntrada = exigirItens(p.items);

  return db.transaction(async (tx) => {
    const cabecalho = await lerCabecalho(tx, p, escopo);
    const grupoId = escopo.tipo === 'grupo' ? escopo.grupoId : null;
    const [{ id }] = await tx
      .insert(transacoes)
      .values({ ...cabecalho, usuarioId: escopo.usuarioId, grupoId })
      .returning({ id: transacoes.id });
    const categoriaIds = await resolverCategorias(tx, itensEntrada, escopo);
    if (itensEntrada.length > 0) {
      await tx.insert(itens).values(itensEntrada.map((i, ordem) => lerItem(i, ordem, id, categoriaIds)));
    }
    return id;
  });
}

/**
 * Substitui cabeçalho e itens de uma transação existente. Itens cujo `id` já pertence à transação
 * são atualizados, os demais são inseridos e os que sumiram do payload são removidos.
 * Retorna false se a transação não existir ou não pertencer ao escopo.
 */
export async function atualizarTransacao(payload: unknown, escopo: Escopo): Promise<boolean> {
  const p = exigirObjeto(payload, 'transação');
  if (typeof p.id !== 'number') throw new ErroValidacao('Transação sem id.');
  const transacaoId = p.id;
  const itensEntrada = exigirItens(p.items);

  return db.transaction(async (tx) => {
    // Dono primeiro: transação de outro escopo é "não encontrada", sem validar o resto do payload.
    const [existente] = await tx
      .select({ id: transacoes.id })
      .from(transacoes)
      .where(and(eq(transacoes.id, transacaoId), doEscopo(transacoes, escopo)));
    if (!existente) return false;

    const cabecalho = await lerCabecalho(tx, p, escopo);
    await tx.update(transacoes).set(cabecalho).where(eq(transacoes.id, transacaoId));

    const existentes = new Set(
      (await tx.select({ id: itens.id }).from(itens).where(eq(itens.transacaoId, transacaoId))).map((l) => l.id),
    );
    const categoriaIds = await resolverCategorias(tx, itensEntrada, escopo);
    const mantidos = new Set<number>();

    for (const [ordem, entrada] of itensEntrada.entries()) {
      const valores = lerItem(entrada, ordem, transacaoId, categoriaIds);
      const idEntrada = entrada.id;
      if (typeof idEntrada === 'number' && existentes.has(idEntrada)) {
        await tx.update(itens).set(valores).where(eq(itens.id, idEntrada));
        mantidos.add(idEntrada);
      } else {
        await tx.insert(itens).values(valores);
      }
    }

    const remover = [...existentes].filter((id) => !mantidos.has(id));
    if (remover.length > 0) await tx.delete(itens).where(inArray(itens.id, remover));
    return true;
  });
}

export type ResumoAtribuicao = {
  categorias: { vinculadas: number; mescladas: number };
  agentes: { vinculados: number; mesclados: number };
  transacoes: number;
};

/**
 * Vincula ao usuário tudo o que não tem dono (dados anteriores à autenticação): categorias,
 * agentes e transações, numa única transação do banco. Se o usuário já tem uma categoria/agente
 * com o mesmo nome (ex.: as categorias padrão do cadastro), a linha sem dono é mesclada na dele:
 * itens/transações passam a apontar para a do usuário e a sem dono é apagada.
 */
export async function atribuirDadosSemDono(usuarioId: number): Promise<ResumoAtribuicao> {
  return db.transaction(async (tx) => {
    const cat = await atribuirListaSemDono(tx, categorias, usuarioId, async (de, para) => {
      await tx.update(itens).set({ categoriaId: para }).where(eq(itens.categoriaId, de));
    });
    const ag = await atribuirListaSemDono(tx, agentes, usuarioId, async (de, para) => {
      await tx.update(transacoes).set({ agenteId: para }).where(eq(transacoes.agenteId, de));
    });
    const trans = await tx
      .update(transacoes)
      .set({ usuarioId })
      .where(and(isNull(transacoes.usuarioId), isNull(transacoes.grupoId)))
      .returning({ id: transacoes.id });
    return {
      categorias: { vinculadas: cat.vinculados, mescladas: cat.mesclados },
      agentes: { vinculados: ag.vinculados, mesclados: ag.mesclados },
      transacoes: trans.length,
    };
  });
}

async function atribuirListaSemDono(
  tx: Tx,
  tabela: TabelaLista,
  usuarioId: number,
  redirecionar: (idSemDono: number, idDoUsuario: number) => Promise<void>,
): Promise<{ vinculados: number; mesclados: number }> {
  const doUsuario = new Map(
    (await tx.select({ id: tabela.id, nome: tabela.nome }).from(tabela).where(doEscopo(tabela, escopoPessoal(usuarioId))))
      .map((l) => [l.nome, l.id]),
  );
  const [{ maior }] = await tx
    .select({ maior: sql<number>`coalesce(max(${tabela.ordem}), -1)::int` })
    .from(tabela)
    .where(doEscopo(tabela, escopoPessoal(usuarioId)));
  const semDono = await tx
    .select({ id: tabela.id, nome: tabela.nome })
    .from(tabela)
    .where(doEscopo(tabela, escopoPessoal(null)))
    .orderBy(asc(tabela.ordem), asc(tabela.id));

  let vinculados = 0;
  let mesclados = 0;
  for (const linha of semDono) {
    const existente = doUsuario.get(linha.nome);
    if (existente !== undefined) {
      await redirecionar(linha.id, existente);
      await tx.delete(tabela).where(eq(tabela.id, linha.id));
      mesclados++;
    } else {
      // Vai para o fim da lista do usuário, mantendo a ordem relativa antiga.
      await tx.update(tabela).set({ usuarioId, ordem: maior + 1 + vinculados }).where(eq(tabela.id, linha.id));
      vinculados++;
    }
  }
  return { vinculados, mesclados };
}

// ---------- Usuários / Sessões ----------

export type Usuario = { id: number; nome: string; email: string };

export function normalizarEmail(valor: unknown): string {
  return texto(valor).toLowerCase();
}

/** Cria a conta com as categorias padrão. `senhaHash` já vem calculado (lib/auth.ts); aqui só se valida nome e e-mail. */
export async function criarUsuario(nome: unknown, email: unknown, senhaHash: string): Promise<Usuario> {
  const nomeLimpo = texto(nome);
  const emailLimpo = normalizarEmail(email);
  if (!nomeLimpo) throw new ErroValidacao('Informe o nome.');
  if (nomeLimpo.length > 100) throw new ErroValidacao('Nome muito longo.');
  if (emailLimpo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
    throw new ErroValidacao('E-mail inválido.');
  }

  // Usuário e categorias padrão juntos: não pode existir conta sem a lista inicial.
  return db.transaction(async (tx) => {
    const [criado] = await tx
      .insert(usuarios)
      .values({ nome: nomeLimpo, email: emailLimpo, senhaHash })
      .onConflictDoNothing({ target: usuarios.email })
      .returning({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email });
    if (!criado) throw new ErroValidacao('E-mail já cadastrado.');
    await tx.insert(categorias).values(CATEGORIAS_PADRAO.map((nome, ordem) => ({ usuarioId: criado.id, nome, ordem })));
    return criado;
  });
}

export async function buscarUsuarioPorEmail(email: unknown) {
  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.email, normalizarEmail(email)));
  return usuario ?? null;
}

export async function gravarSessao(tokenHash: string, usuarioId: number, expiraEm: Date): Promise<void> {
  await db.delete(sessoes).where(lte(sessoes.expiraEm, new Date()));
  await db.insert(sessoes).values({ tokenHash, usuarioId, expiraEm });
}

export async function apagarSessao(tokenHash: string): Promise<void> {
  await db.delete(sessoes).where(eq(sessoes.tokenHash, tokenHash));
}

/** Grupo escolhido como contexto na sessão (null = conta pessoal). */
export async function grupoAtivoDaSessao(tokenHash: string): Promise<number | null> {
  const [linha] = await db.select({ grupoAtivoId: sessoes.grupoAtivoId }).from(sessoes).where(eq(sessoes.tokenHash, tokenHash));
  return linha?.grupoAtivoId ?? null;
}

export async function definirGrupoAtivoDaSessao(tokenHash: string, grupoId: number | null): Promise<void> {
  await db.update(sessoes).set({ grupoAtivoId: grupoId }).where(eq(sessoes.tokenHash, tokenHash));
}

/** Usuário dono de uma sessão ainda válida, ou null. */
export async function usuarioDaSessao(tokenHash: string): Promise<Usuario | null> {
  const [linha] = await db
    .select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email })
    .from(sessoes)
    .innerJoin(usuarios, eq(sessoes.usuarioId, usuarios.id))
    .where(and(eq(sessoes.tokenHash, tokenHash), gt(sessoes.expiraEm, new Date())));
  return linha ?? null;
}

// ---------- Helpers de entrada ----------

type Objeto = Record<string, unknown>;

function exigirObjeto(valor: unknown, nome: string): Objeto {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new ErroValidacao(`Formato de ${nome} inválido.`);
  return valor as Objeto;
}

function exigirItens(valor: unknown): Objeto[] {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) throw new ErroValidacao('"items" deve ser uma lista.');
  return valor.map((i) => exigirObjeto(i, 'item'));
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : valor === undefined || valor === null ? '' : String(valor).trim();
}

async function lerCabecalho(tx: Tx, p: Objeto, escopo: Escopo) {
  const nomeAgente = texto(p.agenteOrigem);
  let agenteId: number | null = null;
  if (nomeAgente) {
    const [agente] = await tx
      .select({ id: agentes.id })
      .from(agentes)
      .where(and(doEscopo(agentes, escopo), eq(agentes.nome, nomeAgente)));
    if (!agente) throw new ErroValidacao(`Agente "${nomeAgente}" não está cadastrado.`);
    agenteId = agente.id;
  }

  return {
    chaveAcesso: texto(p.chaveAcesso) || null,
    estabelecimento: texto(p.estabelecimento),
    valorTotal: brParaNumeric(p.valorTotal, 'valorTotal') ?? '0',
    desconto: brParaNumeric(p.desconto, 'desconto') ?? '0',
    dataEmissao: validarData(p.dataEmissao),
    horaEmissao: validarHora(p.horaEmissao),
    agenteId,
  };
}

/** Mapeia nome → id das categorias do escopo usadas pelos itens; erro se alguma não estiver cadastrada. */
async function resolverCategorias(tx: Tx, itensEntrada: Objeto[], escopo: Escopo): Promise<Map<string, number>> {
  const nomes = [...new Set(itensEntrada.map((i) => texto(i.categoria)).filter(Boolean))];
  if (nomes.length === 0) return new Map();

  const linhas = await tx
    .select({ id: categorias.id, nome: categorias.nome })
    .from(categorias)
    .where(and(doEscopo(categorias, escopo), inArray(categorias.nome, nomes)));
  const mapa = new Map(linhas.map((l) => [l.nome, l.id]));
  const faltando = nomes.filter((n) => !mapa.has(n));
  if (faltando.length > 0) {
    throw new ErroValidacao(`Categoria(s) não cadastrada(s): ${faltando.join(', ')}`);
  }
  return mapa;
}

function lerItem(i: Objeto, ordem: number, transacaoId: number, categoriaIds: Map<string, number>) {
  const nomeCategoria = texto(i.categoria);
  return {
    transacaoId,
    ordem,
    codigo: texto(i.codigo) || null,
    descricao: texto(i.descricao),
    qtd: brParaNumeric(i.qtd, 'qtd') ?? '1',
    un: texto(i.un) || 'UN',
    vlUnit: brParaNumeric(i.vlUnit, 'vlUnit') ?? '0',
    vlTotal: brParaNumeric(i.vlTotal, 'vlTotal') ?? '0',
    categoriaId: nomeCategoria ? categoriaIds.get(nomeCategoria)! : null,
  };
}
