import { NextResponse, connection } from 'next/server';
import { detalharGrupo } from '../../../../lib/db/grupos';
import { respostaDeErro } from '../../../../lib/api';
import { exigirUsuario } from '../../../../lib/auth';

/** Detalhe do grupo (membros e, para quem pode convidar, o código). 404 para quem nunca participou. */
export async function GET(_request: Request, ctx: RouteContext<'/api/grupos/[id]'>) {
  await connection();
  try {
    const usuario = await exigirUsuario();
    const grupo = await detalharGrupo(usuario.id, Number((await ctx.params).id));
    if (!grupo) return NextResponse.json({ sucesso: false, erro: 'Grupo não encontrado' }, { status: 404 });
    return NextResponse.json({ sucesso: true, grupo });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao ler grupo');
  }
}
