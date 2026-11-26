import { NextResponse } from 'next/server';
import { categorias } from '../../../../lib/db/schema';
import { acrescentarNomes, lerObjetivo, listarItensCategorizados } from '../../../../lib/db/repositorio';
import { ErroValidacao } from '../../../../lib/db/formato';
import { respostaDeErro } from '../../../../lib/api';
import { exigirUsuario } from '../../../../lib/auth';
import { gerarJson, modeloGemini, trechoObjetivo } from '../../../../lib/ia';
import type { CandidatoRemapeamento } from '../../../../types';

// Quantos itens já categorizados (os mais recentes) a IA avalia para mover à categoria nova.
const LIMITE_ITENS = 300;

/**
 * Cria uma categoria (ao fim da lista; nada acontece se já existir) e pergunta à IA quais itens
 * já categorizados se encaixam melhor nela. Nada é movido aqui: o usuário revisa os candidatos
 * e confirma em /api/categorias/mover. Se a IA falhar, a categoria continua criada.
 */
export async function POST(request: Request) {
  let usuarioId: number;
  let nome: string;
  try {
    usuarioId = (await exigirUsuario()).id;
    const corpo = await request.json();
    nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : '';
    if (!nome) throw new ErroValidacao('Informe o nome da categoria.');
    await acrescentarNomes(categorias, [nome], usuarioId);
  } catch (error) {
    return respostaDeErro(error, 'Erro ao criar categoria');
  }

  const modelo = modeloGemini();
  if (!modelo) return NextResponse.json({ sucesso: true, candidatos: [] });

  try {
    const [itens, objetivo] = await Promise.all([
      listarItensCategorizados(usuarioId, nome, LIMITE_ITENS),
      lerObjetivo(usuarioId),
    ]);
    if (itens.length === 0) return NextResponse.json({ sucesso: true, candidatos: [] });

    const prompt = `
      Você é um assistente financeiro que organiza itens de compras em categorias.
      ${trechoObjetivo(objetivo)}

      O usuário acabou de criar a categoria "${nome}". Abaixo estão itens que ele já categorizou
      (id, descrição e categoria atual). Indique os itens que se encaixam CLARAMENTE melhor em "${nome}"
      do que na categoria atual. Na dúvida, deixe o item onde está.

      Itens:
      ${JSON.stringify(itens)}

      Devolva APENAS um JSON neste formato: { "ids": [123, 456] }
    `;

    const resposta = (await gerarJson(modelo, prompt)) as { ids?: unknown };
    const ids = new Set(Array.isArray(resposta?.ids) ? resposta.ids.map(Number) : []);
    const candidatos: CandidatoRemapeamento[] = itens.filter((i) => ids.has(i.id));
    return NextResponse.json({ sucesso: true, candidatos });
  } catch (error) {
    console.error('Erro na IA ao sugerir remapeamento:', error);
    return NextResponse.json({ sucesso: true, candidatos: [], aviso: 'Categoria criada, mas a IA não conseguiu analisar os itens antigos.' });
  }
}
