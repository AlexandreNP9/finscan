import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { htmlBruto } = await request.json();
    if (!htmlBruto) return NextResponse.json({ sucesso: false, erro: 'Nenhum código fornecido.' }, { status: 400 });

    const $ = cheerio.load(htmlBruto);
    
    // Extrai o Estabelecimento
    const estabelecimento = $('#u20').first().text().trim() || 'Estabelecimento Desconhecido';
    
    // Extrai o Valor Total
    const valorTotalNota = $('.txtMax').first().text().trim();
    
    // Extrai a Data e Hora
    let emissao = '';
    const textoInfos = $('#infos').text();
    const matchEmissao = textoInfos.match(/Emissão:\s*(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2})/);
    if (matchEmissao) emissao = matchEmissao[1];

    // Extrai a Chave de Acesso (limpando espaços)
    const chave = $('.chave').text().replace(/\D/g, '');

    // Extrai os Itens
    const itens: any[] = [];
    $('#tabResult tr').each((index, element) => {
      const descricao = $(element).find('.txtTit').first().text().trim();
      if (!descricao || descricao.includes('Vl. Total')) return; // Pula cabeçalhos ou linhas vazias

      // Regex para extrair apenas os números das strings complexas
      const qtdStr = $(element).find('.Rqtd').text().replace(/[^\d,]/g, '').trim();
      const unStr = $(element).find('.RUN').text().replace('UN:', '').replace('UND', 'UN').trim();
      const vlUnitStr = $(element).find('.RvlUnit').text().replace(/[^\d,]/g, '').trim();
      const vlTotalStr = $(element).find('.valor').text().trim();

      itens.push({
        id: Date.now() + index, // ID temporário para o React
        descricao,
        qtd: qtdStr || '1',
        un: unStr || 'UN',
        vlUnit: vlUnitStr || vlTotalStr,
        vlTotal: vlTotalStr,
        categoria: '' // Categoria começa vazia para a IA preencher depois
      });
    });

    if (itens.length === 0) {
      return NextResponse.json({ sucesso: false, erro: 'Nenhum item encontrado no HTML.' });
    }

    return NextResponse.json({ sucesso: true, estabelecimento, valorTotalNota, emissao, chave, itens });
    
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: 'Erro ao processar o HTML.' }, { status: 500 });
  }
}