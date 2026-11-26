import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies, headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import {
  apagarSessao,
  buscarUsuarioPorEmail,
  gravarSessao,
  escopoPessoal,
  usuarioDaSessao,
  type Escopo,
  type Usuario,
} from './db/repositorio';
import { ErroValidacao } from './db/formato';

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

/**
 * Escopo dos dados da requisição: a conta pessoal do usuário logado ou o grupo que ele escolheu.
 * Todas as rotas de dados (transações, categorias, fontes, IA) passam por aqui.
 * Por enquanto é sempre a conta pessoal; a escolha do grupo ativo vem com o alternador de contexto.
 */
export async function exigirEscopo(): Promise<{ usuario: Usuario; escopo: Escopo }> {
  const usuario = await exigirUsuario();
  return { usuario, escopo: escopoPessoal(usuario.id) };
}
