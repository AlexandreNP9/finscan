import { NextResponse } from 'next/server';
import { definirPrivilegios, removerMembro } from '../../../../../../lib/db/grupos';
import { respostaDeErro } from '../../../../../../lib/api';
import { exigirUsuario } from '../../../../../../lib/auth';

type Ctx = RouteContext<'/api/grupos/[id]/membros/[usuarioId]'>;

const naoEncontrado = () => NextResponse.json({ sucesso: false, erro: 'Grupo não encontrado' }, { status: 404 });

/** O host altera os privilégios de um membro: `{ privilegios: { podeRegistrar, ... } }`. */
export async function PUT(request: Request, ctx: Ctx) {
  try {
    const usuario = await exigirUsuario();
    const { id, usuarioId } = await ctx.params;
    const { privilegios } = await request.json();
    if (!(await definirPrivilegios(usuario.id, Number(id), Number(usuarioId), privilegios))) return naoEncontrado();
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao alterar privilégios');
  }
}

/** O host remove um membro (ele vira ex-membro, com leitura do que foi registrado até agora). */
export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    const usuario = await exigirUsuario();
    const { id, usuarioId } = await ctx.params;
    if (!(await removerMembro(usuario.id, Number(id), Number(usuarioId)))) return naoEncontrado();
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao remover membro');
  }
}
