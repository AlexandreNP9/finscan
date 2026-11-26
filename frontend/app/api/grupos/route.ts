import { NextResponse, connection } from 'next/server';
import { criarGrupo, listarGruposDoUsuario } from '../../../lib/db/grupos';
import { respostaDeErro } from '../../../lib/api';
import { exigirUsuario } from '../../../lib/auth';

/** Grupos de que o usuário participa ou participou. */
export async function GET() {
  await connection();
  try {
    const usuario = await exigirUsuario();
    return NextResponse.json({ sucesso: true, grupos: await listarGruposDoUsuario(usuario.id) });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao listar grupos');
  }
}

/** Cria um grupo; quem cria é o host. */
export async function POST(request: Request) {
  try {
    const usuario = await exigirUsuario();
    const { nome } = await request.json();
    const { id } = await criarGrupo(usuario.id, nome);
    return NextResponse.json({ sucesso: true, id });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao criar grupo');
  }
}
