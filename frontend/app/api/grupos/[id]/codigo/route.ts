import { NextResponse } from 'next/server';
import { gerarNovoCodigo } from '../../../../../lib/db/grupos';
import { respostaDeErro } from '../../../../../lib/api';
import { exigirUsuario } from '../../../../../lib/auth';

/** Gera um novo código de convite (só o host); o anterior deixa de valer. */
export async function POST(_request: Request, ctx: RouteContext<'/api/grupos/[id]/codigo'>) {
  try {
    const usuario = await exigirUsuario();
    const codigo = await gerarNovoCodigo(usuario.id, Number((await ctx.params).id));
    if (!codigo) return NextResponse.json({ sucesso: false, erro: 'Grupo não encontrado' }, { status: 404 });
    return NextResponse.json({ sucesso: true, codigo });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao gerar código');
  }
}
