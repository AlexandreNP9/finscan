import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL não fornecida' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const itens: any[] = [];
    
    // Varre cada linha (tr) da tabela de resultados da SEFAZ-PR
    $('#tabResult tr').each((i, elemento) => {
      // 1. Descrição e Código
      const descricao = $(elemento).find('.txtTit2').text().trim();
      const codigoRaw = $(elemento).find('.RCod').text().trim(); // Vem como "(Código: 1000013)"
      const codigo = codigoRaw.replace(/\D/g, ''); // Deixa apenas os números

      // 2. Quantidade, Unidade e Valor Unitário
      const qtdRaw = $(elemento).find('.Rqtd').text().trim(); // Vem como "Qtde.:1"
      const qtd = qtdRaw.replace(/[^\d,]/g, ''); // Mantém só números e vírgula

      const unRaw = $(elemento).find('.RUN').text().trim(); // Vem como "UN: UN"
      const un = unRaw.replace('UN:', '').trim();

      const vlUnitRaw = $(elemento).find('.RvlUnit').text().trim(); // Vem como "Vl. Unit.: 20,9"
      const vlUnit = vlUnitRaw.replace(/[^\d,]/g, '');

      // 3. Valor Total do Item
      const vlTotal = $(elemento).find('.valor').text().trim();

      // Só adiciona se tiver encontrado uma descrição válida
      if (descricao) {
        itens.push({
          id: Date.now() + i,
          codigo,
          descricao,
          qtd,
          un,
          vlUnit,
          vlTotal,
          categoria: 'Outros' // Mantém 'Outros' para você usar a IA depois
        });
      }
    });

    // Extrai o valor final a pagar da nota
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