"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';

import type { Item } from '../../types';
import { BackIcon, CameraIcon, ChevronIcon } from '../../components/icons';
import { buscarApi } from '../../lib/cliente';
import { formatarBRL, formatarData } from '../../lib/moeda';
import Estrutura from '../../components/Estrutura';
import Aviso from '../../components/Aviso';
import Botao, { Spinner } from '../../components/Botao';
import FormularioManual from './FormularioManual';
import { podeRegistrarNo, useContexto } from '../../lib/contexto-cliente';

type DadosExtraidos = {
  sucesso?: boolean;
  erro?: string;
  error?: string;
  chave?: string;
  itens: Item[];
  valorTotalNota: string;
  estabelecimento: string;
  emissao?: string;
};

const campo = 'w-full min-h-11 rounded-lg border border-linha-forte bg-superficie px-3 text-[15px] outline-none focus:border-acao';

export default function NovaTransacao() {
  const router = useRouter();
  const dadosContexto = useContexto();
  const [etapa, setEtapa] = useState<1 | 2>(1);
  // Gasto sem nota fiscal: substitui as duas etapas por um formulário único.
  const [modoManual, setModoManual] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isPastingHtml, setIsPastingHtml] = useState(false);
  const [htmlInput, setHtmlInput] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [erroCaptura, setErroCaptura] = useState('');
  const [erroSalvar, setErroSalvar] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dados da transação
  const [items, setItems] = useState<Item[]>([]);
  const [chaveAcesso, setChaveAcesso] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [desconto] = useState('0,00');
  const [estabelecimentoNota, setEstabelecimentoNota] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [horaEmissao, setHoraEmissao] = useState('');
  // null = o usuário ainda não mexeu no campo; '' = escolheu "definir depois".
  const [agenteOrigem, setAgenteOrigem] = useState<string | null>(null);

  const [listaAgentes, setListaAgentes] = useState<string[]>([]);
  const [agentesCarregados, setAgentesCarregados] = useState(false);

  useEffect(() => {
    const carregarAgentes = () => {
      buscarApi('/api/agentes').then(res => res.json()).then(data => {
        if (data.sucesso) setListaAgentes(data.agentes);
        setAgentesCarregados(true);
      }).catch(() => setAgentesCarregados(true));
    };
    carregarAgentes();
    // O aviso de "nenhuma fonte pagadora" abre /agentes em outra aba; ao voltar, a lista é
    // recarregada sem perder a nota já lida nesta tela.
    window.addEventListener('focus', carregarAgentes);
    return () => window.removeEventListener('focus', carregarAgentes);
  }, []);

  // Com uma única fonte pagadora, ela já vem selecionada (até o usuário escolher outra coisa).
  const agenteEscolhido = agenteOrigem ?? (listaAgentes.length === 1 ? listaAgentes[0] : '');

  const falhaCaptura = (mensagem: string) => {
    setErroCaptura(mensagem);
    setIsProcessing(false);
    setIsScanning(false);
  };

  const processarSefazURL = async (urlConsulta: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setErroCaptura('');
    try {
      const res = await buscarApi('/api/sefaz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: urlConsulta }) });
      const data = await res.json();
      aplicarDadosExtraidos(data);
    } catch {
      falhaCaptura('Não foi possível consultar a SEFAZ. Tente de novo ou envie o HTML da nota.');
    }
  };

  const processarHtmlColado = async () => {
    if (htmlInput.length < 50) { setErroCaptura('Cole o código da página ou selecione um arquivo válido.'); return; }
    setIsProcessing(true);
    setErroCaptura('');
    try {
      const res = await buscarApi('/api/sefaz-html', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ htmlBruto: htmlInput }) });
      const data = await res.json();
      aplicarDadosExtraidos(data);
    } catch {
      falhaCaptura('Erro ao processar o texto.');
    }
  };

  const aplicarDadosExtraidos = (data: DadosExtraidos) => {
    if (!data.sucesso) {
      falhaCaptura(data.erro || data.error || 'Não foi possível ler os dados da nota.');
      return;
    }
    if (data.chave) setChaveAcesso(data.chave);
    setItems(data.itens);
    setValorTotal(data.valorTotalNota);
    setEstabelecimentoNota(data.estabelecimento);
    if (data.emissao) {
      const [dataPart, horaPart] = data.emissao.split(' ');
      setDataEmissao(dataPart.split('/').reverse().join('-'));
      setHoraEmissao(horaPart.substring(0, 5));
    }
    setIsScanning(false);
    setIsPastingHtml(false);
    setIsProcessing(false);
    setEtapa(2);
  };

  const limparFormulario = () => {
    setEtapa(1);
    setModoManual(false);
    setIsScanning(false);
    setIsPastingHtml(false);
    setHtmlInput('');
    setNomeArquivo('');
    setIsProcessing(false);
    setIsSaving(false);
    setErroCaptura('');
    setErroSalvar('');
    setItems([]);
    setChaveAcesso('');
    setValorTotal('');
    setEstabelecimentoNota('');
    setDataEmissao('');
    setHoraEmissao('');
    setAgenteOrigem(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const salvarTransacao = async () => {
    setIsSaving(true);
    setErroSalvar('');
    const payload = { chaveAcesso, valorTotal, desconto, estabelecimento: estabelecimentoNota, dataEmissao, horaEmissao, agenteOrigem: agenteEscolhido, items };

    try {
      const res = await buscarApi('/api/transacoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        // Com cacheComponents, o Next mantém esta rota oculta (<Activity>) em vez de desmontá-la:
        // sem limpar o estado, a próxima visita reabriria a compra salva com o botão carregando.
        limparFormulario();
        router.push('/');
        return;
      }
      const data = await res.json().catch(() => null);
      setErroSalvar(data?.erro || 'Não foi possível salvar a compra.');
    } catch {
      setErroSalvar('Erro de conexão.');
    }
    setIsSaving(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNomeArquivo(file.name);
    const reader = new FileReader();
    reader.onload = (event) => setHtmlInput(event.target?.result as string);
    reader.readAsText(file);
  };

  const aoSalvarManual = () => {
    limparFormulario();
    router.push('/');
  };

  // Link direto para cá num grupo em que não pode registrar: explica em vez de deixar falhar ao salvar.
  if (!podeRegistrarNo(dadosContexto)) {
    return (
      <Estrutura>
        <div className="max-w-md">
          <h1 className="text-[24px] font-semibold tracking-tight">Registrar compra</h1>
          <Aviso tipo="info" className="mt-4">
            {dadosContexto?.contexto.tipo === 'grupo' && dadosContexto.contexto.somenteLeitura
              ? 'Este grupo está disponível só para consulta.'
              : 'Você não tem permissão para registrar compras neste grupo. Peça ao host.'}
          </Aviso>
        </div>
      </Estrutura>
    );
  }

  if (modoManual) {
    return (
      <Estrutura semNavInferior>
        <FormularioManual
          listaAgentes={listaAgentes}
          agentesCarregados={agentesCarregados}
          aoVoltar={() => setModoManual(false)}
          aoSalvar={aoSalvarManual}
        />
      </Estrutura>
    );
  }

  return (
    <Estrutura semNavInferior={etapa === 2}>
      {/* ETAPA 1: CAPTURA */}
      {etapa === 1 && (
        <div className="max-w-md">
          <p className="text-[13px] text-texto-3">Etapa 1 de 2</p>
          <h1 className="mt-1 text-[24px] font-semibold tracking-tight">Registrar compra</h1>
          <p className="mt-2 text-texto-2">Aponte a câmera para o QR Code impresso na nota fiscal (NFC-e).</p>

          {erroCaptura && <Aviso tipo="erro" className="mt-5">{erroCaptura}</Aviso>}

          <Botao onClick={() => { setErroCaptura(''); setIsScanning(true); }} className="mt-6 w-full min-h-12">
            <CameraIcon /> Escanear QR Code
          </Botao>

          {!isPastingHtml ? (
            <button
              type="button"
              onClick={() => setIsPastingHtml(true)}
              className="mt-4 min-h-11 text-[15px] text-texto-2 underline underline-offset-2 hover:text-texto"
            >
              Não consegue escanear? Enviar arquivo ou colar HTML
            </button>
          ) : (
            <div className="mt-8 pt-6 border-t border-linha">
              <h2 className="text-[15px] font-semibold">Enviar a página da SEFAZ</h2>
              <p className="mt-1 text-[14px] text-texto-3">Salve a página da nota como .html ou copie o código-fonte dela.</p>

              <input type="file" accept=".html, .htm, text/html" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <Botao variante="secundario" onClick={() => fileInputRef.current?.click()} className="mt-4 w-full">
                {nomeArquivo ? `Arquivo: ${nomeArquivo}` : 'Selecionar arquivo .html'}
              </Botao>

              <label htmlFor="html-colado" className="mt-5 block text-[13px] font-medium text-texto-2 mb-1.5">Ou cole o código HTML</label>
              <textarea
                id="html-colado"
                value={htmlInput}
                onChange={(e) => { setHtmlInput(e.target.value); setNomeArquivo(''); }}
                placeholder="<html>…"
                className={`${campo} py-2 h-24 font-mono text-[12px] resize-none break-all`}
              />

              <div className="mt-4 flex gap-2">
                <Botao variante="discreto" onClick={() => setIsPastingHtml(false)}>Cancelar</Botao>
                <Botao onClick={processarHtmlColado} disabled={htmlInput.length < 50 || isProcessing} className="flex-1">
                  {isProcessing ? <><Spinner /> Lendo nota…</> : 'Ler dados da nota'}
                </Botao>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-linha">
            <h2 className="text-[15px] font-semibold">Gasto sem nota fiscal?</h2>
            <p className="mt-1 text-[14px] text-texto-3">Aluguel, água, luz, condomínio, doações… preencha os dados você mesmo.</p>
            <Botao variante="secundario" onClick={() => { setErroCaptura(''); setModoManual(true); }} className="mt-4 w-full">
              Preencher manualmente
            </Botao>
          </div>
        </div>
      )}

      {/* ETAPA 2: REVISÃO E SALVAMENTO */}
      {etapa === 2 && (
        <div className="pb-24 md:pb-0">
          <button
            type="button"
            onClick={() => setEtapa(1)}
            className="-ml-2 inline-flex items-center gap-1.5 min-h-11 px-2 rounded-lg text-[15px] text-texto-2 hover:bg-black/5"
          >
            <BackIcon /> Ler outra nota
          </button>
          <p className="mt-2 text-[13px] text-texto-3">Etapa 2 de 2</p>

          <div className="mt-1 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <h1 className="text-[22px] md:text-[24px] font-semibold tracking-tight">{estabelecimentoNota || 'Estabelecimento desconhecido'}</h1>
              <p className="text-[14px] text-texto-3 tabular-nums">
                {formatarData(dataEmissao)}{horaEmissao && ` às ${horaEmissao}`} · {items.length} {items.length === 1 ? 'item' : 'itens'}
              </p>
            </div>
            <p className="text-[32px] font-semibold tracking-tight tabular-nums leading-none">{formatarBRL(valorTotal)}</p>
          </div>

          <div className="mt-8 grid md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] gap-8 md:gap-12 items-start">
            <div>
              <label htmlFor="agente" className="block text-[15px] font-semibold">Pago com</label>
              <div className="relative mt-2">
                <select
                  id="agente"
                  value={agenteEscolhido}
                  onChange={e => setAgenteOrigem(e.target.value)}
                  aria-describedby="agente-dica"
                  className={`${campo} appearance-none pr-9`}
                >
                  <option value="">Definir depois</option>
                  {listaAgentes.map(ag => <option key={ag} value={ag}>{ag}</option>)}
                </select>
                <ChevronIcon className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-texto-3" />
              </div>
              <p id="agente-dica" className="mt-1.5 text-[13px] text-texto-3">Não lembra? Salve assim e defina depois pelo histórico.</p>
              {agentesCarregados && listaAgentes.length === 0 && (
                <Aviso tipo="alerta" className="mt-3">
                  Você ainda não cadastrou nenhuma fonte pagadora.{' '}
                  <a href="/agentes" target="_blank" rel="noopener" className="font-semibold underline underline-offset-2">
                    Cadastrar agora
                  </a>{' '}
                  (abre em outra aba; ao voltar, a lista é atualizada).
                </Aviso>
              )}
              <p className="mt-6 text-[14px] text-texto-3">Depois de salvar, os itens ficam em <strong className="font-medium text-texto-2">Categorizar</strong> para você organizar com ajuda da IA.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[15px]">
                <thead>
                  <tr className="border-b border-linha-forte text-[13px] text-texto-3 text-left">
                    <th className="py-2 pr-3 font-medium">Item</th>
                    <th className="py-2 pr-3 font-medium text-right hidden sm:table-cell">Qtd × Unit.</th>
                    <th className="py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 pr-3">
                        {item.descricao}
                        <span className="block sm:hidden text-[13px] text-texto-3 tabular-nums">{item.qtd} {item.un} × {formatarBRL(item.vlUnit)}</span>
                      </td>
                      <td className="py-2.5 pr-3 valor text-texto-3 hidden sm:table-cell">{item.qtd} {item.un} × {formatarBRL(item.vlUnit)}</td>
                      <td className="py-2.5 valor align-top">{formatarBRL(item.vlTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-linha-forte font-semibold">
                    <td className="py-2.5" colSpan={1}>Total</td>
                    <td className="hidden sm:table-cell"></td>
                    <td className="py-2.5 valor">{formatarBRL(valorTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {erroSalvar && <Aviso tipo="erro" className="mt-6">{erroSalvar}</Aviso>}

          {/* Mobile: rodapé fixo na zona do polegar. Desktop: botão no fim do conteúdo. */}
          <div className="fixed md:static bottom-0 inset-x-0 z-20 bg-superficie md:bg-transparent border-t md:border-0 border-linha px-4 pt-3 pb-seguro md:p-0 md:mt-8 md:flex md:justify-end">
            <Botao onClick={salvarTransacao} disabled={isSaving} className="w-full md:w-auto min-h-12 md:px-8">
              {isSaving ? <><Spinner /> Salvando…</> : 'Salvar compra'}
            </Botao>
          </div>
        </div>
      )}

      {/* LEITOR DE QR CODE */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 pb-4" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
            <p className="text-white font-semibold">Leitor de NFC-e</p>
            <button type="button" onClick={() => setIsScanning(false)} className="min-h-11 px-4 rounded-lg bg-white/15 text-white text-[15px] font-semibold">
              Cancelar
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3 text-white">
                <Spinner />
                <p className="text-[15px]">Consultando a SEFAZ…</p>
              </div>
            ) : (
              <Scanner
                onScan={(result) => {
                  if (result && result.length > 0) processarSefazURL(result[0].rawValue);
                }}
              />
            )}
          </div>
        </div>
      )}
    </Estrutura>
  );
}
