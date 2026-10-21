import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import categoriasCadastradas from '../../../data/categorias.json';

// Inicializa o SDK com a sua chave do .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { itens } = await request.json();

        if (!itens || itens.length === 0) {
            return NextResponse.json({ error: 'Nenhum item enviado' }, { status: 400 });
        }

        // Inicialização otimizada para velocidade e precisão
        const model = genAI.getGenerativeModel({
            model: 'gemini-3.1-flash-lite',
            generationConfig: {
                temperature: 0.1, // Quase zero criatividade, foco total em classificação lógica rápida
                responseMimeType: "application/json", // Força a engine a cuspir JSON nativo sem pensar
            }
        });

        // Engenharia de Prompt para forçar o Gemini a responder em JSON estrito
        const prompt = `
      Você é um assistente financeiro especialista em categorização de microgastos.
      Vou te passar uma lista de produtos que compõem um gasto/transação financeira.
      Sua tarefa é higienizar o nome do produto (desfazer abreviações, caso haja), analisar o nome do produto e classificá-lo OBRIGATORIAMENTE em UMA destas categorias: ${categoriasCadastradas.join(', ')}.

      Aqui estão os produtos:
      ${JSON.stringify(itens)}

      Devolva APENAS um array JSON válido (sem formatação markdown) neste formato:
      [
        { "id": 123, "descricaoLimpa": "Nome bonito", "categoria": "Alimentação" }
      ]
    `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Limpa a resposta caso a IA mande as crases do Markdown (```json ... ```)
        const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const categoriasSugeridas = JSON.parse(result.response.text());

        return NextResponse.json({ sucesso: true, resultado: categoriasSugeridas });

    } catch (error) {
        console.error('Erro na IA:', error);
        return NextResponse.json({ error: 'Falha ao classificar itens' }, { status: 500 });
    }
}