"use client";

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { buscarApi } from '../lib/cliente';
import Botao from './Botao';
import { TrashIcon } from './icons';

export type ChaveLista = 'categorias' | 'agentes';

/**
 * Carrega e salva uma das listas do usuário (`/api/categorias` ou `/api/agentes`).
 * O POST substitui a lista inteira, então `salvar` sempre envia todos os itens.
 */
export function useListaServidor(chave: ChaveLista) {
  const [itens, setItensEstado] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState('');
  const [sujo, setSujo] = useState(false);

  const carregar = useCallback(() => {
    return buscarApi(`/api/${chave}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.sucesso) {
          setItensEstado(data[chave]);
          setErroCarregar('');
        } else {
          setErroCarregar(data.erro || 'Não foi possível carregar a lista.');
        }
      })
      .catch(() => setErroCarregar('Erro de conexão.'))
      .finally(() => setCarregando(false));
  }, [chave]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const setItens = (novos: string[]) => {
    setItensEstado(novos);
    setSujo(true);
  };

  /** Devolve '' em caso de sucesso ou a mensagem de erro. */
  const salvar = async (lista: string[] = itens): Promise<string> => {
    try {
      const res = await buscarApi(`/api/${chave}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [chave]: lista }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.sucesso) return data?.erro || 'Não foi possível salvar.';
      setItensEstado(lista);
      setSujo(false);
      return '';
    } catch {
      return 'Erro de conexão.';
    }
  };

  return { itens, setItens, carregando, erroCarregar, sujo, salvar, recarregar: carregar };
}

type Props = {
  itens: string[];
  onChange: (itens: string[]) => void;
  /** Rótulo do campo de inclusão, ex.: "Nova categoria". */
  rotulo: string;
  placeholder?: string;
  /** Sugestões de um toque; as que já estão na lista ficam ocultas. */
  sugestoes?: string[];
  vazio?: string;
};

/** Campo para incluir + lista com remoção (confirmação na própria linha). Não salva sozinho. */
export default function EditorLista({ itens, onChange, rotulo, placeholder, sugestoes = [], vazio = 'Nada cadastrado ainda.' }: Props) {
  const [novo, setNovo] = useState('');
  const [erro, setErro] = useState('');
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const existe = (nome: string) => itens.some((i) => i.toLowerCase() === nome.toLowerCase());

  const incluir = (nome: string) => {
    const limpo = nome.trim();
    if (!limpo) return;
    if (existe(limpo)) {
      setErro(`"${limpo}" já está na lista.`);
      return;
    }
    onChange([...itens, limpo]);
    setNovo('');
    setErro('');
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    incluir(novo);
  };

  const sugestoesVisiveis = sugestoes.filter((s) => !existe(s));

  return (
    <div>
      <form onSubmit={enviar}>
        <label htmlFor="novo-item" className="block text-[13px] font-medium text-texto-2 mb-1.5">{rotulo}</label>
        <div className="flex gap-2">
          <input
            id="novo-item"
            type="text"
            value={novo}
            maxLength={100}
            onChange={(e) => { setNovo(e.target.value); setErro(''); }}
            placeholder={placeholder}
            className="flex-1 min-w-0 min-h-11 rounded-lg border border-linha-forte bg-superficie px-3 text-[15px] outline-none focus:border-acao"
          />
          <Botao type="submit" variante="secundario" disabled={!novo.trim()}>Adicionar</Botao>
        </div>
      </form>
      {erro && <p role="alert" className="mt-1.5 text-[13px] text-erro">{erro}</p>}

      {sugestoesVisiveis.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {sugestoesVisiveis.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => incluir(s)}
              className="min-h-9 rounded-full border border-linha-forte bg-superficie px-3 text-[14px] text-texto-2 hover:border-acao hover:text-acao transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-5 divide-y divide-linha border-y border-linha">
        {itens.map((item) => (
          <li key={item} className="flex items-center justify-between gap-3 min-h-12 py-1">
            <span className="text-[15px] truncate">{item}</span>
            {confirmando === item ? (
              <span className="flex items-center gap-1 shrink-0 text-[14px]">
                <span className="text-texto-3 mr-1">Remover?</span>
                <button
                  type="button"
                  onClick={() => { onChange(itens.filter((i) => i !== item)); setConfirmando(null); }}
                  className="min-h-9 px-2 rounded-md font-semibold text-erro hover:bg-erro-suave"
                >
                  Sim
                </button>
                <button type="button" onClick={() => setConfirmando(null)} className="min-h-9 px-2 rounded-md text-texto-2 hover:bg-black/5">
                  Não
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(item)}
                aria-label={`Remover ${item}`}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-md text-texto-3 hover:text-erro hover:bg-erro-suave transition-colors"
              >
                <TrashIcon />
              </button>
            )}
          </li>
        ))}
        {itens.length === 0 && <li className="py-6 text-center text-[14px] text-texto-3">{vazio}</li>}
      </ul>
    </div>
  );
}
