import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { headers } from 'next/headers'; // <-- 1. Adicione a importação

export async function GET() {
  await headers(); // <-- 2. Adicione esta linha para bloquear o build-time
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