import { NextResponse } from 'next/server';
import { categorias } from '../../../lib/db/schema';
import { lerObjetivo, listarNomes } from '../../../lib/db/repositorio';
import { respostaDeErro } from '../../../lib/api';
import { exigirUsuario } from '../../../lib/auth';
import type { SugestaoItem } from '../../../types';
import { gerarJson, modeloGemini, respostaIaIndisponivel, trechoObjetivo } from '../../../lib/ia';

const TAMANHO_MAX_NOME = 40;

export async function POST(request: Request) {
  let usuarioId: number;
  try {
    usuarioId = (await exigirUsuario()).id;
  } catch (error) {
    return respostaDeErro(error, 'Erro ao verificar sessão');
  }

  const modelo = modeloGemini();
  if (!modelo) return respostaIaIndisponivel();

  try {
    const { itens } = await request.json();
    if (!Array.isArray(itens) || itens.length === 0) {
      return NextResponse.json({ sucesso: false, erro: 'Nenhum item enviado' }, { status: 400 });
    }

    // Lidos a cada chamada para refletir edições feitas em /categorias.
    const [cadastradas, objetivo] = await Promise.all([listarNomes(categorias, usuarioId), lerObjetivo(usuarioId)]);

    const prompt = `
      Você é um assistente financeiro especialista em categorização de microgastos.
      ${trechoObjetivo(objetivo)}

      Vou te passar uma lista de produtos de um gasto. Para cada um:
      1. Higienize o nome (desfaça abreviações, se houver) em "descricaoLimpa".
      2. Classifique-o OBRIGATORIAMENTE em UMA destas categorias já cadastradas, em "categoria": ${cadastradas.join(', ')}.
      3. Só se NENHUMA categoria cadastrada servir bem ao item, ou se o objetivo do usuário pedir uma
         distinção que as categorias atuais não fazem, proponha em "novaCategoria" o nome de uma categoria
         nova (curto, no mesmo estilo dos nomes cadastrados, no máximo ${TAMANHO_MAX_NOME} caracteres) e explique
         em "motivo" numa frase curta. Seja conservador: na maioria dos itens, omita "novaCategoria".
         Nunca proponha categoria nova para item ambíguo ou de descrição indecifrável: só classifique-o.
         Itens parecidos devem receber exatamente o mesmo nome de categoria nova.

      Produtos:
      ${JSON.stringify(itens)}

      Devolva APENAS um array JSON neste formato:
      [
        { "id": 123, "descricaoLimpa": "Nome legível", "categoria": "Uma das cadastradas" },
        { "id": 124, "descricaoLimpa": "Outro", "categoria": "Uma das cadastradas", "novaCategoria": "Nome novo", "motivo": "Por quê" }
      ]
    `;

    const resposta = await gerarJson(modelo, prompt);
    if (!Array.isArray(resposta)) throw new Error('Resposta da IA fora do formato esperado');

    // A IA não é confiável quanto ao formato: só passa o que bate com as regras.
    const existentes = new Set(cadastradas.map((c) => c.toLowerCase()));
    const resultado: SugestaoItem[] = resposta
      .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
      .map((r) => {
        const categoria = typeof r.categoria === 'string' && cadastradas.includes(r.categoria) ? r.categoria : '';
        const nova = typeof r.novaCategoria === 'string' ? r.novaCategoria.trim() : '';
        const sugestao: SugestaoItem = {
          id: Number(r.id),
          descricaoLimpa: typeof r.descricaoLimpa === 'string' ? r.descricaoLimpa : '',
          categoria,
        };
        if (nova && nova.length <= TAMANHO_MAX_NOME && !existentes.has(nova.toLowerCase())) {
          sugestao.novaCategoria = nova;
          sugestao.motivo = typeof r.motivo === 'string' ? r.motivo.trim() : '';
        }
        return sugestao;
      });

    return NextResponse.json({ sucesso: true, resultado });
  } catch (error) {
    console.error('Erro na IA:', error);
    return NextResponse.json({ sucesso: false, erro: 'Falha ao classificar itens' }, { status: 500 });
  }
}
