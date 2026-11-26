"use client";

import { useEffect, useState } from 'react';

import { BackIcon, ChevronIcon, CloseIcon } from '../../components/icons';
import { buscarApi } from '../../lib/cliente';
import { centavosParaBR, formatarBRL, paraCentavos } from '../../lib/moeda';
import Aviso from '../../components/Aviso';
import Botao, { Spinner } from '../../components/Botao';

type Linha = { chave: number; descricao: string; valor: string; categoria: string };
type ErrosLinha = { descricao?: string; valor?: string };

const campo = 'w-full min-h-11 rounded-lg border border-linha-forte bg-superficie px-3 text-[15px] outline-none focus:border-acao';
const rotulo = 'block text-[13px] font-medium text-texto-2 mb-1.5';

let proximaChave = 1;
const novaLinha = (): Linha => ({ chave: proximaChave++, descricao: '', valor: '', categoria: '' });

/** Data local de hoje em AAAA-MM-DD (toISOString usaria UTC e poderia virar o dia). */
const hoje = () => new Date().toLocaleDateString('sv-SE');

type Props = {
  listaAgentes: string[];
  agentesCarregados: boolean;
  aoVoltar: () => void;
  aoSalvar: () => void;
};

/**
 * Gasto sem nota fiscal (aluguel, contas de consumo, condomínio, doações…): o usuário digita
 * tudo. Itens com categoria escolhida aqui já saem categorizados e não passam pela IA.
 */
