"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

// ── ÍCONES ──
const ScanIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg> );
const TagIcon = () => ( <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> );
const WalletIcon = () => ( <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg> );
const SparkleIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" /></svg> );
const CloseIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> );

// ── FUNÇÕES UTILITÁRIAS ──
const parseMoeda = (valorStr: string) => Number(valorStr.replace(/\./g, '').replace(',', '.'));
const formataMoeda = (valorNum: number) => valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nomeMes = (mesAno: string) => {
  const [ano, mes] = mesAno.split('-');
  const data = new Date(parseInt(ano), parseInt(mes) - 1);
  return data.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', ' ');
};

export default function Dashboard() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState('');
  
  // Estado para controlar qual categoria está expandida no modal
  const [categoriaDetalhe, setCategoriaDetalhe] = useState<{ nome: string, total: number, cor: string } | null>(null);

  useEffect(() => {
    fetch('/api/transacoes')
      .then(res => res.json())
      .then(data => {
        if (data.sucesso) {
          setTransacoes(data.transacoes);
          if (data.transacoes.length > 0) {
            setMesSelecionado(data.transacoes[0].dataEmissao.substring(0, 7));
          } else {
            const hoje = new Date();
            setMesSelecionado(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`);
          }
        }
        setIsLoading(false);
      });
  }, []);

  const mesesDisponiveis = useMemo(() => {
    const meses = new Set<string>();
    transacoes.forEach(t => meses.add(t.dataEmissao.substring(0, 7)));
    return Array.from(meses).sort().reverse();
  }, [transacoes]);

  const { totalMes, topCategorias, qtdPendentes } = useMemo(() => {
    let total = 0;
    const somaCategorias: Record<string, number> = {};
    let pendentesContagem = 0;

    transacoes.forEach(t => {
      if (t.items?.some((i: any) => i.categoria === '')) pendentesContagem++;

      if (t.dataEmissao.startsWith(mesSelecionado)) {
        total += parseMoeda(t.valorTotal);
        t.items?.forEach((item: any) => {
          if (item.categoria && item.categoria !== '') {
            const valorItem = parseMoeda(item.vlTotal);
            somaCategorias[item.categoria] = (somaCategorias[item.categoria] || 0) + valorItem;
          }
        });
      }
    });

    const categoriasOrdenadas = Object.entries(somaCategorias)
      .map(([nome, valor]) => ({ nome, valor, percentual: total > 0 ? (valor / total) * 100 : 0 }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 3);

    return { totalMes: total, topCategorias: categoriasOrdenadas, qtdPendentes: pendentesContagem };
  }, [transacoes, mesSelecionado]);

  // Filtra os itens exatos da categoria selecionada para exibir no modal
  const itensDetalhados = useMemo(() => {
    if (!categoriaDetalhe) return [];
    
    const itens: any[] = [];
    transacoes.forEach(t => {
      if (t.dataEmissao.startsWith(mesSelecionado)) {
        t.items?.forEach((item: any) => {
          if (item.categoria === categoriaDetalhe.nome) {
            itens.push({
              id: Math.random(), // id temporário para a lista
              descricao: item.descricao,
              valor: item.vlTotal,
              valorNum: parseMoeda(item.vlTotal),
              data: t.dataEmissao,
              estabelecimento: t.estabelecimento
            });
          }
        });
      }
    });
    
    // Ordena do mais caro para o mais barato
    return itens.sort((a, b) => b.valorNum - a.valorNum);
  }, [transacoes, mesSelecionado, categoriaDetalhe]);

  const coresGrafico = ['bg-blue-400', 'bg-purple-400', 'bg-emerald-400'];

  return (
    <div className="min-h-screen bg-[#f4f5f7] p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-[430px] md:max-w-[960px] flex flex-col gap-6 pb-8 relative">
        
        <header className="pt-4 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-[#111827]">Visão Geral</h1>
            <p className="text-[13px] text-[#6b7280] capitalize">{mesSelecionado ? nomeMes(mesSelecionado) : 'Carregando...'}</p>
          </div>
          
          {mesesDisponiveis.length > 0 && (
            <select 
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="bg-white border border-[#e8eaed] text-[#374151] text-[12px] font-semibold rounded-lg px-3 py-2 outline-none cursor-pointer hover:border-[#1d4ed8] transition-colors"
            >
              {mesesDisponiveis.map(mes => (
                <option key={mes} value={mes} className="capitalize">{nomeMes(mes)}</option>
              ))}
            </select>
          )}
        </header>

        <section className="bg-[#111827] rounded-2xl p-6 shadow-lg text-white min-h-[180px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div></div>
          ) : (
            <>
              <p className="text-[12px] text-gray-400 font-medium uppercase tracking-wider mb-1">Gasto no Mês</p>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-lg">R$</span>
                <span className="text-4xl font-bold font-mono">{formataMoeda(totalMes)}</span>
              </div>
              
              <div className="space-y-3">
                {topCategorias.length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic">Nenhum gasto categorizado neste mês.</p>
                ) : (
                  topCategorias.map((cat, index) => (
                    <button 
                      key={cat.nome} 
                      onClick={() => setCategoriaDetalhe({ nome: cat.nome, total: cat.valor, cor: coresGrafico[index] })}
                      className="w-full text-left group hover:bg-white/5 p-1 -mx-1 rounded-lg transition-colors"
                    >
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-gray-300 group-hover:text-white transition-colors">{cat.nome}</span>
                        <span className="font-mono group-hover:text-white transition-colors">R$ {formataMoeda(cat.valor)}</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-1.5">
                        <div className={`${coresGrafico[index]} h-1.5 rounded-full`} style={{ width: `${cat.percentual}%` }}></div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </section>

        <div className="flex justify-center -mt-3 mb-1">
          <Link href="/historico" className="text-[12px] font-bold text-[#6b7280] hover:text-[#1d4ed8] transition-colors flex items-center gap-1">
            Ver extrato completo de lançamentos
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          <Link className="bg-[#1d4ed8] text-white rounded-2xl p-5 shadow-lg shadow-[#1d4ed8]/25 flex items-center justify-between hover:bg-[#1e40af] active:scale-[0.98] transition-all" href="/nova-transacao">
            <div>
              <h2 className="text-[16px] font-bold">Registrar Novo Gasto</h2>
              <p className="text-[12px] text-white/80 mt-0.5">Escanear nota ou digitar chave</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center"><ScanIcon/></div>
          </Link>

          <Link className="bg-white border border-[#e8eaed] text-[#111827] rounded-2xl p-5 shadow-sm flex items-center justify-between hover:border-[#7c3aed] active:scale-[0.98] transition-all relative overflow-hidden group" href="/categorizar">
            {qtdPendentes > 0 && (
              <div className="absolute top-5 right-16 flex items-center gap-1.5 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                {qtdPendentes} pendente{qtdPendentes > 1 ? 's' : ''}
              </div>
            )}
            <div className="relative z-10">
              <h2 className="text-[16px] font-bold">Categorizar Produtos</h2>
              <p className="text-[12px] text-[#6b7280] mt-0.5">Organizar compras usando a IA</p>
            </div>
            <div className="w-12 h-12 bg-[#faf5ff] text-[#7c3aed] group-hover:bg-[#7c3aed] group-hover:text-white rounded-full flex items-center justify-center transition-colors"><SparkleIcon/></div>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <Link className="bg-white border border-[#e8eaed] rounded-2xl p-4 flex flex-col gap-3 hover:border-[#111827] active:scale-[0.98] transition-all" href="/categorias">
            <div className="w-8 h-8 bg-[#f4f5f7] rounded-lg flex items-center justify-center text-[#6b7280]"><TagIcon/></div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111827]">Categorias</h3>
              <p className="text-[10px] text-[#6b7280] mt-0.5">Gerenciar regras</p>
            </div>
          </Link>

          <Link className="bg-white border border-[#e8eaed] rounded-2xl p-4 flex flex-col gap-3 hover:border-[#111827] active:scale-[0.98] transition-all" href="/agentes">
            <div className="w-8 h-8 bg-[#f4f5f7] rounded-lg flex items-center justify-center text-[#6b7280]"><WalletIcon/></div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111827]">Pagadores</h3>
              <p className="text-[10px] text-[#6b7280] mt-0.5">Contas e cartões</p>
            </div>
          </Link>
        </div>
      </div>

      {/* MODAL DE DETALHES DA CATEGORIA */}
      {categoriaDetalhe && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[500px] bg-white rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-0 md:zoom-in-95">
            
            <div className="px-6 py-5 border-b border-[#e8eaed] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-3 h-3 rounded-full ${categoriaDetalhe.cor}`}></div>
                  <h2 className="text-[16px] font-bold text-[#111827]">{categoriaDetalhe.nome}</h2>
                </div>
                <p className="text-[13px] font-mono font-bold text-[#374151]">Total: R$ {formataMoeda(categoriaDetalhe.total)}</p>
              </div>
              <button 
                onClick={() => setCategoriaDetalhe(null)} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f4f5f7] text-[#6b7280] hover:bg-[#e8eaed] hover:text-[#111827] transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2 bg-[#f9fafb]">
              {itensDetalhados.map((item, idx) => (
                <div key={idx} className="bg-white border border-[#e8eaed] p-3 rounded-xl flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-[12px] font-bold text-[#111827] truncate">{item.descricao}</p>
                    <p className="text-[10px] text-[#6b7280] mt-0.5">
                      {item.estabelecimento} • {item.data.split('-').reverse().join('/')}
                    </p>
                  </div>
                  <span className="text-[13px] font-bold font-mono text-[#374151]">R$ {item.valor}</span>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}