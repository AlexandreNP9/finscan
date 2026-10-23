import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    // Busca todas as categorias no banco de dados, ordenadas por nome
    const categorias = await prisma.categoria.findMany({
      orderBy: { nome: 'asc' }
    });

    return NextResponse.json({ sucesso: true, categorias });
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return NextResponse.json(
      { sucesso: false, erro: 'Erro ao buscar categorias no banco de dados.' },
      { status: 500 }
    );
  }
}