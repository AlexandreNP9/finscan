import { NextResponse } from 'next/server';
import { moverItensParaCategoria } from '../../../../lib/db/repositorio';
import { respostaDeErro } from '../../../../lib/api';
import { exigirEscopo } from '../../../../lib/auth';

/** Move itens já categorizados para outra categoria (depois que o usuário revisou a proposta da IA). */
export async function POST(request: Request) {
  try {
    const { escopo } = await exigirEscopo();
    const { categoria, itens } = await request.json();
    const movidos = await moverItensParaCategoria(escopo, itens, categoria);
    return NextResponse.json({ sucesso: true, movidos });
  } catch (error) {
    return respostaDeErro(error, 'Erro ao mover itens');
  }
}