export default function FormularioManual({ listaAgentes, agentesCarregados, aoVoltar, aoSalvar }: Props) {
  const [favorecido, setFavorecido] = useState('');
  const [data, setData] = useState(hoje);
  const [agenteOrigem, setAgenteOrigem] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>(() => [novaLinha()]);
  const [listaCategorias, setListaCategorias] = useState<string[]>([]);

  const [erros, setErros] = useState<Record<number, ErrosLinha>>({});
  const [erroData, setErroData] = useState(false);
  const [erroSalvar, setErroSalvar] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    buscarApi('/api/categorias')
      .then((res) => res.json())
      .then((d) => d.sucesso && setListaCategorias(d.categorias))
      .catch(() => {});
  }, []);

  // Mesma regra da nota escaneada: com uma única fonte pagadora, ela já vem selecionada.
  const agenteEscolhido = agenteOrigem ?? (listaAgentes.length === 1 ? listaAgentes[0] : '');

  const total = linhas.reduce((soma, l) => soma + (paraCentavos(l.valor) ?? 0), 0);

  const alterarLinha = (chave: number, mudanca: Partial<Linha>) => {
    setLinhas((atuais) => atuais.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)));
    // Limpa o erro do campo que o usuário acabou de corrigir.
    setErros((atuais) => {
      if (!atuais[chave]) return atuais;
      const campos = { ...atuais[chave] };
      if ('descricao' in mudanca) delete campos.descricao;
      if ('valor' in mudanca) delete campos.valor;
      return { ...atuais, [chave]: campos };
    });
  };

  const removerLinha = (chave: number) => setLinhas((atuais) => atuais.filter((l) => l.chave !== chave));

  const validar = () => {
    const novos: Record<number, ErrosLinha> = {};
    for (const l of linhas) {
      const e: ErrosLinha = {};
      if (!l.descricao.trim()) e.descricao = 'Descreva o gasto.';
      const centavos = paraCentavos(l.valor);
      if (!l.valor.trim()) e.valor = 'Informe o valor.';
      else if (centavos === null) e.valor = 'Use o formato 1500,00.';
      else if (centavos === 0) e.valor = 'O valor precisa ser maior que zero.';
      if (e.descricao || e.valor) novos[l.chave] = e;
    }
    setErros(novos);
    setErroData(!data);
    return Object.keys(novos).length === 0 && !!data;
  };

  const salvar = async () => {
    if (!validar()) return;
    setIsSaving(true);
    setErroSalvar('');

    const items = linhas.map((l) => {
      const valor = centavosParaBR(paraCentavos(l.valor)!);
      return { codigo: '', descricao: l.descricao.trim(), qtd: '1', un: 'UN', vlUnit: valor, vlTotal: valor, categoria: l.categoria };
    });
    const payload = {
      chaveAcesso: '',
      valorTotal: centavosParaBR(total),
      desconto: '0,00',
      // Sem favorecido, o próprio gasto ("Aluguel") identifica a compra nas listas.
      estabelecimento: favorecido.trim() || items[0].descricao,
      dataEmissao: data,
      horaEmissao: '',
      agenteOrigem: agenteEscolhido,
      items,
    };

    try {
      const res = await buscarApi('/api/transacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        aoSalvar();
        return;
      }
      const d = await res.json().catch(() => null);
      setErroSalvar(d?.erro || 'Não foi possível salvar o gasto.');
    } catch {
      setErroSalvar('Erro de conexão.');
    }
    setIsSaving(false);
  };

  return (
    <div className="pb-24 md:pb-0 max-w-2xl">
      <button
        type="button"
        onClick={aoVoltar}
        className="-ml-2 inline-flex items-center gap-1.5 min-h-11 px-2 rounded-lg text-[15px] text-texto-2 hover:bg-black/5"
      >
        <BackIcon /> Voltar
      </button>
      <h1 className="mt-2 text-[24px] font-semibold tracking-tight">Registrar gasto manualmente</h1>
      <p className="mt-1 text-texto-2">Para gastos sem nota fiscal: aluguel, água, luz, condomínio, doações…</p>

      <div className="mt-8 grid sm:grid-cols-2 gap-x-4 gap-y-5">
        <div className="sm:col-span-2">
          <label htmlFor="favorecido" className={rotulo}>Pago a <span className="font-normal text-texto-3">(opcional)</span></label>
          <input
            id="favorecido"
            value={favorecido}
            onChange={(e) => setFavorecido(e.target.value)}
            placeholder="Ex.: Imobiliária, companhia de água"
            className={campo}
          />
        </div>

        <div>
          <label htmlFor="data" className={rotulo}>Data</label>
          <input
            id="data"
            type="date"
            value={data}
            onChange={(e) => { setData(e.target.value); setErroData(false); }}
            aria-invalid={erroData}
            className={`${campo} ${erroData ? 'border-erro' : ''}`}
          />
          {erroData && <p role="alert" className="mt-1.5 text-[13px] text-erro">Informe a data do gasto.</p>}
        </div>

        <div>
          <label htmlFor="agente-manual" className={rotulo}>Pago com</label>
          <div className="relative">
            <select
              id="agente-manual"
              value={agenteEscolhido}
              onChange={(e) => setAgenteOrigem(e.target.value)}
              className={`${campo} appearance-none pr-9`}
            >
              <option value="">Definir depois</option>
              {listaAgentes.map((ag) => <option key={ag} value={ag}>{ag}</option>)}
            </select>
            <ChevronIcon className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-texto-3" />
          </div>
          {agentesCarregados && listaAgentes.length === 0 && (
            <p className="mt-1.5 text-[13px] text-texto-3">
              Nenhuma fonte pagadora cadastrada.{' '}
              <a href="/agentes" target="_blank" rel="noopener" className="text-acao underline underline-offset-2">Cadastrar</a>
            </p>
          )}
        </div>
      </div>

      <h2 className="mt-10 text-[15px] font-semibold">{linhas.length === 1 ? 'Gasto' : 'Itens'}</h2>
      <ul className="mt-2 divide-y divide-linha border-y border-linha">
        {linhas.map((l, idx) => {
          const e = erros[l.chave] ?? {};
          const id = (nome: string) => `${nome}-${l.chave}`;
          return (
            <li key={l.chave} className="py-4 grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_9rem_12rem_auto] gap-x-3 gap-y-3 items-start">
              <div className="col-span-1">
                <label htmlFor={id('descricao')} className={rotulo}>Descrição</label>
                <input
                  id={id('descricao')}
                  value={l.descricao}
                  onChange={(ev) => alterarLinha(l.chave, { descricao: ev.target.value })}
                  placeholder={idx === 0 ? 'Ex.: Aluguel de novembro' : ''}
                  aria-invalid={!!e.descricao}
                  className={`${campo} ${e.descricao ? 'border-erro' : ''}`}
                />
                {e.descricao && <p role="alert" className="mt-1.5 text-[13px] text-erro">{e.descricao}</p>}
              </div>

              {/* No celular, o botão de remover fica ao lado da descrição; no desktop, no fim da linha. */}
              <div className="sm:order-last pt-[26px]">
                {linhas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removerLinha(l.chave)}
                    aria-label={`Remover ${l.descricao || `item ${idx + 1}`}`}
                    className="w-11 h-11 flex items-center justify-center rounded-lg text-texto-3 hover:bg-black/5"
                  >
                    <CloseIcon />
                  </button>
                )}
              </div>

              <div className="col-span-2 sm:col-span-1 grid grid-cols-2 sm:contents gap-3">
                <div>
                  <label htmlFor={id('valor')} className={rotulo}>Valor (R$)</label>
                  <input
                    id={id('valor')}
                    inputMode="decimal"
                    value={l.valor}
                    onChange={(ev) => alterarLinha(l.chave, { valor: ev.target.value })}
                    placeholder="0,00"
                    aria-invalid={!!e.valor}
                    className={`${campo} tabular-nums ${e.valor ? 'border-erro' : ''}`}
                  />
                  {e.valor && <p role="alert" className="mt-1.5 text-[13px] text-erro">{e.valor}</p>}
                </div>

                <div>
                  <label htmlFor={id('categoria')} className={rotulo}>Categoria</label>
                  <div className="relative">
                    <select
                      id={id('categoria')}
                      value={l.categoria}
                      onChange={(ev) => alterarLinha(l.chave, { categoria: ev.target.value })}
                      className={`${campo} appearance-none pr-9`}
                    >
                      <option value="">Categorizar depois</option>
                      {listaCategorias.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronIcon className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-texto-3" />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <Botao variante="discreto" onClick={() => setLinhas((atuais) => [...atuais, novaLinha()])}>
          + Adicionar item
        </Botao>
        <p className="text-[15px]">
          Total <span className="ml-2 text-[22px] font-semibold tabular-nums">{formatarBRL(total / 100)}</span>
        </p>
      </div>

      {erroSalvar && <Aviso tipo="erro" className="mt-6">{erroSalvar}</Aviso>}

      {/* Mobile: rodapé fixo na zona do polegar. Desktop: botão no fim do conteúdo. */}
      <div className="fixed md:static bottom-0 inset-x-0 z-20 bg-superficie md:bg-transparent border-t md:border-0 border-linha px-4 pt-3 pb-seguro md:p-0 md:mt-8 md:flex md:justify-end">
        <Botao onClick={salvar} disabled={isSaving} className="w-full md:w-auto min-h-12 md:px-8">
          {isSaving ? <><Spinner /> Salvando…</> : 'Salvar gasto'}
        </Botao>
      </div>
    </div>
  );
}
