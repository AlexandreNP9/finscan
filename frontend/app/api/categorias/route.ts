import { NextResponse, connection } from 'next/server';
import { categorias as tabelaCategorias } from '../../../lib/db/schema';
import { listarNomes, substituirLista } from '../../../lib/db/repositorio';
import { respostaDeErro } from '../../../lib/api';
import { exigirUsuario } from '../../../lib/auth';

export async function GET() {
  // Evita que o GET seja pré-renderizado no build (cacheComponents) e tente acessar o banco.
  await connection();
  try {
    await exigirUsuario();
    const categorias = await listarNomes(tabelaCategorias);
    return NextResponse.json({ sucesso: true, categorias });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao ler categorias');
  }
}

export async function POST(request: Request) {
  try {
    await exigirUsuario();
    const { categorias } = await request.json();
    await substituirLista(tabelaCategorias, categorias);
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao salvar categorias');
  }
}
