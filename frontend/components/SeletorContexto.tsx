"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { buscarApi } from '../lib/cliente';
import { CheckIcon, ChevronIcon, UserIcon, UsersIcon } from './icons';
import { useContexto } from '../lib/contexto-cliente';


/**
 * Troca o contexto da sessão e recarrega a página (ou vai para `destino`): as telas já visitadas
 * ficam em cache no cliente com os dados do contexto anterior. Devolve a mensagem de erro, se houver.
 */
export async function alternarContexto(grupoId: number | null, destino?: string): Promise<string | null> {
  try {
    const res = await buscarApi('/api/contexto', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grupoId }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.sucesso) return d?.erro || 'Não foi possível alternar.';
    if (destino) window.location.assign(destino);
    else window.location.reload();
    return null;
  } catch {
    return 'Erro de conexão.';
  }
}

/**
 * Mostra de quem são os dados das telas (conta pessoal ou um grupo) e permite alternar.
 * Em grupo, fica destacado na cor de ação para ninguém registrar compra no lugar errado.
 * Some para quem não participa de nenhum grupo.
 */
export default function SeletorContexto() {
  const dados = useContexto();
  const [aberto, setAberto] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [erro, setErro] = useState('');
  const ref = useRef<HTMLDivElement>(null);

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

  if (!dados) return null;
  const { contexto, grupos } = dados;
  if (contexto.tipo === 'pessoal' && grupos.length === 0) return null;
  const ativos = grupos.filter((g) => !g.historico);
  const historico = grupos.filter((g) => g.historico);

  const emGrupo = contexto.tipo === 'grupo';
  const atualId = emGrupo ? contexto.grupoId : null;

  const escolher = async (grupoId: number | null) => {
    if (grupoId === atualId) return setAberto(false);
    setTrocando(true);
    setErro('');
    const falha = await alternarContexto(grupoId);
    if (falha) { setErro(falha); setTrocando(false); }
  };

  const item = 'flex items-center gap-2 w-full min-h-11 px-4 text-[15px] text-left text-texto hover:bg-fundo disabled:opacity-50';

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={`Vendo: ${emGrupo ? `grupo ${contexto.nome}` : 'conta pessoal'}. Alternar`}
        className={`inline-flex max-w-[11rem] md:max-w-[14rem] items-center gap-1.5 h-9 px-3 rounded-full text-[14px] font-medium ${
          emGrupo ? 'bg-acao-suave text-acao hover:bg-acao/15' : 'bg-black/5 text-texto-2 hover:bg-black/10'
        }`}
      >
        {emGrupo ? <UsersIcon /> : <UserIcon />}
        <span className="truncate">{emGrupo ? contexto.nome : 'Pessoal'}</span>
        <ChevronIcon className="shrink-0" />
      </button>

      {aberto && (
        <div role="menu" className="absolute left-0 top-11 z-40 w-64 rounded-lg border border-linha bg-superficie py-1 shadow-sm">
          <p className="px-4 py-2 text-[13px] text-texto-3">Ver e registrar em</p>
          <button role="menuitemradio" aria-checked={!emGrupo} type="button" onClick={() => escolher(null)} disabled={trocando} className={item}>
            <UserIcon /> <span className="flex-1 truncate">Conta pessoal</span> {!emGrupo && <CheckIcon />}
          </button>
          {ativos.map((g) => (
            <button
              key={g.grupoId}
              role="menuitemradio"
              aria-checked={atualId === g.grupoId}
              type="button"
              onClick={() => escolher(g.grupoId)}
              disabled={trocando}
              className={item}
            >
              <UsersIcon /> <span className="flex-1 truncate">{g.nome}</span> {atualId === g.grupoId && <CheckIcon />}
            </button>
          ))}
          {historico.length > 0 && (
            <>
              <p className="px-4 pt-3 pb-1 text-[13px] text-texto-3">Histórico (só consulta)</p>
              {historico.map((g) => (
                <button
                  key={g.grupoId}
                  role="menuitemradio"
                  aria-checked={atualId === g.grupoId}
                  type="button"
                  onClick={() => escolher(g.grupoId)}
                  disabled={trocando}
                  className={`${item} text-texto-2`}
                >
                  <UsersIcon /> <span className="flex-1 truncate">{g.nome}</span> {atualId === g.grupoId && <CheckIcon />}
                </button>
              ))}
            </>
          )}
          {erro && <p role="alert" className="px-4 py-2 text-[13px] text-erro">{erro}</p>}
          <div className="border-t border-linha my-1" />
          <Link role="menuitem" href="/grupos" onClick={() => setAberto(false)} className={`${item} text-texto-2`}>
            Gerenciar grupos
          </Link>
        </div>
      )}
    </div>
  );
}
