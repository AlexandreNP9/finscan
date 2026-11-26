import { randomInt } from 'node:crypto';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from './index';
import { categorias, grupos, membrosGrupo, usuarios } from './schema';
import { ErroSemPermissao, ErroValidacao } from './formato';
import { CATEGORIAS_PADRAO } from './categorias-padrao';

// Parte do repositório dedicada aos grupos (épico #95): criação, entrada por código, consulta.
// Como em repositorio.ts, as rotas não acessam o banco por fora destas funções.

export type Privilegios = {
  podeRegistrar: boolean;
  podeEditarTodas: boolean;
  podeGerenciarListas: boolean;
  podeConvidar: boolean;
};

const TODOS_PRIVILEGIOS: Privilegios = { podeRegistrar: true, podeEditarTodas: true, podeGerenciarListas: true, podeConvidar: true };

/** Privilégios de quem acaba de entrar: só registrar compras (o host libera o resto depois). */
const PRIVILEGIOS_INICIAIS: Privilegios = { podeRegistrar: true, podeEditarTodas: false, podeGerenciarListas: false, podeConvidar: false };

export type ResumoGrupo = {
  id: number;
  nome: string;
  host: string;
  souHost: boolean;
  membros: number;
  finalizado: boolean;
  /** O usuário saiu do grupo (mantém leitura do que foi registrado até a saída). */
  saiu: boolean;
  privilegios: Privilegios;
};

export type MembroGrupo = { usuarioId: number; nome: string; host: boolean; saiu: boolean; privilegios: Privilegios };

export type DetalheGrupo = ResumoGrupo & {
  /** Só para quem pode convidar, enquanto participa e o grupo está ativo; senão null. */
  codigoConvite: string | null;
  membrosLista: MembroGrupo[];
};

// Sem 0/O, 1/I/L: o código é lido e digitado por pessoas.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TAMANHO_CODIGO = 8;
const TAMANHO_MAX_NOME = 60;

