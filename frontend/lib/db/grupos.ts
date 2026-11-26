import { randomInt } from 'node:crypto';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from './index';
import { categorias, grupos, membrosGrupo, usuarios } from './schema';
import { ErroValidacao } from './formato';
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
