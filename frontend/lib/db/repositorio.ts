import { asc, desc, eq, getTableColumns, inArray, notInArray, sql } from 'drizzle-orm';
import { db, type Db } from './index';
import { agentes, categorias, itens, transacoes } from './schema';
import { brParaNumeric, ErroValidacao, numericParaBr, validarData, validarHora } from './formato';
import type { Item, Transacao } from '../../types';

// Camada de acesso a dados. A API continua expondo o mesmo formato da época dos arquivos JSON
// (valores em string no padrão brasileiro, `categoria: ''` para item pendente, nomes em vez de ids),
// então as páginas não precisam saber que existe um banco relacional por trás.

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
type TabelaLista = typeof categorias | typeof agentes;

// ---------- Categorias / Agentes (listas de nomes) ----------

export async function listarNomes(tabela: TabelaLista): Promise<string[]> {
  const linhas = await db
    .select({ nome: tabela.nome })
    .from(tabela)
    .orderBy(asc(tabela.ordem), asc(tabela.id));
  return linhas.map((l) => l.nome);
}

/** Substitui a lista inteira (semântica do POST das telas de gerenciamento). */
export async function substituirLista(tabela: TabelaLista, nomes: unknown): Promise<void> {
  if (!Array.isArray(nomes) || nomes.some((n) => typeof n !== 'string')) {
    throw new ErroValidacao('A lista deve ser um array de textos.');
  }
  const limpos = [...new Set((nomes as string[]).map((n) => n.trim()).filter(Boolean))];

  await db.transaction(async (tx) => {
    if (limpos.length > 0) {
      await tx.delete(tabela).where(notInArray(tabela.nome, limpos));
      await tx
        .insert(tabela)
        .values(limpos.map((nome, ordem) => ({ nome, ordem })))
        .onConflictDoUpdate({ target: tabela.nome, set: { ordem: sql`excluded.ordem` } });
    } else {
      await tx.delete(tabela);
    }
  });
}

// ---------- Transações ----------

export async function listarTransacoes(): Promise<Transacao[]> {
  const cabecalhos = await db
    .select({ ...getTableColumns(transacoes), agente: agentes.nome })
    .from(transacoes)
    .leftJoin(agentes, eq(transacoes.agenteId, agentes.id))
    .orderBy(desc(transacoes.id));

  const linhasItens = await db
    .select({ ...getTableColumns(itens), categoria: categorias.nome })
    .from(itens)
    .leftJoin(categorias, eq(itens.categoriaId, categorias.id))
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
    items: itensPorTransacao.get(t.id) ?? [],
  }));
}

/** Insere uma transação vinda da UI. Ids de itens enviados pelo cliente são ignorados. */
export async function criarTransacao(payload: unknown): Promise<number> {
  const p = exigirObjeto(payload, 'transação');
  const itensEntrada = exigirItens(p.items);

  return db.transaction(async (tx) => {
    const cabecalho = await lerCabecalho(tx, p);
    const [{ id }] = await tx.insert(transacoes).values(cabecalho).returning({ id: transacoes.id });
    const categoriaIds = await resolverCategorias(tx, itensEntrada);
    if (itensEntrada.length > 0) {
      await tx.insert(itens).values(itensEntrada.map((i, ordem) => lerItem(i, ordem, id, categoriaIds)));
    }
    return id;
  });
}

/**
 * Substitui cabeçalho e itens de uma transação existente. Itens cujo `id` já pertence à transação
 * são atualizados, os demais são inseridos e os que sumiram do payload são removidos.
 * Retorna false se a transação não existir.
 */
export async function atualizarTransacao(payload: unknown): Promise<boolean> {
  const p = exigirObjeto(payload, 'transação');
  if (typeof p.id !== 'number') throw new ErroValidacao('Transação sem id.');
  const transacaoId = p.id;
  const itensEntrada = exigirItens(p.items);

  return db.transaction(async (tx) => {
    const cabecalho = await lerCabecalho(tx, p);
    const atualizadas = await tx
      .update(transacoes)
      .set(cabecalho)
      .where(eq(transacoes.id, transacaoId))
      .returning({ id: transacoes.id });
    if (atualizadas.length === 0) return false;

    const existentes = new Set(
      (await tx.select({ id: itens.id }).from(itens).where(eq(itens.transacaoId, transacaoId))).map((l) => l.id),
    );
    const categoriaIds = await resolverCategorias(tx, itensEntrada);
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

async function lerCabecalho(tx: Tx, p: Objeto) {
  const nomeAgente = texto(p.agenteOrigem);
  let agenteId: number | null = null;
  if (nomeAgente) {
    const [agente] = await tx.select({ id: agentes.id }).from(agentes).where(eq(agentes.nome, nomeAgente));
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

/** Mapeia nome → id das categorias usadas pelos itens; erro se alguma não estiver cadastrada. */
async function resolverCategorias(tx: Tx, itensEntrada: Objeto[]): Promise<Map<string, number>> {
  const nomes = [...new Set(itensEntrada.map((i) => texto(i.categoria)).filter(Boolean))];
  if (nomes.length === 0) return new Map();

  const linhas = await tx
    .select({ id: categorias.id, nome: categorias.nome })
    .from(categorias)
    .where(inArray(categorias.nome, nomes));
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
