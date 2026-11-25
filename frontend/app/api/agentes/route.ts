import { NextResponse, connection } from 'next/server';
import { agentes as tabelaAgentes } from '../../../lib/db/schema';
import { listarNomes, substituirLista } from '../../../lib/db/repositorio';
import { respostaDeErro } from '../../../lib/api';
import { exigirUsuario } from '../../../lib/auth';

export async function GET() {
  // Evita que o GET seja pré-renderizado no build (cacheComponents) e tente acessar o banco.
  await connection();
  try {
    const usuario = await exigirUsuario();
    const agentes = await listarNomes(tabelaAgentes, usuario.id);
    return NextResponse.json({ sucesso: true, agentes });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao ler agentes');
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await exigirUsuario();
    const { agentes } = await request.json();
    await substituirLista(tabelaAgentes, agentes, usuario.id);
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao salvar agentes');
  }
}
