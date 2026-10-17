"use client";

import { useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner';

// ── ÍCONES ──
const CameraIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

const KeyboardIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M6 12h.001M10 12h.001M14 12h.001M18 12h.001M8 16h8" />
  </svg>
)

const SparkleIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
  </svg>
)

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
)

const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

// ── TIPAGENS E CONSTANTES ──
interface Item {
  id: number
  codigo: string
  descricao: string
  qtd: string
  un: string
  vlUnit: string
  vlTotal: string
  categoria: string
}

const CATEGORIAS = ['Bebidas', 'Alimentação', 'Higiene', 'Limpeza', 'Lazer', 'Transporte', 'Outros']

const inp = 'w-full border border-[#e2e5ea] rounded-lg bg-white text-[#111827] text-sm px-3 py-2.5 outline-none transition-all focus:border-[#1d4ed8] focus:ring-2 focus:ring-[#1d4ed8]/10 placeholder-[#9ca3af]'
const lbl = 'block text-[10px] font-semibold text-[#6b7280] mb-1 tracking-widest uppercase'

// ── COMPONENTE PRINCIPAL ──
export default function App() {
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [items, setItems] = useState<Item[]>([])
  const [chaveAcesso, setChaveAcesso] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [desconto, setDesconto] = useState('0,00');
  const [estabelecimentoNota, setEstabelecimentoNota] = useState('');
  const [endereco, setEndereco] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [horaEmissao, setHoraEmissao] = useState('');

  const [agenteOrigem, setAgenteOrigem] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [isCategorizando, setIsCategorizando] = useState(false);

  const addItem = () =>
    setItems(p => [...p, { id: Date.now(), codigo: '', descricao: '', qtd: '1', un: 'UN', vlUnit: '', vlTotal: '', categoria: 'Outros' }])

  const removeItem = (id: number) => setItems(p => p.filter(i => i.id !== id))

  const upd = (id: number, f: keyof Item, v: string) =>
    setItems(p => p.map(i => i.id === id ? { ...i, [f]: v } : i))

  const categorizarComIA = async () => {
    setIsCategorizando(true);
    try {
      // Manda só o essencial para a API economizar tokens
      const itensSimplificados = items.map(i => ({ id: i.id, descricao: i.descricao }));

      const res = await fetch('/api/categorizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itens: itensSimplificados })
      });

      const data = await res.json();

      if (data.sucesso) {
        // Atualiza a lista local combinando os dados antigos com a resposta da IA
        setItems(p => p.map(itemAntigo => {
          const sugestao = data.resultado.find((r: any) => r.id === itemAntigo.id);
          if (sugestao) {
            return {
              ...itemAntigo,
              descricao: sugestao.descricaoLimpa, // Troca a abreviação pelo nome bonito!
              categoria: sugestao.categoria
            };
          }
          return itemAntigo;
        }));
      }
    } catch (error) {
      alert('Erro ao consultar a Inteligência Artificial.');
    } finally {
      setIsCategorizando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex justify-center md:items-start md:py-10">

      {/* ── CONTAINER PRINCIPAL (Largura restaurada para 960px no desktop) ── */}
      <div className="w-full max-w-[430px] md:max-w-[960px] bg-white md:rounded-2xl md:shadow-lg overflow-hidden flex flex-col relative min-h-screen md:min-h-0 md:h-[85vh]">

        {/* ── HEADER & PROGRESSO ── */}
        <header className="sticky top-0 z-20 bg-white pt-4 pb-3">
          <div className="relative flex items-center justify-center px-4">
            {etapa > 1 && (
              <button
                onClick={() => setEtapa(e => (e - 1) as 1 | 2 | 3)}
                className="absolute left-4 w-8 h-8 flex items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f4f5f7] transition-colors"
              >
                <BackIcon />
              </button>
            )}
            <div className="text-center">
              <h1 className="text-[16px] text-[#111827] leading-tight font-bold">
                Nova Transação
              </h1>
              <p className="text-[11px] text-[#9ca3af] tracking-wide mt-0.5 font-medium">
                Passo {etapa} de 3
              </p>
            </div>
          </div>
          <div className="w-full bg-[#f4f5f7] h-1 mt-3">
            <div
              className="bg-[#1d4ed8] h-1 transition-all duration-500 ease-out"
              style={{ width: `${(etapa / 3) * 100}%` }}
            />
          </div>
        </header>

        {/* ── ÁREA DE CONTEÚDO SCROLLÁVEL ── */}
        <div className="flex-1 overflow-y-auto bg-[#f9fafb] md:p-6 p-4">

          {/* ==========================================
              ETAPA 1: CAPTURA 
             ========================================== */}
          {etapa === 1 && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in slide-in-from-bottom-4 duration-500 md:max-w-md md:mx-auto">
              <div className="w-16 h-16 bg-[#eff2ff] text-[#1d4ed8] rounded-2xl flex items-center justify-center mb-5">
                <CameraIcon />
              </div>
              <h2 className="text-[18px] font-bold text-[#111827] mb-2">Captura da Nota</h2>
              <p className="text-[13px] text-[#6b7280] mb-8 leading-relaxed">
                Escaneie o QR Code do cupom fiscal para preencher todos os dados da transação automaticamente.
              </p>

              <div className="w-full space-y-3">
                <button
                  onClick={() => setIsScanning(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1d4ed8] text-white rounded-xl font-bold shadow-lg shadow-[#1d4ed8]/25 hover:bg-[#1e40af] active:scale-[0.98] transition-all"
                >
                  <CameraIcon /> Escanear QR Code
                </button>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-[#e8eaed]"></div>
                  <span className="flex-shrink-0 mx-4 text-[#9ca3af] text-[11px] font-medium uppercase tracking-wider">ou</span>
                  <div className="flex-grow border-t border-[#e8eaed]"></div>
                </div>
                <button
                  onClick={() => setEtapa(2)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-[#d1d5db] text-[#374151] rounded-xl font-bold hover:bg-gray-50 active:scale-[0.98] transition-all"
                >
                  <KeyboardIcon /> Preencher Manualmente
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              ETAPA 2: REVISÃO FISCAL (2 COLUNAS NO DESKTOP)
             ========================================== */}
          {etapa === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="mb-4">
                <h2 className="text-[15px] md:text-[18px] font-bold text-[#111827]">Revisão Fiscal</h2>
                <p className="text-[12px] md:text-[13px] text-[#6b7280]">Confira os dados extraídos da SEFAZ.</p>
              </div>

              {/* Flex no desktop: Esquerda (Geral) / Direita (Itens) */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6">

                <div className="w-full md:w-[45%] space-y-4">
                  {/* Valor em Destaque */}
                  <div className="bg-[#f0f4ff] border border-[#c7d7ff] rounded-xl p-4">
                    <label className="block text-[10px] font-bold text-[#1d4ed8] tracking-widest uppercase mb-1">
                      Valor Total da Nota
                    </label>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[14px] font-semibold text-[#374151]">R$</span>
                      <input
                        type="text"
                        readOnly
                        value={valorTotal || '0,00'}
                        className="flex-1 bg-transparent text-[32px] md:text-[36px] text-[#111827] outline-none font-bold"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                    {desconto && desconto !== '0,00' && (
                      <p className="text-[11px] font-medium text-red-500 mt-1">Desconto aplicado: R$ {desconto}</p>
                    )}
                  </div>

                  {/* Dados Gerais Travados */}
                  <div className="bg-white rounded-xl border border-[#e8eaed] p-4 space-y-3.5">
                    <div>
                      <label className={lbl}>Estabelecimento</label>
                      <input type="text" readOnly value={estabelecimentoNota} placeholder="Ex: Supermercado..." className={inp + ' bg-[#f9fafb] text-[#6b7280] pointer-events-none'} />
                    </div>
                    <div>
                      <label className={lbl}>Endereço</label>
                      <input type="text" readOnly value={endereco} placeholder="Ex: Rua São José, 1000..." className={inp + ' bg-[#f9fafb] text-[#6b7280] pointer-events-none'} />
                    </div>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className={lbl}>Data Emissão</label>
                        <input type="date" readOnly value={dataEmissao} className={inp + ' bg-[#f9fafb] text-[#6b7280] pointer-events-none'} />
                      </div>
                      <div>
                        <label className={lbl}>Hora Emissão</label>
                        <input type="time" readOnly value={horaEmissao} className={inp + ' bg-[#f9fafb] text-[#6b7280] pointer-events-none'} />
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>Chave de Acesso</label>
                      <input type="text" readOnly value={chaveAcesso} className={inp + ' bg-[#f9fafb] text-[#6b7280] font-mono text-[10px] md:text-[12px] pointer-events-none'} />
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-[55%]">
                  {/* Lista Rápida de Itens */}
                  <div className="bg-white rounded-xl border border-[#e8eaed] p-4 md:h-full md:max-h-[400px] flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <label className={lbl + ' mb-0'}>Itens Lidos ({items.length})</label>
                    </div>
                    <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-[11px] md:text-[12px] font-semibold text-[#374151] truncate">{item.descricao}</p>
                            <p className="text-[9px] md:text-[10px] text-[#9ca3af]">{item.qtd} {item.un} x R$ {item.vlUnit}</p>
                          </div>
                          <p className="text-[11px] md:text-[12px] font-bold text-[#111827]" style={{ fontFamily: 'var(--font-mono)' }}>R$ {item.vlTotal}</p>
                        </div>
                      ))}
                      {items.length === 0 && <p className="text-[11px] text-center text-[#9ca3af] py-2">Nenhum item carregado.</p>}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==========================================
              ETAPA 3: ENRIQUECIMENTO (2 COLUNAS NO DESKTOP)
             ========================================== */}
          {etapa === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 pb-24 md:pb-6">
              <div className="mb-4">
                <h2 className="text-[15px] md:text-[18px] font-bold text-[#111827]">Gestão Financeira</h2>
                <p className="text-[12px] md:text-[13px] text-[#6b7280]">Categorize e informe a origem do dinheiro.</p>
              </div>

              {/* Flex no desktop: Esquerda (Financeiro) / Direita (Categorização) */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-6">

                <div className="w-full md:w-[45%]">
                  <div className="bg-white rounded-xl border border-[#e8eaed] p-4 space-y-3.5">
                    <div>
                      <label className={lbl}>Agente Origem (Quem pagou)</label>
                      <div className="relative">
                        <select
                          className={inp + ' appearance-none pr-8'}
                          value={agenteOrigem}
                          onChange={e => setAgenteOrigem(e.target.value)}
                        >
                          <option value="" disabled>Selecionar conta/cartão…</option>
                          <option>Nubank – Conta Corrente</option>
                          <option>Itaú – Conta Poupança</option>
                          <option>Cartão Bradesco Visa</option>
                          <option>Dinheiro (Espécie)</option>
                        </select>
                        <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>Observações <span className="normal-case text-gray-400 font-normal">— opcional</span></label>
                      <textarea
                        rows={3}
                        placeholder="Ex: Compra mensal de casa..."
                        value={observacoes}
                        onChange={e => setObservacoes(e.target.value)}
                        className={inp + ' resize-none'}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-[55%]">
                  <div className="bg-white rounded-xl border border-[#e8eaed] p-4 md:h-full md:max-h-[400px] flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-[3px] h-[14px] bg-[#7c3aed] rounded-full" />
                      <h2 className="text-[10px] font-bold text-[#374151] tracking-widest uppercase">Categorização ({items.length})</h2>
                    </div>

                    <button
                      onClick={categorizarComIA}
                      disabled={isCategorizando}
                      className="w-full flex items-center justify-center gap-2 py-2.5 mb-4 rounded-lg border border-[#7c3aed]/25 bg-[#faf5ff] text-[#7c3aed] text-[11px] font-semibold hover:bg-[#f3e8ff] hover:border-[#7c3aed]/50 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {isCategorizando ? (
                        <span className="flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
                          Processando com IA...
                        </span>
                      ) : (
                        <><SparkleIcon /> Categorizar tudo com IA</>
                      )}
                    </button>

                    <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                      {items.map((item) => (
                        <div key={item.id} className="border border-[#e8eaed] rounded-xl overflow-hidden bg-white shadow-sm">
                          <div className="flex items-center justify-between bg-[#f9fafb] px-3 py-2 border-b border-[#e8eaed]">
                            <input
                              type="text"
                              value={item.descricao}
                              onChange={e => upd(item.id, 'descricao', e.target.value)}
                              className="flex-1 text-[11px] md:text-[12px] font-semibold text-[#111827] bg-transparent outline-none truncate mr-2"
                            />
                            <span className="text-[11px] md:text-[12px] font-bold text-[#111827]" style={{ fontFamily: 'var(--font-mono)' }}>R$ {item.vlTotal}</span>
                          </div>
                          <div className="px-3 py-2 flex items-center justify-between gap-3">
                            <div className="relative flex-1">
                              <select
                                value={item.categoria}
                                onChange={e => upd(item.id, 'categoria', e.target.value)}
                                className="w-full text-[11px] md:text-[12px] font-medium text-[#374151] bg-[#f4f5f7] border border-[#e8eaed] rounded-md px-2 py-1.5 outline-none appearance-none pr-6 focus:border-[#1d4ed8]"
                              >
                                <option disabled value="Categoria">Selecionar...</option>
                                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                              </select>
                              <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af]" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-md text-[#d1d5db] hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={addItem}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#d1d5db] text-[11px] font-semibold text-[#9ca3af] hover:border-[#1d4ed8] hover:text-[#1d4ed8] hover:bg-[#eff2ff] transition-all"
                    >
                      <PlusIcon /> Adicionar item extra
                    </button>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* ── FOOTER COM BOTÕES DE AÇÃO (Fixo no Mobile, Integrado no Desktop) ── */}
        {etapa > 1 && (
          <div className="absolute md:relative bottom-0 left-0 w-full bg-white border-t border-[#e8eaed] px-4 py-3 md:px-6 md:py-4 z-10 flex justify-end">
            {etapa === 2 ? (
              <button
                onClick={() => setEtapa(3)}
                className="w-full md:w-auto md:px-12 py-3.5 rounded-xl bg-[#111827] text-white text-[14px] font-bold tracking-wide hover:bg-black active:scale-[0.98] transition-all shadow-lg"
              >
                Avançar para Categorização
              </button>
            ) : (
              <button
                className="w-full md:w-auto md:px-12 py-3.5 rounded-xl bg-[#1d4ed8] text-white text-[14px] font-bold tracking-wide hover:bg-[#1e40af] active:scale-[0.98] transition-all shadow-lg shadow-[#1d4ed8]/20"
              >
                Salvar Transação Definitiva
              </button>
            )}
          </div>
        )}

      </div>

      {/* ── MODAL DO SCANNER EM FULLSCREEN ── */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="p-4 pt-8 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
            <div>
              <p className="text-white text-[15px] font-bold">Leitor de NFC-e</p>
              <p className="text-white/70 text-[11px]">Aponte para o QR Code</p>
            </div>
            <button
              onClick={() => setIsScanning(false)}
              className="text-white bg-white/20 px-4 py-2 rounded-full text-[12px] font-bold backdrop-blur-md active:bg-white/30"
            >
              Cancelar
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center bg-black relative">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-4 z-20">
                <div className="w-10 h-10 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-white font-bold tracking-wide text-sm">Consultando SEFAZ...</p>
              </div>
            ) : (
              <Scanner
                onScan={async (result) => {
                  if (result && result.length > 0) {
                    const text = result[0].rawValue;
                    setIsProcessing(true);

                    try {
                      const res = await fetch('/api/sefaz', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: text })
                      });

                      const data = await res.json();

                      if (data.sucesso && data.itens.length > 0) {
                        setItems(data.itens);
                        if (data.valorTotalNota) setValorTotal(data.valorTotalNota);
                        if (data.desconto) setDesconto(data.desconto);
                        if (data.estabelecimento) setEstabelecimentoNota(data.estabelecimento);
                        if (data.endereco) setEndereco(data.endereco);

                        if (data.emissao) {
                          const [dataPart, horaPart] = data.emissao.split(' ');
                          const [dia, mes, ano] = dataPart.split('/');
                          setDataEmissao(`${ano}-${mes}-${dia}`);
                          setHoraEmissao(horaPart.substring(0, 5));
                        }

                        const matchChave = text.match(/\d{44}/);
                        if (matchChave) setChaveAcesso(matchChave[0]);

                        setIsScanning(false);
                        setIsProcessing(false);
                        setEtapa(2);
                      } else {
                        alert('Não foi possível encontrar os itens nesta nota.');
                        setIsProcessing(false);
                      }
                    } catch (error) {
                      alert('Erro ao conectar com o servidor da SEFAZ.');
                      setIsProcessing(false);
                    }
                  }
                }}
                onError={(error) => console.log(error)}
              />
            )}

            {!isProcessing && (
              <div className="absolute inset-0 pointer-events-none border-[60px] border-black/40">
                <div className="w-full h-full border-2 border-white/50 rounded-xl relative">
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}