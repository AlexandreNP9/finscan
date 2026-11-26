import { NextResponse, connection } from 'next/server';
import { categorias as tabelaCategorias } from '../../../lib/db/schema';
import { listarNomes, substituirLista } from '../../../lib/db/repositorio';
import { respostaDeErro } from '../../../lib/api';
import { exigirEscopo } from '../../../lib/auth';

export async function GET() {
  // Evita que o GET seja pré-renderizado no build (cacheComponents) e tente acessar o banco.
  await connection();
  try {
    const { escopo } = await exigirEscopo();
    const categorias = await listarNomes(tabelaCategorias, escopo);
    return NextResponse.json({ sucesso: true, categorias });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao ler categorias');
  }
}

export async function POST(request: Request) {
  try {
    const { escopo } = await exigirEscopo();
    const { categorias } = await request.json();
    await substituirLista(tabelaCategorias, categorias, escopo);
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao salvar categorias');
  }
}
