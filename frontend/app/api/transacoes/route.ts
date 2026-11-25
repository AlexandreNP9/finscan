import { NextResponse, connection } from 'next/server';
import { atualizarTransacao, criarTransacao, listarTransacoes } from '../../../lib/db/repositorio';
import { respostaDeErro } from '../../../lib/api';

export async function GET() {
  // Evita que o GET seja pré-renderizado no build (cacheComponents) e tente acessar o banco.
  await connection();
  try {
    const transacoes = await listarTransacoes();
    return NextResponse.json({ sucesso: true, transacoes });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao ler transações');
  }
}

export async function POST(request: Request) {
  try {
    const id = await criarTransacao(await request.json());
    return NextResponse.json({ sucesso: true, id });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao salvar transação');
  }
}

export async function PUT(request: Request) {
  try {
    const encontrada = await atualizarTransacao(await request.json());
    if (!encontrada) {
      return NextResponse.json({ sucesso: false, erro: 'Transação não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao atualizar');
  }
}
