"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BackIcon, SparkleIcon, RefreshIcon, WarningIcon } from '../../components/icons';
import CATEGORIAS from '../../data/categorias.json';
import { Item } from '../../types';

export default function CategorizarProdutos() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [transacaoAtiva, setTransacaoAtiva] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estados da IA (Aqueles que já tínhamos lapidado!)
  const [isCategorizando, setIsCategorizando] = useState(false);
  const [mensagemIA, setMensagemIA] = useState('Processando com IA...');
  const [tempoIA, setTempoIA] = useState(0);
  const [statusIA, setStatusIA] = useState<'idle' | 'sucesso' | 'erro'>('idle');
  const [mensagemStatus, setMensagemStatus] = useState('');
  const [isSalvando, setIsSalvando] = useState(false);

  // Busca as transações do banco local
  const carregarTransacoes = () => {
    fetch('/api/transacoes')
      .then(res => res.json())
      .then(data => {
        if (data.sucesso) {
          // Filtra apenas transações que tenham pelo menos 1 item sem categoria
          const pendentes = data.transacoes.filter((t: any) => 
            t.items && t.items.some((i: Item) => i.categoria === '')
          );
          setTransacoes(pendentes);
        }
        setIsLoading(false);
      });
  };

  useEffect(() => {
    carregarTransacoes();
  }, []);

  // O Relógio da IA
  useEffect(() => {
    let intervalo: NodeJS.Timeout;
    if (isCategorizando) {
      intervalo = setInterval(() => setTempoIA(s => s + 1), 1000);
    } else {
      setTempoIA(0);
    }
    return () => clearInterval(intervalo);
  }, [isCategorizando]);

  const categorizarComIA = async () => {
    if (!transacaoAtiva) return;
    setIsCategorizando(true);
    setStatusIA('idle');
    setMensagemIA('Conectando à IA...');

    const tempoInicio = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // Fail Fast de 35s

    const t1 = setTimeout(() => setMensagemIA('Analisando os itens...'), 3000);
    const t2 = setTimeout(() => setMensagemIA('Cruzando dados...'), 7000);

    try {
      const itensSimplificados = transacaoAtiva.items.map((i: Item) => ({ id: i.id, descricao: i.descricao }));

      const res = await fetch('/api/categorizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: itensSimplificados }),
        signal: controller.signal
      });

      if (!res.ok) throw new Error('Erro na API');
      const data = await res.json();

      if (data.sucesso) {
        // Atualiza os itens da transação ativa com as respostas da IA
        const itensAtualizados = transacaoAtiva.items.map((itemAntigo: Item) => {
          const sugestao = data.resultado.find((r: any) => r.id === itemAntigo.id);
          return sugestao ? { ...itemAntigo, categoria: sugestao.categoria } : itemAntigo;
        });

        setTransacaoAtiva({ ...transacaoAtiva, items: itensAtualizados });
        
        const seg = Math.floor((Date.now() - tempoInicio) / 1000);
        setStatusIA('sucesso');
        setMensagemStatus(`Concluído em ${seg}s`);
      }
    } catch (error: any) {
      setStatusIA('erro');
      setMensagemStatus(error.name === 'AbortError' ? 'Tempo limite (35s) excedido.' : 'Erro na Inteligência Artificial.');
    } finally {
      clearTimeout(timeoutId); clearTimeout(t1); clearTimeout(t2);
      setIsCategorizando(false);
      setMensagemIA('Processando com IA...');
    }
  };

  const atualizarCategoriaItem = (idItem: number, novaCat: string) => {
    const itensAtualizados = transacaoAtiva.items.map((i: Item) => 
      i.id === idItem ? { ...i, categoria: novaCat } : i
    );
    setTransacaoAtiva({ ...transacaoAtiva, items: itensAtualizados });
  };

  const salvarTransacaoCategorizada = async () => {
    // Verifica se sobrou algum item sem categoria
    const temSemCategoria = transacaoAtiva.items.some((i: Item) => i.categoria === '');
    if (temSemCategoria) {
      alert("Ainda existem itens sem categoria!");
      return;
    }

    setIsSalvando(true);
    try {
      const res = await fetch('/api/transacoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transacaoAtiva)
      });

      if (res.ok) {
        setTransacaoAtiva(null); // Fecha a visão de detalhes
        setStatusIA('idle'); // Reseta a IA
        carregarTransacoes(); // Recarrega a lista (o que foi salvo vai sumir da caixa de entrada!)
      } else {
        alert("Erro ao salvar.");
      }
    } catch (e) {
      alert("Erro de conexão.");
    } finally {
      setIsSalvando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex justify-center md:items-start md:py-10">
      <div className="w-full max-w-[430px] md:max-w-[960px] bg-white md:rounded-2xl md:shadow-lg overflow-hidden flex flex-col min-h-screen md:min-h-[85vh]">
        
        <header className="sticky top-0 z-20 bg-white border-b border-[#e8eaed] px-4 py-4 flex items-center justify-between">
          <button onClick={() => transacaoAtiva ? setTransacaoAtiva(null) : window.location.href = '/'} className="w-10 h-10 flex items-center justify-center rounded-xl text-[#6b7280] hover:bg-[#f4f5f7] transition-colors">
            <BackIcon />
          </button>
          <div className="flex items-center gap-2">
            <SparkleIcon />
            <h1 className="text-[16px] font-bold text-[#111827]">Caixa de Entrada IA</h1>
          </div>
          <div className="w-10"></div>
        </header>

        <div className="flex-1 overflow-y-auto bg-[#f9fafb] p-4 md:p-6">
          
          {isLoading ? (
            <p className="text-center text-[#9ca3af] mt-10">Buscando pendências...</p>
          ) : !transacaoAtiva ? (
            /* VISÃO 1: LISTA DE PENDÊNCIAS */
            <div className="space-y-4 animate-in fade-in">
              <h2 className="text-[13px] font-bold text-[#6b7280] tracking-widest uppercase mb-4">
                Aguardando Categorização ({transacoes.length})
              </h2>
              
              {transacoes.length === 0 ? (
                <div className="bg-white border border-[#e8eaed] rounded-2xl p-8 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <h3 className="text-[16px] font-bold text-[#111827]">Tudo limpo!</h3>
                  <p className="text-[13px] text-[#6b7280] mt-1">Nenhuma nota fiscal pendente de categorização.</p>
                </div>
              ) : (
                transacoes.map((t) => {
                  const qtdPendentes = t.items.filter((i: Item) => i.categoria === '').length;
                  return (
                    <button 
                      key={t.id} 
                      onClick={() => setTransacaoAtiva(t)}
                      className="w-full bg-white border border-[#e8eaed] rounded-xl p-4 text-left flex items-center justify-between hover:border-[#7c3aed] hover:shadow-md transition-all active:scale-[0.98]"
                    >
                      <div>
                        <p className="text-[14px] font-bold text-[#111827]">{t.estabelecimento || 'Estabelecimento Desconhecido'}</p>
                        <p className="text-[11px] text-[#6b7280] mt-0.5">{t.dataEmissao.split('-').reverse().join('/')} • {t.agenteOrigem}</p>
                        <div className="mt-2 inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                          {qtdPendentes} iten(s) pendente(s)
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[14px] font-bold text-[#111827] font-mono">R$ {t.valorTotal}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            /* VISÃO 2: DETALHES DA TRANSAÇÃO (Categorizar) */
            <div className="animate-in slide-in-from-right-4">
              <div className="bg-white border border-[#e8eaed] rounded-xl p-4 mb-4">
                <p className="text-[14px] font-bold text-[#111827]">{transacaoAtiva.estabelecimento}</p>
                <p className="text-[11px] text-[#6b7280]">{transacaoAtiva.dataEmissao.split('-').reverse().join('/')} • R$ {transacaoAtiva.valorTotal}</p>
              </div>

              {/* O famoso botão da Inteligência Artificial */}
              <button
                onClick={categorizarComIA}
                disabled={isCategorizando}
                className={`w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl border text-[12px] font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
                  isCategorizando ? 'border-[#7c3aed]/25 bg-[#faf5ff] text-[#7c3aed]' :
                  statusIA === 'sucesso' ? 'border-green-300 bg-green-50 text-green-700' :
                  statusIA === 'erro' ? 'border-red-300 bg-red-50 text-red-600' :
                  'border-[#7c3aed] bg-[#7c3aed] text-white shadow-lg shadow-[#7c3aed]/20 hover:bg-[#6d28d9]'
                }`}
              >
                {isCategorizando ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    {mensagemIA} <span className="font-mono bg-current/10 px-1.5 py-0.5 rounded text-[10px] ml-1">{tempoIA}s</span>
                  </span>
                ) : statusIA === 'sucesso' ? (
                  <><RefreshIcon /> Recategorizar ({mensagemStatus})</>
                ) : statusIA === 'erro' ? (
                  <><WarningIcon /> {mensagemStatus}</>
                ) : (
                  <><SparkleIcon /> Categorizar {transacaoAtiva.items.length} itens com IA</>
                )}
              </button>

              <div className="space-y-3 pb-20 md:pb-0">
                {transacaoAtiva.items.map((item: Item) => (
                  <div key={item.id} className="border border-[#e8eaed] rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="flex items-center justify-between bg-[#f9fafb] px-3 py-2 border-b border-[#e8eaed]">
                      <span className="flex-1 text-[11px] md:text-[12px] font-semibold text-[#111827] truncate mr-2">{item.descricao}</span>
                      <span className="text-[11px] md:text-[12px] font-bold text-[#111827] font-mono">R$ {item.vlTotal}</span>
                    </div>
                    <div className="px-3 py-2">
                      <div className="relative">
                        <select
                          value={item.categoria}
                          onChange={e => atualizarCategoriaItem(item.id, e.target.value)}
                          className={`w-full text-[11px] md:text-[12px] font-medium rounded-md px-2 py-2 outline-none appearance-none pr-6 transition-colors ${
                            item.categoria === '' ? 'text-orange-600 border-orange-300 bg-orange-50 border' : 'text-[#374151] bg-[#f4f5f7] border border-[#e8eaed]'
                          }`}
                        >
                          <option disabled value="">Sem Categoria (Pendência)</option>
                          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <svg className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER (Só aparece se uma transação estiver ativa) */}
        {transacaoAtiva && (
          <div className="absolute md:relative bottom-0 left-0 w-full bg-white border-t border-[#e8eaed] px-4 py-3 md:px-6 md:py-4 z-10">
            <button
              onClick={salvarTransacaoCategorizada}
              disabled={isSalvando}
              className="w-full py-3.5 rounded-xl bg-[#111827] text-white text-[14px] font-bold hover:bg-black transition-all shadow-lg disabled:opacity-70"
            >
              {isSalvando ? 'Salvando...' : 'Confirmar Categorias e Salvar'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}