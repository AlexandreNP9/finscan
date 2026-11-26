import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import {
  apagarSessao,
  buscarUsuarioPorEmail,
  definirGrupoAtivoDaSessao,
  escopoPessoal,
  gravarSessao,
  grupoAtivoDaSessao,
  usuarioDaSessao,
  type Escopo,
  type Usuario,
} from './db/repositorio';
import { ErroValidacao } from './db/formato';
import { buscarParticipacao, listarGruposDoUsuario } from './db/grupos';

// Sessões ficam no banco: o cookie (HTTP-only) carrega um token aleatório e a tabela `sessoes`
// guarda só o SHA-256 dele. Assim o logout revoga a sessão e não é preciso nenhum segredo no .env.
// A checagem otimista (cookie presente) é feita em proxy.ts; a validação real é `exigirUsuario()`.

export const COOKIE_SESSAO = 'finscan_sessao';
const DURACAO_SESSAO_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias
const CUSTO_BCRYPT = 12;
const TAMANHO_MINIMO_SENHA = 8;
// bcrypt só considera os primeiros 72 bytes; limitar evita senhas "diferentes" equivalentes.
const TAMANHO_MAXIMO_SENHA = 72;

// Hash usado quando o e-mail não existe, para o login levar o mesmo tempo nos dois casos.
// Calculado na primeira tentativa de login, não na importação do módulo.
let hashFicticio: Promise<string> | undefined;
const obterHashFicticio = () => (hashFicticio ??= bcrypt.hash('senha-que-ninguem-usa', CUSTO_BCRYPT));

export class ErroNaoAutenticado extends Error {
  constructor(mensagem = 'Não autenticado') {
    super(mensagem);
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashSenha(senha: unknown): Promise<string> {
  if (typeof senha !== 'string' || senha.length < TAMANHO_MINIMO_SENHA) {
    throw new ErroValidacao(`A senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
  }
  if (Buffer.byteLength(senha, 'utf8') > TAMANHO_MAXIMO_SENHA) {
    throw new ErroValidacao(`A senha deve ter no máximo ${TAMANHO_MAXIMO_SENHA} caracteres.`);
  }
  return bcrypt.hash(senha, CUSTO_BCRYPT);
}

/** Confere e-mail e senha; lança ErroNaoAutenticado com mensagem genérica se não baterem. */
export async function autenticar(email: unknown, senha: unknown): Promise<Usuario> {
  const usuario = await buscarUsuarioPorEmail(email);
  const senhaTexto = typeof senha === 'string' ? senha : '';
  const confere = await bcrypt.compare(senhaTexto, usuario?.senhaHash ?? (await obterHashFicticio()));
  if (!usuario || !confere) throw new ErroNaoAutenticado('E-mail ou senha inválidos.');
  return { id: usuario.id, nome: usuario.nome, email: usuario.email };
}

/** Cookie `secure` só quando a requisição chegou por HTTPS (túneis); em http://localhost não. */
async function requisicaoHttps(): Promise<boolean> {
  const h = await headers();
  const proto = h.get('x-forwarded-proto')?.split(',')[0].trim();
  return proto === 'https';
}

export async function criarSessao(usuarioId: number): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiraEm = new Date(Date.now() + DURACAO_SESSAO_MS);
  await gravarSessao(hashToken(token), usuarioId, expiraEm);

  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: await requisicaoHttps(),
    path: '/',
    expires: expiraEm,
  });
}

export async function encerrarSessao(): Promise<void> {
  const loja = await cookies();
  const token = loja.get(COOKIE_SESSAO)?.value;
  if (token) await apagarSessao(hashToken(token));
  loja.delete(COOKIE_SESSAO);
}

/** Usuário logado na requisição atual, ou null. */
export async function usuarioAtual(): Promise<Usuario | null> {
  const loja = await cookies();
  const token = loja.get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  const usuario = await usuarioDaSessao(hashToken(token));
  // Cookie de sessão expirada/inexistente: apaga, senão o proxy (que só vê o cookie) mandaria
  // /login de volta para / e o usuário ficaria em loop.
  if (!usuario) loja.delete(COOKIE_SESSAO);
  return usuario;
}

/** Usuário logado; lança ErroNaoAutenticado (→ 401 em respostaDeErro) se não houver. */
export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await usuarioAtual();
  if (!usuario) throw new ErroNaoAutenticado();
  return usuario;
}

async function tokenHashAtual(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE_SESSAO)?.value;
  return token ? hashToken(token) : null;
}

/** Grupo em que o usuário pode operar agora: membro ativo de um grupo não finalizado. */
async function grupoUtilizavel(usuarioId: number, grupoId: number) {
  const participacao = await buscarParticipacao(usuarioId, grupoId);
  if (!participacao || participacao.membro.saiuEm || participacao.grupo.finalizadoEm) return null;
  return participacao;
}

export type Contexto = { tipo: 'pessoal' } | { tipo: 'grupo'; grupoId: number; nome: string };

/**
 * Escopo dos dados da requisição: a conta pessoal do usuário logado ou o grupo escolhido na
 * sessão. Todas as rotas de dados (transações, categorias, fontes, IA) passam por aqui.
 * Se o grupo guardado na sessão deixou de valer (saiu, foi finalizado), volta para o pessoal.
 */
export async function exigirEscopo(): Promise<{ usuario: Usuario; escopo: Escopo; contexto: Contexto }> {
  const usuario = await exigirUsuario();
  const tokenHash = await tokenHashAtual();
  const grupoId = tokenHash ? await grupoAtivoDaSessao(tokenHash) : null;
  if (grupoId !== null) {
    const participacao = await grupoUtilizavel(usuario.id, grupoId);
    if (participacao) {
      return {
        usuario,
        escopo: { tipo: 'grupo', usuarioId: usuario.id, grupoId },
        contexto: { tipo: 'grupo', grupoId, nome: participacao.grupo.nome },
      };
    }
    if (tokenHash) await definirGrupoAtivoDaSessao(tokenHash, null);
  }
  return { usuario, escopo: escopoPessoal(usuario.id), contexto: { tipo: 'pessoal' } };
}

/** Contexto atual e os grupos para onde o usuário pode alternar (só os ativos). */
export async function contextoEOpcoes() {
  const { usuario, contexto } = await exigirEscopo();
  const grupos = (await listarGruposDoUsuario(usuario.id))
    .filter((g) => !g.saiu && !g.finalizado)
    .map((g) => ({ grupoId: g.id, nome: g.nome }));
  return { contexto, grupos };
}

/** Troca o contexto da sessão (null = conta pessoal). Grupo inválido → ErroValidacao. */
export async function definirContexto(grupoId: unknown): Promise<void> {
  const usuario = await exigirUsuario();
  const tokenHash = await tokenHashAtual();
  if (!tokenHash) throw new ErroNaoAutenticado();
  if (grupoId === null) return definirGrupoAtivoDaSessao(tokenHash, null);
  if (typeof grupoId !== 'number' || !Number.isInteger(grupoId)) throw new ErroValidacao('Grupo inválido.');
  if (!(await grupoUtilizavel(usuario.id, grupoId))) throw new ErroValidacao('Você não participa deste grupo.');
  await definirGrupoAtivoDaSessao(tokenHash, grupoId);
}
