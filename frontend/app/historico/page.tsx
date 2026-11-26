"use client";

import { Fragment, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { buscarApi } from '../../lib/cliente';
import { formatarBRL, formatarData, nomeMes, paraNumero } from '../../lib/moeda';
import Estrutura from '../../components/Estrutura';
import Aviso from '../../components/Aviso';
import Botao, { LinkBotao, Spinner } from '../../components/Botao';
import { ChevronIcon } from '../../components/icons';
import type { Item, Transacao } from '../../types';

type Grupo = { mes: string; total: number; transacoes: Transacao[] };

/** Minúsculas e sem acento, para a busca achar "acougue" em "Açougue". */
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// useSearchParams exige um limite de Suspense para a rota continuar pré-renderizada.
export default function Historico() {
  return (
    <Suspense
      fallback={
        <Estrutura>
          <h1 className="text-[24px] font-semibold tracking-tight">Histórico</h1>
          <p className="mt-6 text-texto-3">Carregando…</p>
        </Estrutura>
      }
    >
      <ConteudoHistorico />
    </Suspense>
  );
}

function ConteudoHistorico() {
  const router = useRouter();
  // ?semFonte=1 (link do dashboard): mostra só as compras sem fonte pagadora.
  const soSemFonte = useSearchParams().get('semFonte') === '1';
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [usuarioAtual, setUsuarioAtual] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [expandidoId, setExpandidoId] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  const [listaAgentes, setListaAgentes] = useState<string[]>([]);

  useEffect(() => {
    buscarApi('/api/agentes')
      .then((res) => res.json())
      .then((data) => data.sucesso && setListaAgentes(data.agentes))
      .catch(() => {});

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

  const semFonte = transacoes.filter((t) => !t.agenteOrigem).length;

  const termo = normalizar(busca.trim());
  const grupos = useMemo(() => {
    const porMes = new Map<string, Grupo>();
    for (const t of transacoes) {
      if (soSemFonte && t.agenteOrigem) continue;
      // Busca pelo estabelecimento ou por qualquer item da compra.
      if (termo && !normalizar(t.estabelecimento).includes(termo) && !t.items.some((i) => normalizar(i.descricao).includes(termo))) continue;
      const mes = t.dataEmissao.substring(0, 7);
      const g = porMes.get(mes) ?? { mes, total: 0, transacoes: [] };
      g.total += paraNumero(t.valorTotal);
      g.transacoes.push(t);
      porMes.set(mes, g);
    }
    return Array.from(porMes.values());
  }, [transacoes, soSemFonte, termo]);

  const encontradas = grupos.reduce((n, g) => n + g.transacoes.length, 0);

  const pendentes = transacoes.filter((t) => t.items?.some((i) => i.categoria === '')).length;
  const alternar = (id: number) => setExpandidoId(expandidoId === id ? null : id);

  const mostrarTodas = () => router.replace('/historico');

  const aoSalvarFonte = (atualizada: Transacao) =>
    setTransacoes((lista) => lista.map((t) => (t.id === atualizada.id ? atualizada : t)));

  /** "Registrado por" só interessa quando foi outra pessoa. */
  const detalhes = (t: Transacao) =>
    [t.agenteOrigem || 'sem fonte pagadora', t.usuario && t.usuario !== usuarioAtual ? `por ${t.usuario}` : ''].filter(Boolean).join(' · ');

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
        <>
        <div className="mt-6 md:max-w-md">
          <label htmlFor="busca" className="sr-only">Buscar compras</label>
          <input
            id="busca"
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por estabelecimento ou item"
            className="w-full min-h-11 rounded-lg border border-linha-forte bg-superficie px-3 text-[15px] outline-none focus:border-acao"
          />
          {termo && (
            <p role="status" className="mt-2 text-[14px] text-texto-3">
              {encontradas === 0
                ? `Nenhuma compra encontrada para “${busca.trim()}”.`
                : `${encontradas} ${encontradas === 1 ? 'compra encontrada' : 'compras encontradas'}.`}
            </p>
          )}
        </div>
        {soSemFonte && (
          <Aviso tipo={semFonte > 0 ? 'alerta' : 'sucesso'} className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span>
              {semFonte > 0
                ? `${semFonte} ${semFonte === 1 ? 'compra' : 'compras'} sem fonte pagadora. Abra cada uma para definir.`
                : 'Todas as compras têm fonte pagadora.'}
            </span>
            <button type="button" onClick={mostrarTodas} className="font-semibold underline underline-offset-2">
              Mostrar todas
            </button>
          </Aviso>
        )}
        {grupos.map((g) => (
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
                          <EditarFonte transacao={t} agentes={listaAgentes} aoSalvar={aoSalvarFonte} />
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
                      <EditarFonte transacao={t} agentes={listaAgentes} aoSalvar={aoSalvarFonte} />
                      <TabelaItens itens={t.items} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
        </>
      )}
    </Estrutura>
  );
}

const campo = 'min-h-11 rounded-lg border border-linha-forte bg-superficie pl-3 pr-9 text-[15px] outline-none focus:border-acao appearance-none';

function EditarFonte({ transacao, agentes, aoSalvar }: { transacao: Transacao; agentes: string[]; aoSalvar: (t: Transacao) => void }) {
  const [escolhida, setEscolhida] = useState(transacao.agenteOrigem);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const idCampo = `fonte-${transacao.id}`;

  const salvar = async () => {
    setSalvando(true);
    setErro('');
    const atualizada = { ...transacao, agenteOrigem: escolhida };
    try {
      // O PUT substitui a transação inteira (itens ausentes seriam apagados), então vai tudo.
      const res = await buscarApi('/api/transacoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(atualizada),
      });
      if (res.ok) {
        aoSalvar(atualizada);
      } else {
        const data = await res.json().catch(() => null);
        setErro(data?.erro || 'Não foi possível salvar.');
      }
    } catch {
      setErro('Erro de conexão.');
    } finally {
      setSalvando(false);
    }
  };

  // Fonte cadastrada antes e depois excluída continua aparecendo como opção atual.
  const opcoes = transacao.agenteOrigem && !agentes.includes(transacao.agenteOrigem) ? [transacao.agenteOrigem, ...agentes] : agentes;

  return (
    <div className="mb-3">
      <label htmlFor={idCampo} className="block text-[13px] text-texto-3">Pago com</label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <div className="relative">
          <select id={idCampo} value={escolhida} onChange={(e) => setEscolhida(e.target.value)} className={campo}>
            <option value="">Sem fonte pagadora</option>
            {opcoes.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
          </select>
          <ChevronIcon className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-texto-3" />
        </div>
        {escolhida !== transacao.agenteOrigem && (
          <Botao onClick={salvar} disabled={salvando}>
            {salvando ? <><Spinner /> Salvando…</> : 'Salvar'}
          </Botao>
        )}
      </div>
      {agentes.length === 0 && (
        <p className="mt-1 text-[13px] text-texto-3">
          Nenhuma fonte pagadora cadastrada. <a href="/agentes" className="text-acao underline underline-offset-2">Cadastrar</a>
        </p>
      )}
      {erro && <p role="alert" className="mt-1 text-[13px] text-erro">{erro}</p>}
    </div>
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
