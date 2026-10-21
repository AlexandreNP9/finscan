import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'agentes.json');

export async function GET() {
  try {
    if (!fs.existsSync(dataFilePath)) {
      fs.writeFileSync(dataFilePath, JSON.stringify([]), 'utf8');
    }
    const fileContents = fs.readFileSync(dataFilePath, 'utf8');
    const agentes = JSON.parse(fileContents);
    return NextResponse.json({ sucesso: true, agentes });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: 'Erro ao ler agentes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { agentes } = await request.json();
    fs.writeFileSync(dataFilePath, JSON.stringify(agentes, null, 2), 'utf8');
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: 'Erro ao salvar agentes' }, { status: 500 });
  }
}