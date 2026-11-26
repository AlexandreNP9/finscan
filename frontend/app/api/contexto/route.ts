import { NextResponse, connection } from 'next/server';
import { respostaDeErro } from '../../../lib/api';
import { contextoEOpcoes, definirContexto } from '../../../lib/auth';

/** Contexto atual (conta pessoal ou grupo) e os grupos disponíveis para alternar. */
export async function GET() {
  await connection();
  try {
    return NextResponse.json({ sucesso: true, ...(await contextoEOpcoes()) });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao ler o contexto');
  }
}

/** Alterna o contexto: `{ grupoId: number }` para um grupo, `{ grupoId: null }` para a conta pessoal. */
export async function PUT(request: Request) {
  try {
    const { grupoId } = await request.json();
    await definirContexto(grupoId ?? null);
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao alternar o contexto');
  }
}
