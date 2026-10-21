import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'transacoes.json');

export async function GET() {
  try {
    if (!fs.existsSync(dataFilePath)) fs.writeFileSync(dataFilePath, JSON.stringify([]), 'utf8');
    const fileContents = fs.readFileSync(dataFilePath, 'utf8');
    return NextResponse.json({ sucesso: true, transacoes: JSON.parse(fileContents) });
  } catch (error) {
    return NextResponse.json({ sucesso: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const novaTransacao = await request.json();
    
    if (!fs.existsSync(dataFilePath)) fs.writeFileSync(dataFilePath, JSON.stringify([]), 'utf8');
    const fileContents = fs.readFileSync(dataFilePath, 'utf8');
    const transacoes = JSON.parse(fileContents);
    
    // Adiciona um ID único (timestamp) e coloca no início da lista
    const transacaoComId = { id: Date.now(), ...novaTransacao };
    transacoes.unshift(transacaoComId);
    
    fs.writeFileSync(dataFilePath, JSON.stringify(transacoes, null, 2), 'utf8');
    return NextResponse.json({ sucesso: true, id: transacaoComId.id });
  } catch (error) {
    return NextResponse.json({ sucesso: false }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const transacaoAtualizada = await request.json();
    const fileContents = fs.readFileSync(dataFilePath, 'utf8');
    let transacoes = JSON.parse(fileContents);

    // Encontra a transação pelo ID e substitui pelos dados novos
    transacoes = transacoes.map((t: any) => 
      t.id === transacaoAtualizada.id ? transacaoAtualizada : t
    );

    fs.writeFileSync(dataFilePath, JSON.stringify(transacoes, null, 2), 'utf8');
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: 'Erro ao atualizar' }, { status: 500 });
  }
}