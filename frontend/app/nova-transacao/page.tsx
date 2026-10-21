"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';

import { Item } from '../../types';
import { CameraIcon, KeyboardIcon, BackIcon } from '../../components/icons';

const inp = 'w-full border border-[#e2e5ea] rounded-lg bg-white text-[#111827] text-sm px-3 py-2.5 outline-none transition-all focus:border-[#1d4ed8] placeholder-[#9ca3af]';
const lbl = 'block text-[10px] font-semibold text-[#6b7280] mb-1 tracking-widest uppercase';

export default function NovaTransacao() {
  const router = useRouter();
  const [etapa, setEtapa] = useState<1 | 2>(1);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dados da Transação
  const [items, setItems] = useState<Item[]>([]);
  const [chaveAcesso, setChaveAcesso] = useState('');
  const [valorTotal, setValorTotal] = useState('');
  const [desconto, setDesconto] = useState('0,00');
  const [estabelecimentoNota, setEstabelecimentoNota] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [horaEmissao, setHoraEmissao] = useState('');
  const [agenteOrigem, setAgenteOrigem] = useState('');
  
  const [listaAgentes, setListaAgentes] = useState<string[]>([]);

  // Carrega os agentes pagadores da API
  useEffect(() => {
    fetch('/api/agentes').then(res => res.json()).then(data => {
      if (data.sucesso) setListaAgentes(data.agentes);
    });
  }, []);

  const salvarTransacao = async () => {
    if (!agenteOrigem) {
      alert("Por favor, selecione quem pagou (Agente Origem).");
      return;
    }
    
    setIsSaving(true);
    const payload = {
      chaveAcesso, valorTotal, desconto, estabelecimento: estabelecimentoNota, 
      dataEmissao, horaEmissao, agenteOrigem, items
    };

    try {
      const res = await fetch('/api/transacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        router.push('/'); // Volta pro Dashboard!
      } else {
        alert('Erro ao salvar transação.');
        setIsSaving(false);
      }
    } catch (e) {
      alert('Erro de conexão.');
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] flex justify-center md:items-start md:py-10">
      <div className="w-full max-w-[430px] md:max-w-[960px] bg-white md:rounded-2xl md:shadow-lg overflow-hidden flex flex-col relative min-h-screen md:min-h-0 md:h-[85vh]">
        
        {/* HEADER */}
        <header className="sticky top-0 z-20 bg-white pt-4 pb-3">
          <div className="relative flex items-center justify-center px-4">
            {etapa === 2 ? (
              <button onClick={() => setEtapa(1)} className="absolute left-4 w-8 h-8 flex items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f4f5f7] transition-colors"><BackIcon /></button>
            ) : (
              <button onClick={() => router.push('/')} className="absolute left-4 w-8 h-8 flex items-center justify-center rounded-lg text-[#6b7280] hover:bg-[#f4f5f7] transition-colors"><BackIcon /></button>
            )}
            <div className="text-center">
              <h1 className="text-[16px] text-[#111827] leading-tight font-bold">Nova Transação</h1>
              <p className="text-[11px] text-[#9ca3af] tracking-wide mt-0.5 font-medium">Passo {etapa} de 2</p>
            </div>
          </div>
          <div className="w-full bg-[#f4f5f7] h-1 mt-3">
            <div className="bg-[#1d4ed8] h-1 transition-all duration-500" style={{ width: `${(etapa / 2) * 100}%` }} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-[#f9fafb] md:p-6 p-4">
          
          {/* ETAPA 1: CAPTURA */}
          {etapa === 1 && (
            <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in md:max-w-md md:mx-auto">
              <div className="w-16 h-16 bg-[#eff2ff] text-[#1d4ed8] rounded-2xl flex items-center justify-center mb-5"><CameraIcon /></div>
              <h2 className="text-[18px] font-bold text-[#111827] mb-2">Captura da Nota</h2>
              <p className="text-[13px] text-[#6b7280] mb-8 leading-relaxed">Escaneie o QR Code do cupom fiscal para preencher todos os dados.</p>
              
              <div className="w-full space-y-3">
                <button onClick={() => setIsScanning(true)} className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1d4ed8] text-white rounded-xl font-bold hover:bg-[#1e40af] transition-all">
                  <CameraIcon /> Escanear QR Code
                </button>
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-[#e8eaed]"></div>
                  <span className="mx-4 text-[#9ca3af] text-[11px] font-medium uppercase tracking-wider">ou</span>
                  <div className="flex-grow border-t border-[#e8eaed]"></div>
                </div>
                <button className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-[#d1d5db] text-[#374151] rounded-xl font-bold hover:bg-gray-50 transition-all">
                  <KeyboardIcon /> Digitar Chave Manualmente
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 2: REVISÃO E SALVAMENTO */}
          {etapa === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 pb-24 md:pb-0">
              <div className="mb-4">
                <h2 className="text-[15px] md:text-[18px] font-bold text-[#111827]">Revisão de Dados</h2>
                <p className="text-[12px] md:text-[13px] text-[#6b7280]">Confira os dados e informe quem pagou.</p>
              </div>

              <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                {/* Coluna Esquerda: Valor e Pagador */}
                <div className="w-full md:w-[45%] space-y-4">
                  <div className="bg-[#f0f4ff] border border-[#c7d7ff] rounded-xl p-4">
                    <label className="block text-[10px] font-bold text-[#1d4ed8] tracking-widest uppercase mb-1">Valor Total</label>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[14px] font-semibold text-[#374151]">R$</span>
                      <span className="text-[32px] text-[#111827] font-bold font-mono">{valorTotal}</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-[#e8eaed] p-4">
                    <label className={lbl}>Quem pagou? (Agente Origem)</label>
                    <div className="relative">
                      <select className={inp + ' appearance-none pr-8 bg-[#f4f5f7]'} value={agenteOrigem} onChange={e => setAgenteOrigem(e.target.value)}>
                        <option value="" disabled>Selecionar conta/cartão…</option>
                        {listaAgentes.map(ag => <option key={ag} value={ag}>{ag}</option>)}
                      </select>
                      <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-[#e8eaed] p-4 space-y-3.5 opacity-80 pointer-events-none">
                    <div><label className={lbl}>Estabelecimento</label><input type="text" readOnly value={estabelecimentoNota} className={inp + ' bg-[#f9fafb] text-[#6b7280]'} /></div>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div><label className={lbl}>Data</label><input type="date" readOnly value={dataEmissao} className={inp + ' bg-[#f9fafb] text-[#6b7280]'} /></div>
                      <div><label className={lbl}>Hora</label><input type="time" readOnly value={horaEmissao} className={inp + ' bg-[#f9fafb] text-[#6b7280]'} /></div>
                    </div>
                  </div>
                </div>

                {/* Coluna Direita: Itens da Nota */}
                <div className="w-full md:w-[55%]">
                  <div className="bg-white rounded-xl border border-[#e8eaed] p-4 md:h-full md:max-h-[500px] flex flex-col">
                    <label className={lbl + ' mb-3'}>Itens Lidos ({items.length})</label>
                    <div className="overflow-y-auto space-y-2 pr-1 flex-1">
                      {items.map(item => (
                        <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="text-[11px] md:text-[12px] font-semibold text-[#374151] truncate">{item.descricao}</p>
                            <p className="text-[9px] md:text-[10px] text-[#9ca3af]">{item.qtd} {item.un} x R$ {item.vlUnit}</p>
                          </div>
                          <p className="text-[11px] md:text-[12px] font-bold text-[#111827] font-mono">R$ {item.vlTotal}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#e8eaed] flex items-center gap-2 text-[10px] text-orange-600 font-medium bg-orange-50 p-2 rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                      Os itens serão categorizados pela IA na Caixa de Entrada depois.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER MOBILE / DESKTOP */}
        {etapa === 2 && (
          <div className="absolute md:relative bottom-0 left-0 w-full bg-white border-t border-[#e8eaed] px-4 py-3 md:px-6 md:py-4 z-10 flex justify-end">
            <button onClick={salvarTransacao} disabled={isSaving} className="w-full md:w-auto md:px-12 py-3.5 rounded-xl bg-[#111827] text-white text-[14px] font-bold hover:bg-black transition-all shadow-lg disabled:opacity-70">
              {isSaving ? 'Salvando...' : 'Salvar Transação Definitiva'}
            </button>
          </div>
        )}

      </div>

      {/* MODAL SCANNER */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="p-4 pt-8 flex justify-between absolute top-0 w-full z-10 bg-gradient-to-b from-black/80 to-transparent">
            <div><p className="text-white font-bold">Leitor NFC-e</p></div>
            <button onClick={() => setIsScanning(false)} className="text-white bg-white/20 px-4 py-2 rounded-full text-[12px] font-bold">Cancelar</button>
          </div>
          <div className="flex-1 flex items-center justify-center bg-black">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-4 z-20">
                <div className="w-10 h-10 border-4 border-[#1d4ed8] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-white font-bold text-sm">Consultando SEFAZ...</p>
              </div>
            ) : (
              <Scanner
                onScan={async (result) => {
                  if (result && result.length > 0) {
                    setIsProcessing(true);
                    try {
                      const res = await fetch('/api/sefaz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: result[0].rawValue }) });
                      const data = await res.json();
                      if (data.sucesso) {
                        setItems(data.itens);
                        setValorTotal(data.valorTotalNota);
                        setEstabelecimentoNota(data.estabelecimento);
                        if (data.emissao) {
                          const [dataPart, horaPart] = data.emissao.split(' ');
                          setDataEmissao(dataPart.split('/').reverse().join('-'));
                          setHoraEmissao(horaPart.substring(0, 5));
                        }
                        setIsScanning(false);
                        setIsProcessing(false);
                        setEtapa(2);
                      }
                    } catch (e) {
                      alert('Erro na SEFAZ.'); setIsProcessing(false);
                    }
                  }
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}