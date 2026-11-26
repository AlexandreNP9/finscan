import 'server-only';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

/**
 * Modelo do Gemini em modo JSON, ou null sem GEMINI_API_KEY (o resto do app funciona sem IA).
 * Temperatura baixa: as tarefas são de classificação, não de criatividade.
 */
export function modeloGemini(): GenerativeModel | null {
  const chave = process.env.GEMINI_API_KEY?.trim();
  if (!chave) return null;
  return new GoogleGenerativeAI(chave).getGenerativeModel({
    model: 'gemini-3.1-flash-lite',
    generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
  });
}

export function respostaIaIndisponivel() {
  return NextResponse.json(
    { sucesso: false, erro: 'IA indisponível: defina GEMINI_API_KEY no .env e reinicie o app.' },
    { status: 503 },
  );
}

/** Gera e faz o parse do JSON da resposta (tolera a resposta vir entre crases de Markdown). */
export async function gerarJson(modelo: GenerativeModel, prompt: string): Promise<unknown> {
  const resultado = await modelo.generateContent(prompt);
  const texto = resultado.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(texto);
}

/** Bloco do prompt com o objetivo do usuário (vazio se ele não definiu). */
export function trechoObjetivo(objetivo: string): string {
  return objetivo
    ? `O usuário definiu este objetivo para organizar os gastos dele: "${objetivo}". Leve-o em conta.`
    : 'O usuário não definiu um objetivo específico.';
}
