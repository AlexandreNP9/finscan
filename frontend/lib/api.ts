import { NextResponse } from 'next/server';
import { ErroValidacao } from './db/formato';

/** Erro de validação → 400 com a mensagem; qualquer outro → 500 com mensagem genérica. */
export function respostaDeErro(error: unknown, mensagemPadrao: string) {
  if (error instanceof ErroValidacao) {
    return NextResponse.json({ sucesso: false, erro: error.message }, { status: 400 });
  }
  console.error(mensagemPadrao, error);
  return NextResponse.json({ sucesso: false, erro: mensagemPadrao }, { status: 500 });
}
