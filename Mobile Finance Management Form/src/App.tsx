import { useState } from 'react'

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

export default function App() {
  const [items, setItems] = useState<Item[]>([
    { id: 1, codigo: '2563', descricao: 'REF ZR SPRITE 350ML', qtd: '1', un: 'FD', vlUnit: '3,89', vlTotal: '3,89', categoria: 'Bebidas' },
    { id: 2, codigo: '0891', descricao: 'PAO FORMA INTEGRAL 500G', qtd: '2', un: 'UN', vlUnit: '6,90', vlTotal: '13,80', categoria: 'Alimentação' },
  ])

  const addItem = () =>
    setItems(p => [...p, { id: Date.now(), codigo: '', descricao: '', qtd: '1', un: 'UN', vlUnit: '', vlTotal: '', categoria: 'Outros' }])

  const removeItem = (id: number) => setItems(p => p.filter(i => i.id !== id))

  const upd = (id: number, f: keyof Item, v: string) =>
    setItems(p => p.map(i => i.id === id ? { ...i, [f]: v } : i))

  const subtotal = items.reduce((a, i) => a + (parseFloat(i.vlTotal.replace(',', '.')) || 0), 0)

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex justify-center">
      <div className="w-full max-w-[430px] flex flex-col relative">

        {/* ── HEADER ── */}
        <header className="sticky top-0 z-20 bg-white border-b border-[#e8eaed]">
          <div className="relative flex items-center justify-center px-4 py-3.5">
            <button className="absolute left-4 w-8 h-8 flex items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f4f5f7] transition-colors">
              <BackIcon />
            </button>
            <div className="text-center">
              <h1 className="text-[15px] text-[#111827] leading-tight" style={{ fontWeight: 700 }}>
                Nova Transação
              </h1>
              <p className="text-[10px] text-[#9ca3af] tracking-wide mt-0.5">Cadastro de despesa</p>
            </div>
          </div>
        </header>

        {/* ── SCROLL AREA ── */}
        <div className="flex-1 overflow-y-auto pb-28 space-y-3 pt-3 px-4">

          {/* ── AUTOMAÇÃO ── */}
          <div className="bg-white rounded-xl border border-[#e8eaed] p-4">
            <p className="text-[11px] text-[#9ca3af] font-medium mb-2.5 flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Importar dados da nota fiscal:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button className="flex items-center justify-center gap-2 px-3 py-2.5 border border-[#e8eaed] rounded-lg text-[11px] font-semibold text-[#374151] bg-[#f9fafb] hover:border-[#1d4ed8] hover:text-[#1d4ed8] hover:bg-[#eff2ff] transition-all active:scale-95">
                <CameraIcon />
                Ler QR Code
              </button>
              <button className="flex items-center justify-center gap-2 px-3 py-2.5 border border-[#e8eaed] rounded-lg text-[11px] font-semibold text-[#374151] bg-[#f9fafb] hover:border-[#1d4ed8] hover:text-[#1d4ed8] hover:bg-[#eff2ff] transition-all active:scale-95">
                <KeyboardIcon />
                Digitar Chave de Acesso
              </button>
            </div>
          </div>

          {/* ── DADOS GERAIS ── */}
          <div className="bg-white rounded-xl border border-[#e8eaed] p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-[3px] h-[14px] bg-[#1d4ed8] rounded-full" />
              <h2 className="text-[10px] font-bold text-[#374151] tracking-widest uppercase">Dados Gerais</h2>
            </div>

            {/* Valor em destaque */}
            <div className="mb-4 bg-[#f0f4ff] border border-[#c7d7ff] rounded-xl p-4">
              <label className="block text-[10px] font-bold text-[#1d4ed8] tracking-widest uppercase mb-2">
                Valor Total (R$)
              </label>
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-semibold text-[#374151]">R$</span>
                <input
                  type="text"
                  placeholder="0,00"
                  defaultValue="17,69"
                  className="flex-1 bg-transparent text-[32px] text-[#111827] outline-none border-b-2 border-[#1d4ed8]/30 focus:border-[#1d4ed8] pb-0.5 transition-colors placeholder-[#9ca3af]"
                  style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                />
              </div>
            </div>

            <div className="space-y-3.5">
              {/* Data */}
              <div>
                <label className={lbl}>Data da Transação</label>
                <input type="date" className={inp} defaultValue="2026-09-21" />
              </div>

              {/* Agente Origem */}
              <div>
                <label className={lbl}>Agente Origem (Quem paga)</label>
                <div className="relative">
                  <select className={inp + ' appearance-none pr-8'} defaultValue="">
                    <option value="" disabled>Selecionar conta…</option>
                    <option>Nubank – Conta Corrente</option>
                    <option>Itaú – Conta Poupança</option>
                    <option>Cartão Bradesco Visa</option>
                    <option>Cartão XP Mastercard</option>
                  </select>
                  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>

              {/* Agente Destino */}
              <div>
                <label className={lbl}>Agente Destino (Estabelecimento)</label>
                <div className="relative">
                  <select className={inp + ' appearance-none pr-8'} defaultValue="">
                    <option value="" disabled>Selecionar estabelecimento…</option>
                    <option>Supermercado Pão de Açúcar</option>
                    <option>Mercado Extra</option>
                    <option>Posto Ipiranga</option>
                    <option>Farmácia Drogasil</option>
                  </select>
                  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
              </div>

              {/* Chave de Acesso */}
              <div>
                <label className={lbl}>Chave de Acesso (44 dígitos)</label>
                <input
                  type="text"
                  maxLength={44}
                  placeholder="00000000000000000000000000000000000000000000"
                  className={inp + ' font-mono text-xs tracking-wider'}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}
                />
              </div>

              {/* Observações */}
              <div>
                <label className={lbl}>
                  Observações da compra
                  <span className="ml-1.5 text-[#9ca3af] font-normal normal-case tracking-normal">— opcional</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="Compra semanal de mantimentos…"
                  className={inp + ' resize-none'}
                />
              </div>
            </div>
          </div>

          {/* ── ITENS ── */}
          <div className="bg-white rounded-xl border border-[#e8eaed] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-[14px] bg-[#7c3aed] rounded-full" />
                <h2 className="text-[10px] font-bold text-[#374151] tracking-widest uppercase">Itens da Transação</h2>
              </div>
              <span className="text-[11px] text-[#9ca3af]" style={{ fontFamily: 'var(--font-mono)' }}>
                {items.length} {items.length === 1 ? 'item' : 'itens'}
              </span>
            </div>

            {/* IA */}
            <button className="w-full flex items-center justify-center gap-2 py-2 mb-3.5 rounded-lg border border-[#7c3aed]/25 bg-[#faf5ff] text-[#7c3aed] text-[11px] font-semibold hover:bg-[#f3e8ff] hover:border-[#7c3aed]/50 transition-all active:scale-[0.98]">
              <SparkleIcon />
              Categorizar com IA
            </button>

            {/* Cards de produtos */}
            <div className="space-y-2.5">
              {items.map((item) => (
                <div key={item.id} className="border border-[#e8eaed] rounded-xl overflow-hidden">
                  {/* Linha topo: código + descrição + trash */}
                  <div className="flex items-center gap-2 bg-[#f9fafb] px-3 py-2 border-b border-[#e8eaed]">
                    <span className="text-[10px] font-bold text-[#9ca3af] tracking-wider shrink-0">#</span>
                    <input
                      type="text"
                      value={item.codigo}
                      onChange={e => upd(item.id, 'codigo', e.target.value)}
                      placeholder="Cód"
                      className="w-[38px] text-[11px] font-bold text-[#374151] bg-transparent outline-none border-b border-transparent focus:border-[#1d4ed8] shrink-0"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                    <div className="w-px h-3 bg-[#e8eaed] shrink-0" />
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={e => upd(item.id, 'descricao', e.target.value)}
                      placeholder="Descrição do produto…"
                      className="flex-1 text-[12px] font-semibold text-[#111827] bg-transparent outline-none border-b border-transparent focus:border-[#1d4ed8] min-w-0"
                    />
                    <button
                      onClick={() => removeItem(item.id)}
                      className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-[#d1d5db] hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <TrashIcon />
                    </button>
                  </div>

                  {/* Linha dados: qtd | un | vl.unit | vl.total | categoria */}
                  <div className="px-3 py-2.5 grid gap-x-2" style={{ gridTemplateColumns: '36px 36px 1fr 1fr 100px' }}>
                    {/* Qtd */}
                    <div>
                      <p className="text-[9px] font-semibold text-[#9ca3af] tracking-wider uppercase mb-1">Qtd</p>
                      <input
                        type="text"
                        value={item.qtd}
                        onChange={e => upd(item.id, 'qtd', e.target.value)}
                        className="w-full text-[12px] text-center text-[#111827] bg-transparent outline-none border-b border-transparent focus:border-[#1d4ed8]"
                        style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                      />
                    </div>
                    {/* UN */}
                    <div>
                      <p className="text-[9px] font-semibold text-[#9ca3af] tracking-wider uppercase mb-1">UN</p>
                      <input
                        type="text"
                        value={item.un}
                        onChange={e => upd(item.id, 'un', e.target.value)}
                        className="w-full text-[12px] text-center text-[#111827] bg-transparent outline-none border-b border-transparent focus:border-[#1d4ed8]"
                        style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
                      />
                    </div>
                    {/* Vl. Unit */}
                    <div>
                      <p className="text-[9px] font-semibold text-[#9ca3af] tracking-wider uppercase mb-1">Vl. Unit</p>
                      <input
                        type="text"
                        value={item.vlUnit}
                        onChange={e => upd(item.id, 'vlUnit', e.target.value)}
                        placeholder="0,00"
                        className="w-full text-[12px] text-right text-[#374151] bg-transparent outline-none border-b border-transparent focus:border-[#1d4ed8]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                    {/* Vl. Total */}
                    <div>
                      <p className="text-[9px] font-semibold text-[#9ca3af] tracking-wider uppercase mb-1">Vl. Total</p>
                      <input
                        type="text"
                        value={item.vlTotal}
                        onChange={e => upd(item.id, 'vlTotal', e.target.value)}
                        placeholder="0,00"
                        className="w-full text-[12px] text-right font-bold text-[#111827] bg-transparent outline-none border-b border-transparent focus:border-[#1d4ed8]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                    {/* Categoria */}
                    <div>
                      <p className="text-[9px] font-semibold text-[#9ca3af] tracking-wider uppercase mb-1">Categoria</p>
                      <div className="relative">
                        <select
                          value={item.categoria}
                          onChange={e => upd(item.id, 'categoria', e.target.value)}
                          className="w-full text-[10px] font-semibold text-[#374151] bg-[#f4f5f7] border border-[#e8eaed] rounded-md px-1.5 py-0.5 outline-none appearance-none pr-4 focus:border-[#1d4ed8] transition-colors"
                        >
                          {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                        </select>
                        <svg className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[#9ca3af]" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal */}
            {items.length > 0 && (
              <div className="flex justify-between items-center mt-3.5 pt-3 border-t border-[#f0f0f0]">
                <span className="text-[11px] text-[#9ca3af] font-medium">Subtotal dos itens</span>
                <span className="text-[13px] font-bold text-[#111827]" style={{ fontFamily: 'var(--font-mono)' }}>
                  R$ {subtotal.toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}

            {/* Adicionar item */}
            <button
              onClick={addItem}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[#d1d5db] text-[11px] font-semibold text-[#9ca3af] hover:border-[#1d4ed8] hover:text-[#1d4ed8] hover:bg-[#eff2ff] transition-all active:scale-[0.98]"
            >
              <PlusIcon />
              Adicionar item manualmente
            </button>
          </div>
        </div>

        {/* ── FOOTER FIXO ── */}
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 backdrop-blur-sm border-t border-[#e8eaed] px-4 pt-3 pb-5 z-20">
          <button className="w-full py-3.5 rounded-xl bg-[#1d4ed8] hover:bg-[#1e40af] active:bg-[#1e3a8a] text-white text-[14px] font-bold tracking-wide transition-all active:scale-[0.98] shadow-lg shadow-[#1d4ed8]/20">
            Salvar Transação
          </button>
          <p className="text-center text-[10px] text-[#c0c4cb] mt-2 tracking-wide">
            Todos os campos obrigatórios devem ser preenchidos
          </p>
        </div>

      </div>
    </div>
  )
}
