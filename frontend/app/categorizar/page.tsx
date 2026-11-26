"use client";

import { useState, useEffect } from 'react';
import { buscarApi } from '../../lib/cliente';
import { formatarBRL, formatarData } from '../../lib/moeda';
import Estrutura from '../../components/Estrutura';
import Aviso from '../../components/Aviso';
import Botao, { LinkBotao, Spinner } from '../../components/Botao';
import { BackIcon, ChevronIcon, SparkleIcon } from '../../components/icons';
import type { Item, SugestaoItem, Transacao } from '../../types';
import SugestoesNovas, { type SugestaoNova } from './SugestoesNovas';

const semCategoria = (t: Transacao) => t.items.filter((i) => i.categoria === '').length;

export default function CategorizarProdutos() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [transacaoAtiva, setTransacaoAtiva] = useState<Transacao | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState('');
  const [categorias, setCategorias] = useState<string[]>([]);

  const [isCategorizando, setIsCategorizando] = useState(false);
  const [mensagemIA, setMensagemIA] = useState('');
  const [tempoIA, setTempoIA] = useState(0);
  const [statusIA, setStatusIA] = useState<'idle' | 'sucesso' | 'erro'>('idle');
  const [mensagemStatus, setMensagemStatus] = useState('');
  const [isSalvando, setIsSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState('');
  // Categorias novas propostas pela IA para os itens da nota aberta (id do item → sugestão).
  const [novas, setNovas] = useState<Record<number, { nome: string; motivo: string }>>({});

  const carregarTransacoes = () => {
    buscarApi('/api/transacoes')
      .then(res => res.json())
      .then(data => {
        if (data.sucesso) {
          setTransacoes(data.transacoes.filter((t: Transacao) => t.items?.some((i) => i.categoria === '')));
        } else {
          setErroCarregar(data.erro || 'Não foi possível carregar as pendências.');
        }
      })
      .catch(() => setErroCarregar('Erro de conexão.'))
      .finally(() => setIsLoading(false));
  };

  // Categorias do usuário logado (as mesmas que a IA recebe no prompt)
  const carregarCategorias = () => {
    buscarApi('/api/categorias')
      .then(res => res.json())
      .then(data => { if (data.sucesso) setCategorias(data.categorias); })
      .catch(() => {});
  };

  useEffect(() => {
    carregarTransacoes();
    carregarCategorias();
  }, []);

  // Cronômetro enquanto a IA trabalha
  useEffect(() => {
    if (!isCategorizando) return;
    const intervalo = setInterval(() => setTempoIA(s => s + 1), 1000);
    return () => { clearInterval(intervalo); setTempoIA(0); };
  }, [isCategorizando]);

  const abrir = (t: Transacao | null) => {
    setTransacaoAtiva(t);
    setStatusIA('idle');
    setMensagemStatus('');
    setErroSalvar('');
    setNovas({});
    window.scrollTo({ top: 0 });
  };

  const categorizarComIA = async () => {
    if (!transacaoAtiva) return;
    setIsCategorizando(true);
    setStatusIA('idle');
    setMensagemIA('Conectando à IA…');

    const tempoInicio = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // falha rápida em 35s

    const t1 = setTimeout(() => setMensagemIA('Analisando os itens…'), 3000);
    const t2 = setTimeout(() => setMensagemIA('Escolhendo as categorias…'), 7000);

    try {
      const itensSimplificados = transacaoAtiva.items.map((i: Item) => ({ id: i.id, descricao: i.descricao }));

      const res = await buscarApi('/api/categorizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: itensSimplificados }),
        signal: controller.signal
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.erro || data?.error || 'Erro na inteligência artificial.');

      if (data.sucesso) {
        const resultado: SugestaoItem[] = data.resultado;
        const itensAtualizados = transacaoAtiva.items.map((itemAntigo) => {
          const sugestao = resultado.find((r) => r.id === itemAntigo.id);
          return sugestao?.categoria ? { ...itemAntigo, categoria: sugestao.categoria } : itemAntigo;
        });
        setTransacaoAtiva({ ...transacaoAtiva, items: itensAtualizados });
        const propostas: Record<number, { nome: string; motivo: string }> = {};
        for (const r of resultado) {
          if (r.novaCategoria) propostas[r.id] = { nome: r.novaCategoria, motivo: r.motivo ?? '' };
        }
        setNovas(propostas);

        const seg = Math.floor((Date.now() - tempoInicio) / 1000);
        setStatusIA('sucesso');
        setMensagemStatus(`Sugestões aplicadas em ${seg}s. Confira antes de salvar.`);
      }
    } catch (error) {
      setStatusIA('erro');
      const e = error as Error;
      setMensagemStatus(e.name === 'AbortError' ? 'A IA demorou mais de 35s. Tente de novo.' : (e.message || 'Erro na inteligência artificial.'));
    } finally {
      clearTimeout(timeoutId); clearTimeout(t1); clearTimeout(t2);
      setIsCategorizando(false);
    }
  };

  const atualizarCategoriaItem = (idItem: number, novaCat: string) => {
    if (!transacaoAtiva) return;
    setTransacaoAtiva({
      ...transacaoAtiva,
      items: transacaoAtiva.items.map((i) => (i.id === idItem ? { ...i, categoria: novaCat } : i)),
    });
  };

  const salvarTransacaoCategorizada = async () => {
    if (!transacaoAtiva || semCategoria(transacaoAtiva) > 0) return;
    setIsSalvando(true);
    setErroSalvar('');
    try {
      const res = await buscarApi('/api/transacoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transacaoAtiva)
      });
      if (res.ok) {
        abrir(null);
        carregarTransacoes(); // o que foi salvo sai da lista
      } else {
        const data = await res.json().catch(() => null);
        setErroSalvar(data?.erro || 'Não foi possível salvar.');
      }
    } catch {
      setErroSalvar('Erro de conexão.');
    } finally {
      setIsSalvando(false);
    }
  };

  /** Sugestões de categoria nova da nota aberta, agrupadas por nome. */
  const sugestoesNovas: SugestaoNova[] = (() => {
    if (!transacaoAtiva) return [];
    const porNome = new Map<string, SugestaoNova>();
    for (const item of transacaoAtiva.items) {
      const n = novas[item.id];
      if (!n) continue;
      const grupo = porNome.get(n.nome) ?? { nome: n.nome, motivo: n.motivo, itens: [] };
      grupo.itens.push({ id: item.id, descricao: item.descricao });
      porNome.set(n.nome, grupo);
    }
    return [...porNome.values()];
  })();

  const esquecerSugestao = (nome: string) =>
    setNovas((atuais) => Object.fromEntries(Object.entries(atuais).filter(([, n]) => n.nome !== nome)));

  // Categoria aceita e criada: entra na lista e passa a valer para os itens que a IA indicou.
  const usarCategoriaNova = (nome: string) => {
    setCategorias((atuais) => (atuais.includes(nome) ? atuais : [...atuais, nome]));
    if (transacaoAtiva) {
      setTransacaoAtiva({
        ...transacaoAtiva,
        items: transacaoAtiva.items.map((i) => (novas[i.id]?.nome === nome ? { ...i, categoria: nome } : i)),
      });
    }
    esquecerSugestao(nome);
  };

  // ── Detalhe de uma nota ──
  if (transacaoAtiva) {
    const total = transacaoAtiva.items.length;
    const feitos = total - semCategoria(transacaoAtiva);
    const completo = feitos === total;

    return (
      <Estrutura semNavInferior pendentes={transacoes.length}>
        <div className="pb-24 md:pb-0">
          <button
            type="button"
            onClick={() => abrir(null)}
            className="-ml-2 inline-flex items-center gap-1.5 min-h-11 px-2 rounded-lg text-[15px] text-texto-2 hover:bg-black/5"
          >
            <BackIcon /> Pendências
          </button>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
            <div className="min-w-0">
              <h1 className="text-[22px] md:text-[24px] font-semibold tracking-tight">{transacaoAtiva.estabelecimento || 'Estabelecimento desconhecido'}</h1>
              <p className="text-[14px] text-texto-3 tabular-nums">{formatarData(transacaoAtiva.dataEmissao)} · {formatarBRL(transacaoAtiva.valorTotal)}</p>
            </div>
          </div>

          {/* Progresso (efeito do gradiente de meta) */}
          <div className="mt-6">
            <div className="flex items-baseline justify-between text-[14px]">
              <span className="text-texto-2"><span className="font-semibold text-texto tabular-nums">{feitos} de {total}</span> itens categorizados</span>
              {completo && <span className="text-sucesso font-medium">Pronto para salvar</span>}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-linha" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={feitos} aria-label="Itens categorizados">
              <div className={`h-1.5 rounded-full transition-all ${completo ? 'bg-sucesso' : 'bg-acao'}`} style={{ width: `${total ? (feitos / total) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Botao variante="secundario" onClick={categorizarComIA} disabled={isCategorizando}>
              {isCategorizando ? <Spinner /> : <SparkleIcon />}
              {statusIA === 'sucesso' ? 'Sugerir de novo com IA' : 'Sugerir categorias com IA'}
            </Botao>
            {isCategorizando && (
              <span role="status" className="text-[14px] text-texto-3">
                {mensagemIA} <span className="tabular-nums">{tempoIA}s</span>
              </span>
            )}
            {!isCategorizando && statusIA === 'sucesso' && <span role="status" className="text-[14px] text-sucesso">{mensagemStatus}</span>}
          </div>
          {!isCategorizando && statusIA === 'erro' && <Aviso tipo="erro" className="mt-3">{mensagemStatus}</Aviso>}

          <SugestoesNovas sugestoes={sugestoesNovas} aoCriar={usarCategoriaNova} aoIgnorar={esquecerSugestao} />

          <ul className="mt-6 divide-y divide-linha border-t border-linha-forte">
            {transacaoAtiva.items.map((item) => {
              const pendente = item.categoria === '';
              return (
                <li key={item.id} className="py-3 grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_7rem_16rem] gap-x-4 gap-y-2 items-center">
                  <span className="text-[15px] min-w-0">{item.descricao}</span>
                  <span className="valor text-[15px]">{formatarBRL(item.vlTotal)}</span>
                  <div className="relative col-span-2 md:col-span-1">
                    <select
                      value={item.categoria}
                      onChange={e => atualizarCategoriaItem(item.id, e.target.value)}
                      aria-label={`Categoria de ${item.descricao}`}
                      className={`w-full min-h-11 rounded-lg border bg-superficie px-3 pr-9 text-[15px] appearance-none outline-none focus:border-acao ${
                        pendente ? 'border-alerta text-texto-3' : 'border-linha-forte text-texto'
                      }`}
                    >
                      <option disabled value="">Escolher categoria…</option>
                      {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronIcon className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-texto-3" />
                  </div>
                </li>
              );
            })}
          </ul>

          {erroSalvar && <Aviso tipo="erro" className="mt-6">{erroSalvar}</Aviso>}

          <div className="fixed md:static bottom-0 inset-x-0 z-20 bg-superficie md:bg-transparent border-t md:border-0 border-linha px-4 pt-3 pb-seguro md:p-0 md:mt-8 md:flex md:justify-end">
            <Botao onClick={salvarTransacaoCategorizada} disabled={isSalvando || !completo} className="w-full md:w-auto min-h-12 md:px-8">
              {isSalvando ? <><Spinner /> Salvando…</> : completo ? 'Salvar categorias' : `Faltam ${total - feitos} ${total - feitos === 1 ? 'item' : 'itens'}`}
            </Botao>
          </div>
        </div>
      </Estrutura>
    );
  }

  // ── Lista de pendências ──
  return (
    <Estrutura pendentes={transacoes.length}>
      <h1 className="text-[24px] font-semibold tracking-tight">Categorizar</h1>
      <p className="mt-1 text-texto-2">Notas com itens que ainda não têm categoria.</p>

      {isLoading ? (
        <p className="mt-6 text-texto-3">Carregando…</p>
      ) : erroCarregar ? (
        <Aviso tipo="erro" className="mt-6">{erroCarregar}</Aviso>
      ) : transacoes.length === 0 ? (
        <div className="mt-8">
          <p className="text-[17px] font-semibold">Tudo categorizado.</p>
          <p className="mt-1 text-texto-2">Quando você registrar uma nova compra, os itens aparecem aqui.</p>
          <LinkBotao href="/nova-transacao" variante="secundario" className="mt-4">Registrar compra</LinkBotao>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-linha border-y border-linha md:max-w-3xl">
          {transacoes.map((t) => {
            const qtd = semCategoria(t);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => abrir(t)}
                  className="w-full py-3.5 text-left grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 items-baseline group"
                >
                  <span className="text-[15px] truncate group-hover:underline underline-offset-2">{t.estabelecimento || 'Estabelecimento desconhecido'}</span>
                  <span className="valor text-[15px] font-medium">{formatarBRL(t.valorTotal)}</span>
                  <span className="text-[13px] text-texto-3 truncate">
                    {formatarData(t.dataEmissao)}{t.agenteOrigem && ` · ${t.agenteOrigem}`}
                  </span>
                  <span className="text-[13px] text-alerta text-right tabular-nums">
                    {qtd} {qtd === 1 ? 'item pendente' : 'itens pendentes'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Estrutura>
  );
}
