"use client";

import { useEffect, useState } from 'react';
import { buscarApi } from '../lib/cliente';

/** Mostra quem está logado e o botão de sair. */
export default function UsuarioLogado() {
  const [nome, setNome] = useState('');
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    buscarApi('/api/auth/sessao')
      .then((res) => res.json())
      .then((data) => data.sucesso && setNome(data.usuario.nome))
      .catch(() => {});
  }, []);

  const sair = async () => {
    setSaindo(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.replace('/login');
    }
  };

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-8 h-8 shrink-0 rounded-full bg-[#111827] text-white text-[13px] font-bold flex items-center justify-center" aria-hidden>
        {nome ? nome.charAt(0).toUpperCase() : '·'}
      </div>
      <span className="text-[12px] font-semibold text-[#374151] truncate max-w-[110px] md:max-w-[200px]" title={nome}>
        {nome || '...'}
      </span>
      <button onClick={sair} disabled={saindo}
        className="text-[12px] font-semibold text-[#6b7280] border border-[#e8eaed] bg-white rounded-lg px-2.5 py-1.5 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-colors">
        Sair
      </button>
    </div>
  );
}
