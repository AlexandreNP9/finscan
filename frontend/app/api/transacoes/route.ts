import { NextResponse, connection } from 'next/server';
import { atualizarTransacao, criarTransacao, listarTransacoes } from '../../../lib/db/repositorio';
import { respostaDeErro } from '../../../lib/api';
import { exigirUsuario } from '../../../lib/auth';

export async function GET() {
  // Evita que o GET seja pré-renderizado no build (cacheComponents) e tente acessar o banco.
  await connection();
  try {
    const usuario = await exigirUsuario();
    const transacoes = await listarTransacoes(usuario.id);
    return NextResponse.json({ sucesso: true, transacoes });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao ler transações');
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await exigirUsuario();
    const id = await criarTransacao(await request.json(), usuario.id);
    return NextResponse.json({ sucesso: true, id });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao salvar transação');
  }
}

export async function PUT(request: Request) {
  try {
    const usuario = await exigirUsuario();
    const encontrada = await atualizarTransacao(await request.json(), usuario.id);
    if (!encontrada) {
      return NextResponse.json({ sucesso: false, erro: 'Transação não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao atualizar');
  }
}
