"use client";

import { useEffect, useState } from 'react';
import { buscarApi } from '../lib/cliente';
import Botao, { Spinner } from './Botao';

const TAMANHO_MAX = 300;

/** Objetivo do usuário com as categorias; orienta a IA a sugerir categorias novas em /categorizar. */
export default function ObjetivoCategorias() {
  const [salvo, setSalvo] = useState('');
  const [texto, setTexto] = useState('');
  const [carregado, setCarregado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    buscarApi('/api/categorias/objetivo')
      .then((res) => res.json())
      .then((d) => {
        if (d.sucesso) { setSalvo(d.objetivo); setTexto(d.objetivo); }
      })
      .catch(() => {})
      .finally(() => setCarregado(true));
  }, []);

  const salvar = async () => {
    setSalvando(true);
    setResultado(null);
    try {
      const res = await buscarApi('/api/categorias/objetivo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objetivo: texto }),
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.sucesso) {
        setSalvo(d.objetivo);
        setTexto(d.objetivo);
        setResultado({ tipo: 'sucesso', texto: 'Objetivo salvo.' });
      } else {
        setResultado({ tipo: 'erro', texto: d?.erro || 'Não foi possível salvar.' });
      }
    } catch {
      setResultado({ tipo: 'erro', texto: 'Erro de conexão.' });
    }
    setSalvando(false);
  };

  const sujo = texto.trim() !== salvo;

  return (
    <section aria-labelledby="titulo-objetivo" className="mt-6 rounded-lg border border-linha p-4">
      <h2 id="titulo-objetivo" className="text-[15px] font-semibold">Seu objetivo</h2>
      <p className="mt-1 text-[14px] text-texto-3">
        Conte o que você quer enxergar nos seus gastos. Ao categorizar, a IA usa isso para sugerir categorias novas.
      </p>
      <label htmlFor="objetivo" className="sr-only">Seu objetivo</label>
      <textarea
        id="objetivo"
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setResultado(null); }}
        disabled={!carregado}
        maxLength={TAMANHO_MAX}
        rows={2}
        placeholder="Ex.: separar o essencial do supérfluo nas compras do mercado"
        className="mt-3 w-full rounded-lg border border-linha-forte bg-superficie px-3 py-2 text-[15px] outline-none focus:border-acao resize-none"
      />
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        {sujo && (
          <Botao variante="secundario" onClick={salvar} disabled={salvando}>
            {salvando ? <><Spinner /> Salvando…</> : 'Salvar objetivo'}
          </Botao>
        )}
        {resultado && (
          <p role={resultado.tipo === 'erro' ? 'alert' : 'status'} className={`text-[14px] ${resultado.tipo === 'erro' ? 'text-erro' : 'text-sucesso'}`}>
            {resultado.texto}
          </p>
        )}
        <span className="ml-auto text-[13px] text-texto-3 tabular-nums">{texto.length}/{TAMANHO_MAX}</span>
      </div>
    </section>
  );
}
