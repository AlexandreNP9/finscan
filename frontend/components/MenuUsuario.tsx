"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { buscarApi } from '../lib/cliente';

/** Inicial do usuário que abre um menu com os ajustes (categorias, fontes pagadoras, grupos) e o "Sair". */
export default function MenuUsuario() {
  const [nome, setNome] = useState('');
  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    buscarApi('/api/auth/sessao')
      .then((res) => res.json())
      .then((data) => data.sucesso && setNome(data.usuario.nome))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const fecharFora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    const fecharEsc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', fecharFora);
    document.addEventListener('keydown', fecharEsc);
    return () => {
      document.removeEventListener('mousedown', fecharFora);
      document.removeEventListener('keydown', fecharEsc);
    };
  }, [aberto]);

  const sair = async () => {
    setSaindo(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.replace('/login');
    }
  };

  const item = 'flex items-center w-full min-h-11 px-4 text-[15px] text-left text-texto hover:bg-fundo';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label="Menu da conta"
        className="w-10 h-10 rounded-full bg-texto text-white text-[14px] font-semibold flex items-center justify-center hover:opacity-90"
      >
        {nome ? nome.charAt(0).toUpperCase() : ''}
      </button>

      {aberto && (
        <div role="menu" className="absolute right-0 top-12 z-40 w-60 rounded-lg border border-linha bg-superficie py-1 shadow-sm">
          <p className="px-4 py-2 text-[13px] text-texto-3 truncate" title={nome}>{nome || '…'}</p>
          <div className="border-t border-linha my-1" />
          <Link role="menuitem" href="/categorias" className={item} onClick={() => setAberto(false)}>Categorias</Link>
          <Link role="menuitem" href="/agentes" className={item} onClick={() => setAberto(false)}>Fontes pagadoras</Link>
          <Link role="menuitem" href="/grupos" className={item} onClick={() => setAberto(false)}>Grupos</Link>
          <div className="border-t border-linha my-1" />
          <button role="menuitem" type="button" onClick={sair} disabled={saindo} className={`${item} text-erro disabled:opacity-50`}>
            {saindo ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      )}
    </div>
  );
}
