import { NextResponse } from 'next/server';
import { ErroValidacao } from './db/formato';
import { ErroNaoAutenticado, exigirUsuario } from './auth';

/** Não autenticado → 401; validação → 400 com a mensagem; qualquer outro → 500 genérico. */
export function respostaDeErro(error: unknown, mensagemPadrao: string) {
  if (error instanceof ErroNaoAutenticado) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: 401 });
  }
  if (error instanceof ErroValidacao) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: 400 });
  }
  console.error(mensagemPadrao, error);
  return NextResponse.json({ sucesso: false, erro: mensagemPadrao }, { status: 500 });
}

/**
 * Para handlers que não passam por `respostaDeErro`: devolve a resposta 401 se não houver
 * usuário logado, ou null para seguir.
 */
export async function bloquearSemLogin(): Promise<NextResponse | null> {
  try {
    await exigirUsuario();
    return null;
  } catch (error) {
    return respostaDeErro(error, 'Erro ao verificar sessão');
  }
}
