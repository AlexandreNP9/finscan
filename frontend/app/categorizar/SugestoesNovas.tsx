"use client";

import { useEffect, useState } from 'react';
import { buscarApi } from '../../lib/cliente';
import Aviso from '../../components/Aviso';
import Botao, { Spinner } from '../../components/Botao';
import { CloseIcon, SparkleIcon } from '../../components/icons';
import type { CandidatoRemapeamento } from '../../types';

export type SugestaoNova = { nome: string; motivo: string; itens: { id: number; descricao: string }[] };

type Props = {
  sugestoes: SugestaoNova[];
  /** A categoria foi criada: a página passa a usá-la nos itens da sugestão. */
  aoCriar: (nome: string) => void;
  aoIgnorar: (nome: string) => void;
};

type Revisao = { categoria: string; candidatos: CandidatoRemapeamento[]; selecionados: Set<number> };

/**
 * Categorias novas propostas pela IA para a nota aberta. Ao aceitar uma, ela é criada e a IA
 * aponta itens já categorizados que se encaixariam melhor nela; o usuário revisa antes de mover.
 */
export default function SugestoesNovas({ sugestoes, aoCriar, aoIgnorar }: Props) {
  const [criando, setCriando] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [revisao, setRevisao] = useState<Revisao | null>(null);
  const [movendo, setMovendo] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'alerta' | 'erro'; texto: string } | null>(null);

  const criar = async (nome: string) => {
    setCriando(nome);
    setErro('');
    setMensagem(null);
    try {
      const res = await buscarApi('/api/categorias/nova', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.sucesso) {
        setErro(d?.erro || 'Não foi possível criar a categoria.');
        return;
      }
      aoCriar(nome);
      const candidatos: CandidatoRemapeamento[] = d.candidatos ?? [];
      if (candidatos.length > 0) {
        setRevisao({ categoria: nome, candidatos, selecionados: new Set(candidatos.map((c) => c.id)) });
      } else {
        setMensagem(d.aviso ? { tipo: 'alerta', texto: d.aviso } : { tipo: 'sucesso', texto: `Categoria "${nome}" criada.` });
      }
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setCriando(null);
    }
  };

  const alternar = (id: number) => {
    if (!revisao) return;
    const selecionados = new Set(revisao.selecionados);
    if (selecionados.has(id)) selecionados.delete(id);
    else selecionados.add(id);
    setRevisao({ ...revisao, selecionados });
  };

  const fecharRevisao = (texto?: string) => {
    if (revisao) setMensagem({ tipo: 'sucesso', texto: texto ?? `Categoria "${revisao.categoria}" criada. Nenhum item antigo foi movido.` });
    setRevisao(null);
  };

  const mover = async () => {
    if (!revisao) return;
    setMovendo(true);
    try {
      const res = await buscarApi('/api/categorias/mover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoria: revisao.categoria, itens: [...revisao.selecionados] }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.sucesso) {
        const n = d.movidos as number;
        fecharRevisao(`Categoria "${revisao.categoria}" criada e ${n} ${n === 1 ? 'item antigo movido' : 'itens antigos movidos'} para ela.`);
      } else {
        setMensagem({ tipo: 'erro', texto: d?.erro || 'Não foi possível mover os itens.' });
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro de conexão.' });
    }
    setMovendo(false);
  };

  // Esc fecha a revisão sem mover nada.
  useEffect(() => {
    if (!revisao) return;
    const fechar = (e: KeyboardEvent) => e.key === 'Escape' && !movendo && fecharRevisao();
    document.addEventListener('keydown', fechar);
    return () => document.removeEventListener('keydown', fechar);
  });

  if (sugestoes.length === 0 && !mensagem && !revisao) return null;

  return (
    <>
      {sugestoes.length > 0 && (
        <section aria-labelledby="titulo-sugestoes" className="mt-6 rounded-lg border border-acao/30 bg-acao/5 p-4">
          <h2 id="titulo-sugestoes" className="flex items-center gap-2 text-[15px] font-semibold">
            <SparkleIcon /> {sugestoes.length === 1 ? 'A IA sugere uma categoria nova' : 'A IA sugere categorias novas'}
          </h2>
          <ul className="mt-3 space-y-4">
            {sugestoes.map((s) => (
              <li key={s.nome}>
                <p className="text-[15px] font-medium">{s.nome}</p>
                {s.motivo && <p className="text-[14px] text-texto-2">{s.motivo}</p>}
                <p className="mt-0.5 text-[13px] text-texto-3">
                  Para {s.itens.length === 1 ? 'o item' : `${s.itens.length} itens`}: {s.itens.map((i) => i.descricao).join(', ')}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Botao onClick={() => criar(s.nome)} disabled={criando !== null}>
                    {criando === s.nome ? <><Spinner /> Criando…</> : 'Criar e usar'}
                  </Botao>
                  <Botao variante="discreto" onClick={() => aoIgnorar(s.nome)} disabled={criando !== null}>
                    Ignorar
                  </Botao>
                </div>
              </li>
            ))}
          </ul>
          {erro && <p role="alert" className="mt-3 text-[13px] text-erro">{erro}</p>}
        </section>
      )}

      {mensagem && <Aviso tipo={mensagem.tipo} className="mt-4">{mensagem.texto}</Aviso>}

      {revisao && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4" onClick={() => !movendo && fecharRevisao()}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-revisao"
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-xl max-h-[85vh] flex flex-col bg-superficie rounded-t-xl md:rounded-xl shadow-sm"
          >
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 border-b border-linha">
              <div>
                <h2 id="titulo-revisao" className="text-[17px] font-semibold">Mover itens antigos para “{revisao.categoria}”?</h2>
                <p className="mt-1 text-[14px] text-texto-3">
                  A IA encontrou itens já categorizados que combinam com a categoria nova. Desmarque os que devem ficar onde estão.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fecharRevisao()}
                disabled={movendo}
                aria-label="Fechar sem mover"
                className="w-10 h-10 -mr-2 shrink-0 flex items-center justify-center rounded-lg text-texto-3 hover:bg-black/5"
              >
                <CloseIcon />
              </button>
            </div>

            <ul className="overflow-y-auto divide-y divide-linha px-5">
              {revisao.candidatos.map((c) => (
                <li key={c.id}>
                  <label className="py-3 flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={revisao.selecionados.has(c.id)}
                      onChange={() => alternar(c.id)}
                      className="mt-1 h-4 w-4 accent-acao"
                    />
                    <span className="min-w-0">
                      <span className="block text-[15px]">{c.descricao}</span>
                      <span className="block text-[13px] text-texto-3">hoje em {c.categoria}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap justify-end gap-2 px-5 pt-3 border-t border-linha" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
              <Botao variante="discreto" onClick={() => fecharRevisao()} disabled={movendo}>Agora não</Botao>
              <Botao onClick={mover} disabled={movendo || revisao.selecionados.size === 0}>
                {movendo ? <><Spinner /> Movendo…</> : `Mover ${revisao.selecionados.size} ${revisao.selecionados.size === 1 ? 'item' : 'itens'}`}
              </Botao>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
