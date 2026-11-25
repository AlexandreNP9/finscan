import { NextResponse } from 'next/server';
import { autenticar, criarSessao } from '../../../../lib/auth';
import { respostaDeErro } from '../../../../lib/api';

export async function POST(request: Request) {
  try {
    const { email, senha } = await request.json();
    const usuario = await autenticar(email, senha);
    await criarSessao(usuario.id);
    return NextResponse.json({ sucesso: true, usuario });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao entrar');
  }
}
