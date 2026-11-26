import { NextResponse, connection } from 'next/server';
import { gravarObjetivo, lerObjetivo } from '../../../../lib/db/repositorio';
import { respostaDeErro } from '../../../../lib/api';
import { exigirUsuario } from '../../../../lib/auth';

/** Objetivo do usuário com as categorias, usado no prompt da IA. */
export async function GET() {
  await connection();
  try {
    const usuario = await exigirUsuario();
    return NextResponse.json({ sucesso: true, objetivo: await lerObjetivo(usuario.id) });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao ler objetivo');
  }
}

export async function PUT(request: Request) {
  try {
    const usuario = await exigirUsuario();
    const { objetivo } = await request.json();
    return NextResponse.json({ sucesso: true, objetivo: await gravarObjetivo(usuario.id, objetivo) });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao salvar objetivo');
  }
}
