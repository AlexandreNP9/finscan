"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { buscarApi } from '../lib/cliente';
import { deslocarMes, formatarBRL, formatarData, nomeMes, paraNumero } from '../lib/moeda';
import Estrutura from '../components/Estrutura';
import Aviso from '../components/Aviso';
import { LinkBotao } from '../components/Botao';
import { ChevronIcon, CloseIcon } from '../components/icons';
import type { Transacao } from '../types';
import EvolucaoMensal, { type PontoMes } from '../components/painel/EvolucaoMensal';
import RankingBarras from '../components/painel/RankingBarras';

const MAX_CATEGORIAS = 5;
const MAX_ESTABELECIMENTOS = 5;
const MESES_EVOLUCAO = 6;
const SEM_FONTE = 'Sem fonte pagadora';

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
            ? // Mês mais recente com compras (a lista vem por ordem de registro, não de data).
              (data.transacoes as Transacao[]).reduce((maior, t) => (t.dataEmissao > maior ? t.dataEmissao : maior), '').substring(0, 7)
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

  // Total e nº de compras de cada mês (para a evolução e a comparação com o mês anterior).
  const resumoPorMes = useMemo(() => {
    const porMes = new Map<string, { total: number; compras: number }>();
    for (const t of transacoes) {
      const mes = t.dataEmissao.substring(0, 7);
      const r = porMes.get(mes) ?? { total: 0, compras: 0 };
      r.total += paraNumero(t.valorTotal);
      r.compras++;
      porMes.set(mes, r);
    }
    return porMes;
  }, [transacoes]);

  // Meses corridos terminando no selecionado (meses sem compra entram com zero).
  const evolucao: PontoMes[] = mesSelecionado
    ? Array.from({ length: MESES_EVOLUCAO }, (_, i) => deslocarMes(mesSelecionado, i - (MESES_EVOLUCAO - 1))).map((mes) => ({
        mes,
        ...(resumoPorMes.get(mes) ?? { total: 0, compras: 0 }),
      }))
    : [];
  const mesAnterior = mesSelecionado ? deslocarMes(mesSelecionado, -1) : '';
  const totalAnterior = resumoPorMes.get(mesAnterior)?.total ?? 0;

  const { totalMes, qtdCompras, categorias, semCategoria, fontes, estabelecimentos, maiorCompra } = useMemo(() => {
    let total = 0;
    let compras = 0;
    let semCat = 0;
    let maior: Transacao | null = null;
    const porCategoria: Record<string, number> = {};
    const porFonte: Record<string, number> = {};
    const porEstabelecimento: Record<string, { valor: number; compras: number }> = {};
    for (const t of transacoes) {
      if (!t.dataEmissao.startsWith(mesSelecionado)) continue;
      const valor = paraNumero(t.valorTotal);
      compras++;
      total += valor;
      if (!maior || valor > paraNumero(maior.valorTotal)) maior = t;
      const fonte = t.agenteOrigem || SEM_FONTE;
      porFonte[fonte] = (porFonte[fonte] || 0) + valor;
      const nomeEst = t.estabelecimento || 'Estabelecimento desconhecido';
      const est = porEstabelecimento[nomeEst] ?? { valor: 0, compras: 0 };
      est.valor += valor;
      est.compras++;
      porEstabelecimento[nomeEst] = est;
      for (const item of t.items ?? []) {
        if (item.categoria) porCategoria[item.categoria] = (porCategoria[item.categoria] || 0) + paraNumero(item.vlTotal);
        else semCat += paraNumero(item.vlTotal);
      }
    }
    const ordenar = (r: Record<string, number>) =>
      Object.entries(r).map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
    return {
      totalMes: total,
      qtdCompras: compras,
      categorias: ordenar(porCategoria),
      semCategoria: semCat,
      fontes: ordenar(porFonte),
      estabelecimentos: Object.entries(porEstabelecimento)
        .map(([nome, e]) => ({ nome, valor: e.valor, compras: e.compras }))
        .sort((a, b) => b.valor - a.valor),
      maiorCompra: maior as Transacao | null,
    };
  }, [transacoes, mesSelecionado]);

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
        <p className="mt-1 text-[36px] md:text-[48px] font-semibold tracking-tight leading-tight">{formatarBRL(totalMes)}</p>
        <Variacao atual={totalMes} anterior={totalAnterior} mesAnterior={mesAnterior} />

        <dl className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 md:max-w-2xl">
          <div>
            <dt className="text-[13px] text-texto-3">Compras</dt>
            <dd className="text-[20px] font-semibold">{qtdCompras}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-texto-3">Gasto médio por compra</dt>
            <dd className="text-[20px] font-semibold">{formatarBRL(qtdCompras ? totalMes / qtdCompras : 0)}</dd>
          </div>
          {maiorCompra && (
            <div className="col-span-2 sm:col-span-1 min-w-0">
              <dt className="text-[13px] text-texto-3">Maior compra</dt>
              <dd className="text-[20px] font-semibold">{formatarBRL(maiorCompra.valorTotal)}</dd>
              <dd className="truncate text-[13px] text-texto-3">
                {maiorCompra.estabelecimento || 'Estabelecimento desconhecido'} · {formatarData(maiorCompra.dataEmissao)}
              </dd>
            </div>
          )}
        </dl>
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

      <div className="mt-10 md:max-w-2xl">
        <EvolucaoMensal
          pontos={evolucao}
          selecionado={mesSelecionado}
          podeSelecionar={(mes) => mesesDisponiveis.includes(mes)}
          aoSelecionar={setMesSelecionado}
        />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-x-12">
        <RankingBarras
          id="titulo-categorias"
          titulo="Por categoria"
          total={totalMes}
          vazio="Nenhum item categorizado neste mês."
          linhas={visiveis.map((c) => ({ ...c, aoClicar: () => setCategoriaDetalhe(c.nome) }))}
          rodape={[
            { nome: `Outras ${categorias.length - MAX_CATEGORIAS} categorias`, valor: restante },
            { nome: 'Sem categoria', valor: semCategoria },
          ]}
        />

        <RankingBarras
          id="titulo-fontes"
          titulo="Por fonte pagadora"
          total={totalMes}
          vazio="Nenhuma compra neste mês."
          linhas={fontes}
        />

        <RankingBarras
          id="titulo-estabelecimentos"
          titulo="Onde você mais gasta"
          total={totalMes}
          vazio="Nenhuma compra neste mês."
          linhas={estabelecimentos.slice(0, MAX_ESTABELECIMENTOS).map((e) => ({
            nome: e.nome,
            valor: e.valor,
            detalhe: `${e.compras} ${e.compras === 1 ? 'compra' : 'compras'}`,
          }))}
        />
      </div>

      <Link href="/historico" className="mt-6 inline-flex min-h-11 items-center text-[15px] font-medium text-acao hover:underline underline-offset-2">
        Ver todas as compras
      </Link>

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

/** "↑ 12% (R$ 120,00 a mais) que em outubro". Neutro: gastar mais não é bom nem ruim por si só. */
function Variacao({ atual, anterior, mesAnterior }: { atual: number; anterior: number; mesAnterior: string }) {
  const nome = nomeMes(mesAnterior).replace(/ de \d{4}$/, '');
  if (anterior <= 0) {
    return <p className="text-[14px] text-texto-3">Sem compras em {nome} para comparar.</p>;
  }
  const diferenca = atual - anterior;
  const pct = Math.round((Math.abs(diferenca) / anterior) * 100);
  if (Math.abs(diferenca) < 0.005) {
    return <p className="text-[14px] text-texto-2">Igual a {nome}.</p>;
  }
  const subiu = diferenca > 0;
  return (
    <p className="text-[14px] text-texto-2">
      <span aria-hidden>{subiu ? '↑' : '↓'} </span>
      <span className="font-medium">{pct}%</span> ({formatarBRL(Math.abs(diferenca))} a {subiu ? 'mais' : 'menos'}) que em {nome}
    </p>
  );
}
