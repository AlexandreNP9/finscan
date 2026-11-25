import { NextResponse, connection } from 'next/server';
import { exigirUsuario } from '../../../../lib/auth';
import { respostaDeErro } from '../../../../lib/api';

export async function GET() {
  // Evita que o GET seja pré-renderizado no build (cacheComponents) e tente acessar o banco.
  await connection();
  try {
    const usuario = await exigirUsuario();
    return NextResponse.json({ sucesso: true, usuario });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao ler sessão');
  }
}
