import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Aponta exatamente para o seu arquivo JSON na raiz do frontend
const dataFilePath = path.join(process.cwd(), 'data', 'categorias.json');

export async function GET() {
  try {
    const fileContents = fs.readFileSync(dataFilePath, 'utf8');
    const categorias = JSON.parse(fileContents);
    return NextResponse.json({ sucesso: true, categorias });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: 'Erro ao ler categorias' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { categorias } = await request.json();
    
    // Sobrescreve o JSON formatado com 2 espaços para ficar bonito no arquivo
    fs.writeFileSync(dataFilePath, JSON.stringify(categorias, null, 2), 'utf8');
    
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: 'Erro ao salvar categorias' }, { status: 500 });
  }
}