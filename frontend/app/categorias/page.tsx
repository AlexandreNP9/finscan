"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrashIcon, BackIcon, PlusIcon } from '../../components/icons';

export default function GerenciarCategorias() {
  const [categorias, setCategorias] = useState<string[]>([]);
  const [novaCategoria, setNovaCategoria] = useState('');
  
  const [isCarregando, setIsCarregando] = useState(true);
  const [statusSalvar, setStatusSalvar] = useState<'idle' | 'salvando' | 'sucesso' | 'erro'>('idle');

  // Carrega as categorias do JSON ao abrir a tela
  useEffect(() => {
    fetch('/api/categorias')
      .then(res => res.json())
      .then(data => {
        if (data.sucesso) setCategorias(data.categorias);
        setIsCarregando(false);
      });
  }, []);

  const adicionarCategoria = () => {
    const nomeLimpo = novaCategoria.trim();
    if (!nomeLimpo) return;

    // Evita categorias duplicadas (case insensitive)
    const jaExiste = categorias.some(c => c.toLowerCase() === nomeLimpo.toLowerCase());
    if (jaExiste) {
      alert('Esta categoria já existe!');
      return;
    }

    setCategorias([...categorias, nomeLimpo]);
    setNovaCategoria(''); // Limpa o input
    setStatusSalvar('idle'); // Mostra que há mudanças não salvas
  };

  const removerCategoria = (nome: string) => {
    if (confirm(`Tem certeza que deseja remover "${nome}"?`)) {
      setCategorias(categorias.filter(c => c !== nome));
      setStatusSalvar('idle');
    }
  };

  const salvarNoServidor = async () => {
    setStatusSalvar('salvando');
    try {
      const res = await fetch('/api/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorias })
      });
      
      if (res.ok) {
        setStatusSalvar('sucesso');
        setTimeout(() => setStatusSalvar('idle'), 3000); // Volta ao normal após 3s
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
        
        {/* HEADER */}
        <header className="sticky top-0 z-20 bg-white border-b border-[#e8eaed] px-4 py-4 flex items-center justify-between">
          <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-xl text-[#6b7280] hover:bg-[#f4f5f7] transition-colors">
            <BackIcon />
          </Link>
          <h1 className="text-[16px] font-bold text-[#111827]">Gerenciar Categorias</h1>
          <div className="w-10"></div> {/* Espaçador para centralizar o título */}
        </header>

        {/* CONTEÚDO */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f9fafb]">
          
          {/* Adicionar Nova */}
          <div className="bg-white rounded-xl border border-[#e8eaed] p-4 mb-6 shadow-sm">
            <label className="block text-[10px] font-semibold text-[#6b7280] mb-2 tracking-widest uppercase">
              Nova Categoria
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={novaCategoria}
                onChange={(e) => setNovaCategoria(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adicionarCategoria()}
                placeholder="Ex: Pet Shop..."
                className="flex-1 border border-[#e2e5ea] rounded-lg bg-[#f9fafb] text-[#111827] text-sm px-3 py-2.5 outline-none focus:border-[#1d4ed8] focus:bg-white transition-all"
              />
              <button 
                onClick={adicionarCategoria}
                disabled={!novaCategoria.trim()}
                className="bg-[#111827] text-white px-4 rounded-lg flex items-center justify-center disabled:opacity-50 hover:bg-black transition-all"
              >
                <PlusIcon />
              </button>
            </div>
          </div>

          {/* Lista de Existentes */}
          <div className="bg-white rounded-xl border border-[#e8eaed] overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-[#f4f5f7] border-b border-[#e8eaed]">
              <h2 className="text-[11px] font-bold text-[#374151] tracking-widest uppercase">Categorias Ativas ({categorias.length})</h2>
            </div>
            
            {isCarregando ? (
              <p className="p-6 text-center text-sm text-[#9ca3af]">Carregando...</p>
            ) : (
              <ul className="divide-y divide-[#e8eaed]">
                {categorias.map((cat) => (
                  <li key={cat} className="flex items-center justify-between px-4 py-3 hover:bg-[#f9fafb] transition-colors">
                    <span className="text-[13px] font-semibold text-[#111827]">{cat}</span>
                    <button 
                      onClick={() => removerCategoria(cat)}
                      className="w-8 h-8 flex items-center justify-center rounded-md text-[#d1d5db] hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
                {categorias.length === 0 && (
                  <li className="p-6 text-center text-sm text-[#9ca3af]">Nenhuma categoria cadastrada.</li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* FOOTER / AÇÃO */}
        <div className="bg-white border-t border-[#e8eaed] p-4 md:p-6">
          <button
            onClick={salvarNoServidor}
            disabled={statusSalvar === 'salvando' || statusSalvar === 'sucesso'}
            className={`w-full py-3.5 rounded-xl text-[14px] font-bold tracking-wide transition-all shadow-lg ${
              statusSalvar === 'sucesso' 
                ? 'bg-green-500 text-white shadow-green-500/20' 
                : statusSalvar === 'erro'
                ? 'bg-red-500 text-white'
                : 'bg-[#1d4ed8] text-white shadow-[#1d4ed8]/20 hover:bg-[#1e40af] active:scale-[0.98]'
            }`}
          >
            {statusSalvar === 'salvando' ? 'Salvando...' : 
             statusSalvar === 'sucesso' ? 'Categorias Atualizadas!' : 
             statusSalvar === 'erro' ? 'Erro ao salvar. Tente novamente.' : 
             'Salvar Alterações'}
          </button>
        </div>

      </div>
    </div>
  );
}