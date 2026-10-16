import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL não fornecida' }, { status: 400 });

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // --- 1. EXTRAÇÃO DOS ITENS ---
    const itens: any[] = [];
    $('#tabResult tr').each((i, elemento) => {
      const descricao = $(elemento).find('.txtTit2').text().trim();
      const codigo = $(elemento).find('.RCod').text().replace(/\D/g, '').trim();
      const qtd = $(elemento).find('.Rqtd').text().replace(/[^\d,]/g, '').trim();
      const un = $(elemento).find('.RUN').text().replace('UN:', '').trim();
      const vlUnit = $(elemento).find('.RvlUnit').text().replace(/[^\d,]/g, '').trim();
      const vlTotal = $(elemento).find('.valor').text().trim();

      if (descricao) {
        itens.push({ id: Date.now() + i, codigo, descricao, qtd, un, vlUnit, vlTotal, categoria: 'Outros' });
      }
    });

    // --- 2. EXTRAÇÃO DE DADOS EXTRAS DO CABEÇALHO/RODAPÉ ---
    const valorTotalNota = $('.txtMax').text().trim();
    
    // Nome do Estabelecimento (ex: SUBWAY CM 2)
    const estabelecimento = $('#u20.txtTopo').text().trim();

    // Desconto (Procura na lista de totais a label exata)
    let desconto = '0,00';
    $('#linhaTotal').each((i, el) => {
      const label = $(el).find('label').text().trim();
      if (label.includes('Descontos R$:')) {
        desconto = $(el).find('.totalNumb').text().trim();
      }
    });

    // Data e Hora da Emissão (Busca na lista de informações gerais via Regex)
    let emissao = '';
    $('#infos li').each((i, el) => {
      const texto = $(el).text();
      // Procura o padrão de data e hora: Emissão: DD/MM/AAAA HH:MM:SS
      const match = texto.match(/Emissão:\s*(\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}:\d{2})/);
      if (match) emissao = match[1]; // Retorna "10/10/2026 13:52:49"
    });

    return NextResponse.json({ 
      sucesso: true, 
      itens,
      valorTotalNota,
      estabelecimento,
      desconto,
      emissao
    });

  } catch (error) {
    console.error('Erro no scraping:', error);
    return NextResponse.json({ error: 'Falha ao processar a nota' }, { status: 500 });
  }
}