function novoCodigo(): string {
  return Array.from({ length: TAMANHO_CODIGO }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
}

/** "k7m2-qx9p " → "K7M2QX9P" (o código é exibido com hífen para facilitar a leitura). */
export function normalizarCodigo(valor: unknown): string {
  return (typeof valor === 'string' ? valor : '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const privilegiosDe = (m: Privilegios): Privilegios => ({
  podeRegistrar: m.podeRegistrar,
  podeEditarTodas: m.podeEditarTodas,
  podeGerenciarListas: m.podeGerenciarListas,
  podeConvidar: m.podeConvidar,
});

/** Participação do usuário no grupo (ativa ou encerrada), com o grupo; null se nunca participou. */
export async function buscarParticipacao(usuarioId: number, grupoId: number) {
  const [linha] = await db
    .select({ grupo: grupos, membro: membrosGrupo })
    .from(membrosGrupo)
    .innerJoin(grupos, eq(membrosGrupo.grupoId, grupos.id))
    .where(and(eq(membrosGrupo.grupoId, grupoId), eq(membrosGrupo.usuarioId, usuarioId)));
  if (!linha) return null;
  return { ...linha, souHost: linha.grupo.hostId === usuarioId };
}

/** Grupos de que o usuário participa ou participou (ativos primeiro, depois por nome). */
export async function listarGruposDoUsuario(usuarioId: number): Promise<ResumoGrupo[]> {
  const linhas = await db
    .select({
      grupo: grupos,
      membro: membrosGrupo,
      host: usuarios.nome,
      membros: sql<number>`(select count(*)::int from ${membrosGrupo} m where m.grupo_id = ${grupos.id} and m.saiu_em is null)`,
    })
    .from(membrosGrupo)
    .innerJoin(grupos, eq(membrosGrupo.grupoId, grupos.id))
    .leftJoin(usuarios, eq(grupos.hostId, usuarios.id))
    .where(eq(membrosGrupo.usuarioId, usuarioId))
    .orderBy(asc(grupos.nome));

  return linhas
    .map((l) => ({
      id: l.grupo.id,
      nome: l.grupo.nome,
      host: l.host ?? '',
      souHost: l.grupo.hostId === usuarioId,
      membros: l.membros,
      finalizado: l.grupo.finalizadoEm !== null,
      saiu: l.membro.saiuEm !== null,
      privilegios: privilegiosDe(l.membro),
    }))
    .sort((a, b) => Number(a.finalizado || a.saiu) - Number(b.finalizado || b.saiu));
}

/** Detalhe para quem participa ou participou do grupo; null se nunca participou (→ 404). */
export async function detalharGrupo(usuarioId: number, grupoId: number): Promise<DetalheGrupo | null> {
  const resumo = (await listarGruposDoUsuario(usuarioId)).find((g) => g.id === grupoId);
  if (!resumo) return null;

  const [grupo] = await db.select().from(grupos).where(eq(grupos.id, grupoId));
  const membros = await db
    .select({ membro: membrosGrupo, nome: usuarios.nome })
    .from(membrosGrupo)
    .innerJoin(usuarios, eq(membrosGrupo.usuarioId, usuarios.id))
    .where(eq(membrosGrupo.grupoId, grupoId))
    .orderBy(asc(membrosGrupo.entrouEm));

  const podeVerCodigo = !resumo.finalizado && !resumo.saiu && (resumo.souHost || resumo.privilegios.podeConvidar);
  return {
    ...resumo,
    codigoConvite: podeVerCodigo ? grupo.codigoConvite : null,
    membrosLista: membros.map((m) => ({
      usuarioId: m.membro.usuarioId,
      nome: m.nome,
      host: m.membro.usuarioId === grupo.hostId,
      saiu: m.membro.saiuEm !== null,
      privilegios: privilegiosDe(m.membro),
    })),
  };
}

/** Cria o grupo com o usuário como host (todos os privilégios) e as categorias padrão. */
export async function criarGrupo(usuarioId: number, nome: unknown): Promise<{ id: number }> {
  const nomeLimpo = typeof nome === 'string' ? nome.trim() : '';
  if (!nomeLimpo) throw new ErroValidacao('Informe o nome do grupo.');
  if (nomeLimpo.length > TAMANHO_MAX_NOME) throw new ErroValidacao(`O nome pode ter no máximo ${TAMANHO_MAX_NOME} caracteres.`);

  return db.transaction(async (tx) => {
    // Colisão de código é improvável (31^8), mas o UNIQUE é quem garante; tenta de novo se bater.
    let id: number | undefined;
    for (let tentativa = 0; tentativa < 5 && id === undefined; tentativa++) {
      const [criado] = await tx
        .insert(grupos)
        .values({ nome: nomeLimpo, hostId: usuarioId, codigoConvite: novoCodigo() })
        .onConflictDoNothing({ target: grupos.codigoConvite })
        .returning({ id: grupos.id });
      id = criado?.id;
    }
    if (id === undefined) throw new Error('Não foi possível gerar um código de convite único.');

    await tx.insert(membrosGrupo).values({ grupoId: id, usuarioId, ...TODOS_PRIVILEGIOS });
    await tx.insert(categorias).values(CATEGORIAS_PADRAO.map((n, ordem) => ({ grupoId: id, nome: n, ordem })));
    return { id };
  });
}

/**
 * Entra no grupo do código. Quem já saiu pode voltar: a participação é reaberta com os
 * privilégios iniciais (o host decide de novo o que liberar).
 */
export async function entrarNoGrupo(usuarioId: number, codigo: unknown): Promise<{ id: number; nome: string }> {
  const limpo = normalizarCodigo(codigo);
  if (limpo.length !== TAMANHO_CODIGO) throw new ErroValidacao('Código inválido. Ele tem 8 letras e números.');

  const [grupo] = await db.select().from(grupos).where(eq(grupos.codigoConvite, limpo));
  if (!grupo) throw new ErroValidacao('Nenhum grupo com esse código. Confira com quem te convidou.');
  if (grupo.finalizadoEm) throw new ErroValidacao('Este grupo foi finalizado e não aceita novos membros.');

  const participacao = await buscarParticipacao(usuarioId, grupo.id);
  if (participacao && !participacao.membro.saiuEm) throw new ErroValidacao('Você já participa deste grupo.');

  if (participacao) {
    await db
      .update(membrosGrupo)
      .set({ ...PRIVILEGIOS_INICIAIS, saiuEm: null, entrouEm: new Date() })
      .where(eq(membrosGrupo.id, participacao.membro.id));
  } else {
    await db.insert(membrosGrupo).values({ grupoId: grupo.id, usuarioId, ...PRIVILEGIOS_INICIAIS });
  }
  return { id: grupo.id, nome: grupo.nome };
}

/** Novo código de convite (o anterior deixa de valer). Só o host, com o grupo ativo. */
export async function gerarNovoCodigo(usuarioId: number, grupoId: number): Promise<string | null> {
  const participacao = await buscarParticipacao(usuarioId, grupoId);
  if (!participacao || participacao.membro.saiuEm) return null;
  if (!participacao.souHost) throw new ErroValidacao('Só o host pode gerar um novo código.');
  if (participacao.grupo.finalizadoEm) throw new ErroValidacao('Este grupo foi finalizado.');

  for (let tentativa = 0; tentativa < 5; tentativa++) {
    const codigo = novoCodigo();
    const [ok] = await db
      .update(grupos)
      .set({ codigoConvite: codigo })
      .where(and(eq(grupos.id, grupoId), sql`not exists (select 1 from ${grupos} g where g.codigo_convite = ${codigo})`))
      .returning({ id: grupos.id });
    if (ok) return codigo;
  }
  throw new Error('Não foi possível gerar um código de convite único.');
}

// ---------- Gestão (#99): privilégios, remoção, transferência de host, saída ----------

/** Participação ativa do usuário como host de um grupo ativo; senão erro. null se nem participa. */
async function exigirHost(usuarioId: number, grupoId: number) {
  const p = await buscarParticipacao(usuarioId, grupoId);
  if (!p || p.membro.saiuEm) return null;
  if (p.grupo.finalizadoEm) throw new ErroSemPermissao('Este grupo foi finalizado.');
  if (!p.souHost) throw new ErroSemPermissao('Só o host pode fazer isso.');
  return p;
}

/** Membro ativo (não o host) do grupo, para o host alterar. */
async function membroAlteravel(grupoId: number, hostId: number, alvoId: unknown) {
  if (typeof alvoId !== 'number' || !Number.isInteger(alvoId)) throw new ErroValidacao('Membro inválido.');
  if (alvoId === hostId) throw new ErroValidacao('O host sempre tem todos os privilégios.');
  const [m] = await db
    .select()
    .from(membrosGrupo)
    .where(and(eq(membrosGrupo.grupoId, grupoId), eq(membrosGrupo.usuarioId, alvoId)));
  if (!m || m.saiuEm) throw new ErroValidacao('Essa pessoa não participa mais do grupo.');
  return m;
}

function lerPrivilegios(valor: unknown): Privilegios {
  if (!valor || typeof valor !== 'object') throw new ErroValidacao('Privilégios inválidos.');
  const v = valor as Record<string, unknown>;
  const chaves: (keyof Privilegios)[] = ['podeRegistrar', 'podeEditarTodas', 'podeGerenciarListas', 'podeConvidar'];
  if (chaves.some((c) => typeof v[c] !== 'boolean')) throw new ErroValidacao('Privilégios inválidos.');
  return { podeRegistrar: !!v.podeRegistrar, podeEditarTodas: !!v.podeEditarTodas, podeGerenciarListas: !!v.podeGerenciarListas, podeConvidar: !!v.podeConvidar };
}

/** O host define os privilégios de um membro. false = grupo não encontrado para o usuário. */
export async function definirPrivilegios(usuarioId: number, grupoId: number, alvoId: unknown, privilegios: unknown): Promise<boolean> {
  if (!(await exigirHost(usuarioId, grupoId))) return false;
  const membro = await membroAlteravel(grupoId, usuarioId, alvoId);
  await db.update(membrosGrupo).set(lerPrivilegios(privilegios)).where(eq(membrosGrupo.id, membro.id));
  return true;
}

/** O host remove um membro: ele passa a ex-membro (mantém leitura do que foi registrado até agora). */
export async function removerMembro(usuarioId: number, grupoId: number, alvoId: unknown): Promise<boolean> {
  if (!(await exigirHost(usuarioId, grupoId))) return false;
  const membro = await membroAlteravel(grupoId, usuarioId, alvoId);
  await db.update(membrosGrupo).set({ saiuEm: new Date() }).where(eq(membrosGrupo.id, membro.id));
  return true;
}

/**
 * Passa o papel de host a outro membro ativo, que recebe todos os privilégios. O host anterior
 * continua no grupo com todos os privilégios (o novo host ajusta se quiser) e pode sair sem finalizar.
 */
export async function transferirHost(usuarioId: number, grupoId: number, alvoId: unknown): Promise<boolean> {
  if (!(await exigirHost(usuarioId, grupoId))) return false;
  const membro = await membroAlteravel(grupoId, usuarioId, alvoId);
  await db.transaction(async (tx) => {
    await tx.update(grupos).set({ hostId: membro.usuarioId }).where(eq(grupos.id, grupoId));
    await tx.update(membrosGrupo).set(TODOS_PRIVILEGIOS).where(eq(membrosGrupo.id, membro.id));
  });
  return true;
}

/**
 * O usuário sai do grupo e passa a ex-membro (leitura do que foi registrado até a saída).
 * Se for o host, o grupo é finalizado e fica somente leitura para todos.
 * Retorna se o grupo foi finalizado, ou null se o usuário não participa (ativamente) do grupo.
 */
export async function sairDoGrupo(usuarioId: number, grupoId: number): Promise<{ finalizado: boolean } | null> {
  const p = await buscarParticipacao(usuarioId, grupoId);
  if (!p || p.membro.saiuEm) return null;
  const agora = new Date();
  const finalizar = p.souHost && !p.grupo.finalizadoEm;
  await db.transaction(async (tx) => {
    await tx.update(membrosGrupo).set({ saiuEm: agora }).where(eq(membrosGrupo.id, p.membro.id));
    if (finalizar) await tx.update(grupos).set({ finalizadoEm: agora }).where(eq(grupos.id, grupoId));
  });
  return { finalizado: finalizar };
}

/** Privilégios efetivos: o host tem todos, independentemente da linha dele. */
export function privilegiosEfetivos(participacao: NonNullable<Awaited<ReturnType<typeof buscarParticipacao>>>): Privilegios {
  return participacao.souHost ? TODOS_PRIVILEGIOS : privilegiosDe(participacao.membro);
}
