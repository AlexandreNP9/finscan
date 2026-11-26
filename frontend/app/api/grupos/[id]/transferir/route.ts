import { NextResponse } from 'next/server';
import { transferirHost } from '../../../../../lib/db/grupos';
import { respostaDeErro } from '../../../../../lib/api';
import { exigirUsuario } from '../../../../../lib/auth';

/** O host passa o papel para outro membro ativo: `{ usuarioId }`. */
export async function POST(request: Request, ctx: RouteContext<'/api/grupos/[id]/transferir'>) {
  try {
    const usuario = await exigirUsuario();
    const { usuarioId } = await request.json();
    if (!(await transferirHost(usuario.id, Number((await ctx.params).id), usuarioId))) {
      return NextResponse.json({ sucesso: false, erro: 'Grupo não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao transferir o papel de host');
  }
}
