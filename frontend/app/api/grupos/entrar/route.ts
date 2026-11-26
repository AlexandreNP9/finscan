import { NextResponse } from 'next/server';
import { entrarNoGrupo } from '../../../../lib/db/grupos';
import { respostaDeErro } from '../../../../lib/api';
import { exigirUsuario } from '../../../../lib/auth';

/** Entra num grupo pelo código de convite. */
export async function POST(request: Request) {
  try {
    const usuario = await exigirUsuario();
    const { codigo } = await request.json();
    const grupo = await entrarNoGrupo(usuario.id, codigo);
    return NextResponse.json({ sucesso: true, grupo });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao entrar no grupo');
  }
}
