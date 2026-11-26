import { NextResponse } from 'next/server';
import { sairDoGrupo } from '../../../../../lib/db/grupos';
import { respostaDeErro } from '../../../../../lib/api';
import { exigirUsuario } from '../../../../../lib/auth';

/** Sai do grupo. Se quem sai é o host, o grupo é finalizado (`finalizado: true` na resposta). */
export async function POST(_request: Request, ctx: RouteContext<'/api/grupos/[id]/sair'>) {
  try {
    const usuario = await exigirUsuario();
    const resultado = await sairDoGrupo(usuario.id, Number((await ctx.params).id));
    if (!resultado) return NextResponse.json({ sucesso: false, erro: 'Você não participa deste grupo.' }, { status: 404 });
    return NextResponse.json({ sucesso: true, ...resultado });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao sair do grupo');
  }
}
