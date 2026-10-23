import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { headers } from 'next/headers'; // <-- 1. Adicione a importação

export async function GET() {
  await headers(); // <-- 2. Adicione esta linha
  try {
    let agentes = await prisma.agente.findMany({
      orderBy: { nome: 'asc' }
    });

    // Seed automático: se não houver agentes, cria opções padrão
    if (agentes.length === 0) {
      await prisma.agente.createMany({
        data: [{ nome: 'Dinheiro' }, { nome: 'Cartão de Débito' }, { nome: 'Nubank' }]
      });
      agentes = await prisma.agente.findMany({ orderBy: { nome: 'asc' } });
    }

    // O frontend atual espera um array de strings com os nomes
    const nomesAgentes = agentes.map(agente => agente.nome);
    
    return NextResponse.json({ sucesso: true, agentes: nomesAgentes });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: 'Erro ao buscar agentes no banco de dados.' }, { status: 500 });
  }
}