"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrashIcon, BackIcon, PlusIcon } from '../../components/icons';

// Se ainda não moveu o WalletIcon para o index.tsx dos ícones, pode declará-lo aqui provisoriamente:
const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
);

export default function GerenciarAgentes() {
  const [agentes, setAgentes] = useState<string[]>([]);
  const [novoAgente, setNovoAgente] = useState('');
  
  const [isCarregando, setIsCarregando] = useState(true);
  const [statusSalvar, setStatusSalvar] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle');

  useEffect(() => {
    fetch('/api/agentes')
      .then(res => res.json())
      .then(data => {
        if (data.sucesso) setAgentes(data.agentes);
        setIsCarregando(false);
      });
  }, []);

  const adicionarAgente = () => {
    const nomeLimpo = novoAgente.trim();
    if (!nomeLimpo) return;

    if (agentes.some(a => a.toLowerCase() === nomeLimpo.toLowerCase())) {
      alert('Este pagador já existe!');
      return;
    }

    setAgentes([...agentes, nomeLimpo]);
    setNovoAgente('');
    setStatusSalvar('idle');
  };

  const removerAgente = (nome: string) => {
    if (confirm(`Tem certeza que deseja remover "${nome}"?`)) {
      setAgentes(agentes.filter(a => a !== nome));
      setStatusSalvar('idle');
    }
  };

  const salvarNoServidor = async () => {
    setStatusSalvar('salvando');
    try {
      const res = await fetch('/api/agentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentes })
      });
      
      if (res.ok) {
        setStatusSalvar('sucesso');
        setTimeout(() => setStatusSalvar('idle'), 3000);
      } else {
        setStatusSalvar('erro');
      }
    } catch (error) {
      setStatusSalvar('erro');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex justify-center md:items-start md:py-10">
      <div className="w-full max-w-[430px] md:max-w-[960px] bg-white md:rounded-2xl md:shadow-lg overflow-hidden flex flex-col min-h-screen md:min-h-[85vh]">
        
        <header className="sticky top-0 z-20 bg-white border-b border-[#e8eaed] px-4 py-4 flex items-center justify-between">
          <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-xl text-[#6b7280] hover:bg-[#f4f5f7] transition-colors">
            <BackIcon />
          </Link>
          <div className="flex items-center gap-2">
            <WalletIcon />
            <h1 className="text-[16px] font-bold text-[#111827]">Pagadores</h1>
          </div>
          <div className="w-10"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f9fafb]">
          
          <div className="bg-white rounded-xl border border-[#e8eaed] p-4 mb-6 shadow-sm">
            <label className="block text-[10px] font-semibold text-[#6b7280] mb-2 tracking-widest uppercase">
              Nova Conta ou Cartão
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={novoAgente}
                onChange={(e) => setNovoAgente(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adicionarAgente()}
                placeholder="Ex: Cartão Inter Mastercard..."
                className="flex-1 border border-[#e2e5ea] rounded-lg bg-[#f9fafb] text-[#111827] text-sm px-3 py-2.5 outline-none focus:border-[#1d4ed8] focus:bg-white transition-all"
              />
              <button 
                onClick={adicionarAgente}
                disabled={!novoAgente.trim()}
                className="bg-[#111827] text-white px-4 rounded-lg flex items-center justify-center disabled:opacity-50 hover:bg-black transition-all"
              >
                <PlusIcon />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#e8eaed] overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-[#f4f5f7] border-b border-[#e8eaed]">
              <h2 className="text-[11px] font-bold text-[#374151] tracking-widest uppercase">Pagadores Ativos ({agentes.length})</h2>
            </div>
            
            {isCarregando ? (
              <p className="p-6 text-center text-sm text-[#9ca3af]">Carregando...</p>
            ) : (
              <ul className="divide-y divide-[#e8eaed]">
                {agentes.map((ag) => (
                  <li key={ag} className="flex items-center justify-between px-4 py-3 hover:bg-[#f9fafb] transition-colors">
                    <span className="text-[13px] font-semibold text-[#111827]">{ag}</span>
                    <button 
                      onClick={() => removerAgente(ag)}
                      className="w-8 h-8 flex items-center justify-center rounded-md text-[#d1d5db] hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
                {agentes.length === 0 && (
                  <li className="p-6 text-center text-sm text-[#9ca3af]">Nenhum pagador cadastrado.</li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-white border-t border-[#e8eaed] p-4 md:p-6">
          <button
            onClick={salvarNoServidor}
            disabled={statusSalvar === 'salvando' || statusSalvar === 'sucesso'}
            className={`w-full py-3.5 rounded-xl text-[14px] font-bold tracking-wide transition-all shadow-lg ${
              statusSalvar === 'sucesso' ? 'bg-green-500 text-white shadow-green-500/20' : 
              statusSalvar === 'erro' ? 'bg-red-500 text-white' : 
              'bg-[#1d4ed8] text-white shadow-[#1d4ed8]/20 hover:bg-[#1e40af] active:scale-[0.98]'
            }`}
          >
            {statusSalvar === 'salvando' ? 'Salvando...' : 
             statusSalvar === 'sucesso' ? 'Pagadores Atualizados!' : 
             statusSalvar === 'erro' ? 'Erro ao salvar.' : 
             'Salvar Alterações'}
          </button>
        </div>

      </div>
    </div>
  );
}