import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL não fornecida' }, { status: 400 });
    }

    // 1. O Next.js (servidor) faz a requisição para a SEFAZ
    const response = await fetch(url, {
      headers: {
        // Fingimos ser um navegador comum para evitar bloqueios simples
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = await response.text();

    // 2. Carregamos o HTML no Cheerio para extrair os dados
    const $ = cheerio.load(html);

    // ATENÇÃO: Os seletores CSS abaixo variam de estado para estado!
    // Estes são exemplos genéricos. Você precisará inspecionar a página da SEFAZ
    // do seu estado (ex: SEFAZ-PR) para pegar as classes corretas.
    
    const itens: any[] = [];
    
    // Exemplo hipotético de extração (adapte para o HTML real da SEFAZ)
    $('table tr.item').each((i, elemento) => {
      const descricao = $(elemento).find('.txtTit').text().trim();
      const qtd = $(elemento).find('.Rqtd').text().trim();
      const un = $(elemento).find('.RUN').text().trim();
      const vlTotal = $(elemento).find('.valor').text().trim();

      if (descricao) {
        itens.push({
          id: Date.now() + i,
          codigo: '', // Geralmente a Sefaz mostra código, se tiver, extraia aqui
          descricao,
          qtd: qtd.replace(/[^0-9,]/g, ''),
          un,
          vlUnit: '', // Pode ser calculado (vlTotal / qtd)
          vlTotal: vlTotal.replace(/[^0-9,]/g, ''),
          categoria: 'Outros'
        });
      }
    });

    // Extrai o valor total da nota
    const valorTotalNota = $('.txtMax').text().trim();

    return NextResponse.json({ 
      sucesso: true, 
      itens,
      valorTotalNota 
    });

  } catch (error) {
    console.error('Erro no scraping:', error);
    return NextResponse.json({ error: 'Falha ao processar a nota' }, { status: 500 });
  }
}