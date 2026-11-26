"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { buscarApi } from '../lib/cliente';
import { formatarBRL, formatarData, nomeMes, paraNumero } from '../lib/moeda';
import Estrutura from '../components/Estrutura';
import Aviso from '../components/Aviso';
import { LinkBotao } from '../components/Botao';
import { ChevronIcon, CloseIcon } from '../components/icons';
import type { Transacao } from '../types';

const MAX_CATEGORIAS = 5;

export default function Dashboard() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [mesSelecionado, setMesSelecionado] = useState('');
  const [categoriaDetalhe, setCategoriaDetalhe] = useState<string | null>(null);

  useEffect(() => {
    buscarApi('/api/transacoes')
      .then((res) => res.json())
      .then((data) => {
        if (!data.sucesso) {
          setErro(data.erro || 'Não foi possível carregar suas compras.');
          return;
        }
        setTransacoes(data.transacoes);
        const hoje = new Date();
        setMesSelecionado(
          data.transacoes.length > 0
            ? data.transacoes[0].dataEmissao.substring(0, 7)
            : `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`,
        );
      })
      .catch(() => setErro('Erro de conexão.'))
      .finally(() => setIsLoading(false));
  }, []);

  const mesesDisponiveis = useMemo(() => {
    const meses = new Set(transacoes.map((t) => t.dataEmissao.substring(0, 7)));
    return Array.from(meses).sort().reverse();
  }, [transacoes]);

  const pendentes = useMemo(
    () => transacoes.filter((t) => t.items?.some((i) => i.categoria === '')).length,
    [transacoes],
  );

  const semFonte = useMemo(() => transacoes.filter((t) => !t.agenteOrigem).length, [transacoes]);

  const { totalMes, qtdCompras, categorias, semCategoria } = useMemo(() => {
    let total = 0;
    let compras = 0;
    let semCat = 0;
    const soma: Record<string, number> = {};
    for (const t of transacoes) {
      if (!t.dataEmissao.startsWith(mesSelecionado)) continue;
      compras++;
      total += paraNumero(t.valorTotal);
      for (const item of t.items ?? []) {
        if (item.categoria) soma[item.categoria] = (soma[item.categoria] || 0) + paraNumero(item.vlTotal);
        else semCat += paraNumero(item.vlTotal);
      }
    }
    const ordenadas = Object.entries(soma)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
    return { totalMes: total, qtdCompras: compras, categorias: ordenadas, semCategoria: semCat };
  }, [transacoes, mesSelecionado]);

  const maiorCategoria = categorias[0]?.valor || 1;
  const visiveis = categorias.slice(0, MAX_CATEGORIAS);
  const restante = categorias.slice(MAX_CATEGORIAS).reduce((s, c) => s + c.valor, 0);

  const itensDetalhados = useMemo(() => {
    if (!categoriaDetalhe) return [];
    return transacoes
      .filter((t) => t.dataEmissao.startsWith(mesSelecionado))
      .flatMap((t) =>
        (t.items ?? [])
          .filter((i) => i.categoria === categoriaDetalhe)
          .map((i) => ({ chave: `${t.id}-${i.id}`, descricao: i.descricao, valor: paraNumero(i.vlTotal), data: t.dataEmissao, estabelecimento: t.estabelecimento })),
      )
      .sort((a, b) => b.valor - a.valor);
  }, [transacoes, mesSelecionado, categoriaDetalhe]);

  const totalDetalhe = itensDetalhados.reduce((s, i) => s + i.valor, 0);

  useEffect(() => {
    if (!categoriaDetalhe) return;
    const fechar = (e: KeyboardEvent) => e.key === 'Escape' && setCategoriaDetalhe(null);
    document.addEventListener('keydown', fechar);
    return () => document.removeEventListener('keydown', fechar);
  }, [categoriaDetalhe]);

  if (isLoading) {
    return (
      <Estrutura>
        <p className="text-texto-3">Carregando…</p>
      </Estrutura>
    );
  }

  if (erro) {
    return (
      <Estrutura>
        <Aviso tipo="erro">{erro}</Aviso>
      </Estrutura>
    );
  }

  // Conta nova: em vez de "R$ 0,00", uma única ação clara.
  if (transacoes.length === 0) {
    return (
      <Estrutura>
        <div className="max-w-md py-10 md:py-16">
          <h1 className="text-[24px] font-semibold tracking-tight">Nenhuma compra registrada ainda</h1>
          <p className="mt-2 text-texto-2">
            Escaneie o QR Code de uma nota fiscal (NFC-e) e o FinScan lê os itens para você.
          </p>
          <LinkBotao href="/nova-transacao" className="mt-6 min-h-12 px-6">Registrar primeira compra</LinkBotao>
        </div>
      </Estrutura>
    );
  }

  return (
    <Estrutura pendentes={pendentes}>
      <section aria-labelledby="titulo-mes">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 id="titulo-mes" className="text-[15px] text-texto-2">Gastos em</h1>
          <div className="relative">
            <select
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              aria-label="Mês"
              className="appearance-none bg-transparent pr-6 text-[15px] font-semibold text-texto cursor-pointer outline-none"
            >
              {mesesDisponiveis.map((mes) => (
                <option key={mes} value={mes}>{nomeMes(mes)}</option>
              ))}
            </select>
            <ChevronIcon className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-texto-3" />
          </div>
        </div>
        <p className="mt-1 text-[36px] md:text-[44px] font-semibold tracking-tight tabular-nums leading-tight">{formatarBRL(totalMes)}</p>
        <p className="text-[14px] text-texto-3">
          {qtdCompras} {qtdCompras === 1 ? 'compra' : 'compras'}
        </p>
      </section>

      {pendentes > 0 && (
        <Aviso tipo="alerta" className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <span>
            {pendentes} {pendentes === 1 ? 'nota tem' : 'notas têm'} itens sem categoria.
          </span>
          <Link href="/categorizar" className="font-semibold underline underline-offset-2">Categorizar agora</Link>
        </Aviso>
      )}

      {semFonte > 0 && (
        <Aviso tipo="alerta" className={`${pendentes > 0 ? 'mt-3' : 'mt-6'} flex flex-wrap items-center justify-between gap-x-4 gap-y-1`}>
          <span>
            {semFonte} {semFonte === 1 ? 'compra está' : 'compras estão'} sem fonte pagadora.
          </span>
          <Link href="/historico?semFonte=1" className="font-semibold underline underline-offset-2">Definir agora</Link>
        </Aviso>
      )}

      <section aria-labelledby="titulo-categorias" className="mt-10 md:max-w-2xl">
        <h2 id="titulo-categorias" className="text-[15px] font-semibold">Por categoria</h2>
        {visiveis.length === 0 ? (
          <p className="mt-3 text-[14px] text-texto-3">Nenhum item categorizado neste mês.</p>
        ) : (
          <ul className="mt-2 divide-y divide-linha">
            {visiveis.map((cat) => (
              <li key={cat.nome}>
                <button
                  type="button"
                  onClick={() => setCategoriaDetalhe(cat.nome)}
                  className="w-full py-3 text-left group"
                >
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="text-[15px] group-hover:underline underline-offset-2">{cat.nome}</span>
                    <span className="valor text-[15px] font-medium">{formatarBRL(cat.valor)}</span>
                  </span>
                  <span className="mt-2 block h-1 rounded-full bg-linha">
                    <span className="block h-1 rounded-full bg-texto-2" style={{ width: `${(cat.valor / maiorCategoria) * 100}%` }} />
                  </span>
                </button>
              </li>
            ))}
            {restante > 0 && (
              <li className="py-3 flex justify-between gap-4 text-[14px] text-texto-3">
                <span>Outras {categorias.length - MAX_CATEGORIAS} categorias</span>
                <span className="valor">{formatarBRL(restante)}</span>
              </li>
            )}
            {semCategoria > 0 && (
              <li className="py-3 flex justify-between gap-4 text-[14px] text-texto-3">
                <span>Sem categoria</span>
                <span className="valor">{formatarBRL(semCategoria)}</span>
              </li>
            )}
          </ul>
        )}
        <Link href="/historico" className="mt-4 inline-flex min-h-11 items-center text-[15px] font-medium text-acao hover:underline underline-offset-2">
          Ver todas as compras
        </Link>
      </section>

      {categoriaDetalhe && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 md:p-4"
          onClick={() => setCategoriaDetalhe(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-detalhe"
            onClick={(e) => e.stopPropagation()}
            className="w-full md:max-w-xl max-h-[85vh] flex flex-col bg-superficie rounded-t-xl md:rounded-xl shadow-sm"
          >
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 border-b border-linha">
              <div>
                <h2 id="titulo-detalhe" className="text-[17px] font-semibold">{categoriaDetalhe}</h2>
                <p className="text-[14px] text-texto-3">{nomeMes(mesSelecionado)} · <span className="tabular-nums">{formatarBRL(totalDetalhe)}</span></p>
              </div>
              <button
                type="button"
                onClick={() => setCategoriaDetalhe(null)}
                aria-label="Fechar"
                className="w-10 h-10 -mr-2 flex items-center justify-center rounded-lg text-texto-3 hover:bg-black/5"
              >
                <CloseIcon />
              </button>
            </div>
            <ul className="overflow-y-auto divide-y divide-linha px-5" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              {itensDetalhados.map((item) => (
                <li key={item.chave} className="py-3 flex items-baseline justify-between gap-4">
                  <span className="min-w-0">
                    <span className="block text-[15px] truncate">{item.descricao}</span>
                    <span className="block text-[13px] text-texto-3 truncate">{item.estabelecimento} · {formatarData(item.data)}</span>
                  </span>
                  <span className="valor text-[15px]">{formatarBRL(item.valor)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Estrutura>
  );
}
