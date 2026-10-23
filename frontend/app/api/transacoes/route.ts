import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chaveAcesso, valorTotal, desconto, estabelecimento, dataEmissao, horaEmissao, agenteOrigem, items } = body;

    // 1. Busca o ID do Agente escolhido na interface
    const agente = await prisma.agente.findFirst({
      where: { nome: agenteOrigem }
    });

    if (!agente) {
      return NextResponse.json({ sucesso: false, erro: 'Agente não encontrado.' }, { status: 400 });
    }

    // 2. Tratamento de Valores e Datas
    const dataCompleta = new Date(`${dataEmissao}T${horaEmissao || '12:00'}:00-03:00`);
    const valorTotalNum = Number(valorTotal.replace(/\./g, '').replace(',', '.'));
    
    // 3. Salva a Transação e os Itens em uma única operação no PostgreSQL
    const novaTransacao = await prisma.transacao.create({
      data: {
        titulo: estabelecimento || 'Transação sem título',
        valorPago: valorTotalNum,
        dataEmissao: dataCompleta,
        agenteId: agente.id,
        chaveAcesso: chaveAcesso || null,
        estabelecimentoNome: estabelecimento || null,
        
        // Relacionamento aninhado: Cria os itens da nota junto com a transação
        itens: {
          create: items.map((item: any) => ({
            descricao: item.descricao,
            quantidade: Number(item.qtd.replace(/\./g, '').replace(',', '.')),
            valorUnitario: Number(item.vlUnit.replace(/\./g, '').replace(',', '.')),
            valorTotal: Number(item.vlTotal.replace(/\./g, '').replace(',', '.')),
            unidadeMedida: item.un || null,
          }))
        }
      }
    });

    return NextResponse.json({ sucesso: true, transacao: novaTransacao });
  } catch (error) {
    console.error("Erro no Prisma:", error);
    return NextResponse.json({ sucesso: false, erro: 'Erro ao salvar transação no banco.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Busca todas as transações, trazendo junto os itens e o agente
    const transacoes = await prisma.transacao.findMany({
      orderBy: { dataEmissao: 'desc' },
      include: { itens: true, agente: true }
    });

    // Mapeia para o formato que o seu Dashboard atual já entende, para não quebrar a UI
    const transacoesFormatadas = transacoes.map(t => ({
      id: t.id,
      estabelecimento: t.estabelecimentoNome || t.titulo,
      valorTotal: t.valorPago.toString().replace('.', ','),
      // Ajusta a data para o formato YYYY-MM-DD para o filtro do dashboard funcionar
      dataEmissao: t.dataEmissao.toISOString().substring(0, 10),
      agenteOrigem: t.agente.nome,
      items: t.itens.map(i => ({
        descricao: i.descricao,
        vlTotal: i.valorTotal.toString().replace('.', ','),
        categoria: i.categoriaId || ''
      }))
    }));

    return NextResponse.json({ sucesso: true, transacoes: transacoesFormatadas });
  } catch (error) {
    return NextResponse.json({ sucesso: false, erro: 'Erro ao buscar transações.' }, { status: 500 });
  }
}