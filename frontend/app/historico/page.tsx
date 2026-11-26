"use client";

import { Fragment, useEffect, useMemo, useState } from 'react';
import { buscarApi } from '../../lib/cliente';
import { formatarBRL, formatarData, nomeMes, paraNumero } from '../../lib/moeda';
import Estrutura from '../../components/Estrutura';
import Aviso from '../../components/Aviso';
import { LinkBotao } from '../../components/Botao';
import { ChevronIcon } from '../../components/icons';
import type { Item, Transacao } from '../../types';

type Grupo = { mes: string; total: number; transacoes: Transacao[] };

export default function Historico() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [usuarioAtual, setUsuarioAtual] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [expandidoId, setExpandidoId] = useState<number | null>(null);

  useEffect(() => {
    buscarApi('/api/transacoes')
      .then((res) => res.json())
      .then((data) => {
        if (!data.sucesso) {
          setErro(data.erro || 'Não foi possível carregar o histórico.');
          return;
        }
        const ordenadas = [...data.transacoes].sort((a: Transacao, b: Transacao) =>
          (b.dataEmissao + b.horaEmissao).localeCompare(a.dataEmissao + a.horaEmissao),
        );
        setTransacoes(ordenadas);
      })
      .catch(() => setErro('Erro de conexão.'))
      .finally(() => setIsLoading(false));

    buscarApi('/api/auth/sessao')
      .then((res) => res.json())
      .then((data) => data.sucesso && setUsuarioAtual(data.usuario.nome))
      .catch(() => {});
  }, []);

  const grupos = useMemo(() => {
    const porMes = new Map<string, Grupo>();
    for (const t of transacoes) {
      const mes = t.dataEmissao.substring(0, 7);
      const g = porMes.get(mes) ?? { mes, total: 0, transacoes: [] };
      g.total += paraNumero(t.valorTotal);
      g.transacoes.push(t);
      porMes.set(mes, g);
    }
    return Array.from(porMes.values());
  }, [transacoes]);

  const pendentes = transacoes.filter((t) => t.items?.some((i) => i.categoria === '')).length;
  const alternar = (id: number) => setExpandidoId(expandidoId === id ? null : id);

  /** "Registrado por" só interessa quando foi outra pessoa. */
  const detalhes = (t: Transacao) =>
    [t.agenteOrigem, t.usuario && t.usuario !== usuarioAtual ? `por ${t.usuario}` : ''].filter(Boolean).join(' · ');

  return (
    <Estrutura pendentes={pendentes}>
      <h1 className="text-[24px] font-semibold tracking-tight">Histórico</h1>

      {isLoading ? (
        <p className="mt-6 text-texto-3">Carregando…</p>
      ) : erro ? (
        <Aviso tipo="erro" className="mt-6">{erro}</Aviso>
      ) : transacoes.length === 0 ? (
        <div className="mt-6">
          <p className="text-texto-2">Nenhuma compra registrada ainda.</p>
          <LinkBotao href="/nova-transacao" className="mt-4">Registrar compra</LinkBotao>
        </div>
      ) : (
        grupos.map((g) => (
          <section key={g.mes} aria-labelledby={`mes-${g.mes}`} className="mt-8">
            <div className="flex items-baseline justify-between gap-4 pb-2 border-b border-linha-forte">
              <h2 id={`mes-${g.mes}`} className="text-[15px] font-semibold first-letter:uppercase">{nomeMes(g.mes)}</h2>
              <span className="valor text-[15px] font-semibold">{formatarBRL(g.total)}</span>
            </div>

            {/* Desktop: tabela */}
            <table className="hidden md:table w-full text-[15px]">
              <thead className="sr-only">
                <tr><th>Data</th><th>Estabelecimento</th><th>Pago com</th><th>Valor</th><th></th></tr>
              </thead>
              <tbody>
                {g.transacoes.map((t) => (
                  <Fragment key={t.id}>
                    <tr
                      onClick={() => alternar(t.id)}
                      className="border-b border-linha cursor-pointer hover:bg-black/[0.02]"
                    >
                      <td className="py-3 pr-4 w-28 text-texto-2 tabular-nums">{formatarData(t.dataEmissao)}</td>
                      <td className="py-3 pr-4">
                        <button
                          type="button"
                          aria-expanded={expandidoId === t.id}
                          onClick={(e) => { e.stopPropagation(); alternar(t.id); }}
                          className="text-left hover:underline underline-offset-2"
                        >
                          {t.estabelecimento || 'Estabelecimento desconhecido'}
                        </button>
                      </td>
                      <td className="py-3 pr-4 text-texto-3">{detalhes(t)}</td>
                      <td className="py-3 valor font-medium">{formatarBRL(t.valorTotal)}</td>
                      <td className="py-3 pl-2 w-8 text-texto-3">
                        <ChevronIcon className={`transition-transform ${expandidoId === t.id ? 'rotate-180' : ''}`} />
                      </td>
                    </tr>
                    {expandidoId === t.id && (
                      <tr className="border-b border-linha">
                        <td></td>
                        <td colSpan={4} className="pb-4 pt-1">
                          <TabelaItens itens={t.items} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>

            {/* Mobile: lista */}
            <ul className="md:hidden divide-y divide-linha">
              {g.transacoes.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => alternar(t.id)}
                    aria-expanded={expandidoId === t.id}
                    className="w-full py-3 text-left"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-[15px] truncate">{t.estabelecimento || 'Estabelecimento desconhecido'}</span>
                      <span className="valor text-[15px] font-medium">{formatarBRL(t.valorTotal)}</span>
                    </span>
                    <span className="block text-[13px] text-texto-3 truncate">
                      {formatarData(t.dataEmissao)}{detalhes(t) && ` · ${detalhes(t)}`}
                    </span>
                  </button>
                  {expandidoId === t.id && (
                    <div className="pb-4">
                      <TabelaItens itens={t.items} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Estrutura>
  );
}

function TabelaItens({ itens }: { itens: Item[] }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-black/[0.03] px-3">
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-[13px] text-texto-3 text-left">
            <th className="py-2 pr-3 font-medium">Item</th>
            <th className="py-2 pr-3 font-medium hidden sm:table-cell">Categoria</th>
            <th className="py-2 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-linha">
          {itens.map((item) => (
            <tr key={item.id}>
              <td className="py-2 pr-3">
                <span className="block">{item.descricao}</span>
                <span className="block text-[13px] text-texto-3 tabular-nums">
                  {item.qtd} {item.un} × {formatarBRL(item.vlUnit)}
                  <span className="sm:hidden">{item.categoria ? ` · ${item.categoria}` : ''}</span>
                </span>
              </td>
              <td className="py-2 pr-3 hidden sm:table-cell text-texto-2">
                {item.categoria || <span className="text-alerta">Sem categoria</span>}
              </td>
              <td className="py-2 valor align-top">{formatarBRL(item.vlTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
