import { NextResponse } from 'next/server';
import { criarUsuario } from '../../../../lib/db/repositorio';
import { criarSessao, hashSenha } from '../../../../lib/auth';
import { respostaDeErro } from '../../../../lib/api';

export async function POST(request: Request) {
  try {
    const { nome, email, senha } = await request.json();
    const usuario = await criarUsuario(nome, email, await hashSenha(senha));
    await criarSessao(usuario.id);
    return NextResponse.json({ sucesso: true, usuario });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao criar conta');
  }
}
