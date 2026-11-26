import { NextResponse, connection } from 'next/server';
import { atualizarTransacao, criarTransacao, listarTransacoes } from '../../../lib/db/repositorio';
import { respostaDeErro } from '../../../lib/api';
import { exigirEscopo } from '../../../lib/auth';

export async function GET() {
  // Evita que o GET seja pré-renderizado no build (cacheComponents) e tente acessar o banco.
  await connection();
  try {
    const { escopo } = await exigirEscopo();
    const transacoes = await listarTransacoes(escopo);
    return NextResponse.json({ sucesso: true, transacoes });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao ler transações');
  }
}

export async function POST(request: Request) {
  try {
    const { escopo } = await exigirEscopo();
    const id = await criarTransacao(await request.json(), escopo);
    return NextResponse.json({ sucesso: true, id });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao salvar transação');
  }
}

export async function PUT(request: Request) {
  try {
    const { escopo } = await exigirEscopo();
    const encontrada = await atualizarTransacao(await request.json(), escopo);
    if (!encontrada) {
      return NextResponse.json({ sucesso: false, erro: 'Transação não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao atualizar');
  }
}
