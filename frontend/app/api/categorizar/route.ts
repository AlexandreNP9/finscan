import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializa o SDK com a sua chave do .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  try {
    const { itens } = await request.json();

    if (!itens || itens.length === 0) {
      return NextResponse.json({ error: 'Nenhum item enviado' }, { status: 400 });
    }

    // O modelo Flash é o mais rápido e barato para tarefas de classificação
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

    // Engenharia de Prompt para forçar o Gemini a responder em JSON estrito
    const prompt = `
      Você é um assistente financeiro especialista em notas fiscais brasileiras.
      Vou te passar uma lista de produtos extraídos de um cupom fiscal. 
      Sua tarefa é higienizar o nome do produto (desfazer abreviações) e classificá-lo em UMA destas categorias exatas: 
      Bebidas, Alimentação, Higiene, Limpeza, Lazer, Transporte, Outros.

      Aqui estão os produtos:
      ${JSON.stringify(itens.map((i: any) => ({ id: i.id, descricao: i.descricao })))}

      Devolva APENAS um array JSON válido (sem formatação markdown) neste formato:
      [
        { "id": 123, "descricaoLimpa": "Nome bonito", "categoria": "Alimentação" }
      ]
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Limpa a resposta caso a IA mande as crases do Markdown (```json ... ```)
    const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const categoriasSugeridas = JSON.parse(jsonString);

    return NextResponse.json({ sucesso: true, resultado: categoriasSugeridas });

  } catch (error) {
    console.error('Erro na IA:', error);
    return NextResponse.json({ error: 'Falha ao classificar itens' }, { status: 500 });
  }
}