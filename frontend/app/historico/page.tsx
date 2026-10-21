"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BackIcon } from '../../components/icons';
import { Item } from '../../types';

// Ícone de Recibo
const ReceiptIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17V7"/></svg>
);

export default function Historico() {
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandidoId, setExpandidoId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/transacoes')
      .then(res => res.json())
      .then(data => {
        if (data.sucesso) {
          // Garante que as mais recentes fiquem no topo
          const ordenadas = data.transacoes.sort((a: any, b: any) => 
            new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime()
          );
          setTransacoes(ordenadas);
        }
        setIsLoading(false);
      });
  }, []);

  const toggleExpandir = (id: number) => {
    setExpandidoId(expandidoId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex justify-center md:items-start md:py-10">
      <div className="w-full max-w-[430px] md:max-w-[960px] bg-white md:rounded-2xl md:shadow-lg overflow-hidden flex flex-col min-h-screen md:min-h-[85vh]">
        
        <header className="sticky top-0 z-20 bg-white border-b border-[#e8eaed] px-4 py-4 flex items-center justify-between">
          <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-xl text-[#6b7280] hover:bg-[#f4f5f7] transition-colors">
            <BackIcon />
          </Link>
          <div className="flex items-center gap-2">
            <ReceiptIcon />
            <h1 className="text-[16px] font-bold text-[#111827]">Histórico de Lançamentos</h1>
          </div>
          <div className="w-10"></div>
        </header>

        <div className="flex-1 overflow-y-auto bg-[#f9fafb] p-4 md:p-6">
          {isLoading ? (
            <p className="text-center text-[#9ca3af] mt-10">Carregando histórico...</p>
          ) : transacoes.length === 0 ? (
            <div className="text-center mt-10">
              <p className="text-[#6b7280]">Nenhuma transação registrada ainda.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transacoes.map((t) => (
                <div key={t.id} className="bg-white border border-[#e8eaed] rounded-xl overflow-hidden shadow-sm transition-all">
                  {/* Cabeçalho do Card (Clicável) */}
                  <button 
                    onClick={() => toggleExpandir(t.id)}
                    className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-[#f9fafb] active:bg-[#f4f5f7] transition-colors"
                  >
                    <div>
                      <p className="text-[14px] font-bold text-[#111827]">{t.estabelecimento || 'Estabelecimento Desconhecido'}</p>
                      <p className="text-[11px] text-[#6b7280] mt-0.5">
                        {t.dataEmissao.split('-').reverse().join('/')} {t.horaEmissao && `às ${t.horaEmissao}`} • {t.agenteOrigem}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <p className="text-[14px] font-bold text-[#111827] font-mono">R$ {t.valorTotal}</p>
                      <svg className={`text-[#9ca3af] transition-transform ${expandidoId === t.id ? 'rotate-180' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </button>

                  {/* Detalhes Expandidos (Itens) */}
                  {expandidoId === t.id && (
                    <div className="px-4 pb-4 pt-2 border-t border-[#f4f5f7] bg-[#fafafa]">
                      <p className="text-[10px] font-bold text-[#6b7280] uppercase tracking-widest mb-2">Itens da Compra</p>
                      <div className="space-y-2">
                        {t.items?.map((item: Item, idx: number) => (
                          <div key={idx} className="flex justify-between items-center bg-white border border-[#e8eaed] p-2 rounded-lg">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="text-[11px] font-semibold text-[#374151] truncate">{item.descricao}</p>
                              <p className="text-[9px] text-[#9ca3af]">{item.qtd} {item.un} x R$ {item.vlUnit} {item.categoria && `• ${item.categoria}`}</p>
                            </div>
                            <p className="text-[11px] font-bold text-[#111827] font-mono">R$ {item.vlTotal}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}