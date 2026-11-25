import { NextResponse } from 'next/server';
import { encerrarSessao } from '../../../../lib/auth';
import { respostaDeErro } from '../../../../lib/api';

export async function POST() {
  try {
    await encerrarSessao();
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao sair');
  }
}
