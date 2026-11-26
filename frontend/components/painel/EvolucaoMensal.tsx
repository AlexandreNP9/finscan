"use client";

import { useState } from 'react';
import { formatarBRL, mesCurto, nomeMes } from '../../lib/moeda';

export type PontoMes = { mes: string; total: number; compras: number };

type Props = {
  pontos: PontoMes[];
  selecionado: string;
  /** Só meses com compras podem ser selecionados (são os que existem no seletor). */
  podeSelecionar: (mes: string) => boolean;
  aoSelecionar: (mes: string) => void;
};

const ALTURA = 120; // px da área das colunas

/**
 * Colunas dos últimos meses. Ênfase: o mês selecionado na cor de ação, os demais em cinza.
 * Só o selecionado tem o valor escrito; os outros aparecem na dica (hover/foco) e no histórico.
 */
export default function EvolucaoMensal({ pontos, selecionado, podeSelecionar, aoSelecionar }: Props) {
  const [ativo, setAtivo] = useState<string | null>(null);
  const maior = Math.max(...pontos.map((p) => p.total), 1);

  return (
    <section aria-labelledby="titulo-evolucao">
      <h2 id="titulo-evolucao" className="text-[15px] font-semibold">Últimos {pontos.length} meses</h2>
      <div className="mt-2 pt-10 flex items-end gap-1" onPointerLeave={() => setAtivo(null)}>
        {pontos.map((p, i) => {
          const escolhido = p.mes === selecionado;
          const altura = p.total > 0 ? Math.max((p.total / maior) * ALTURA, 3) : 0;
          const descricao = `${nomeMes(p.mes)}: ${formatarBRL(p.total)}, ${p.compras} ${p.compras === 1 ? 'compra' : 'compras'}`;
          const clicavel = podeSelecionar(p.mes) && !escolhido;
          return (
            <div key={p.mes} className="relative flex-1 min-w-0">
              {/* A coluna inteira (não só a barra pintada) é o alvo de hover/clique. */}
              <button
                type="button"
                aria-label={descricao}
                aria-current={escolhido ? 'date' : undefined}
                aria-disabled={!clicavel}
                onClick={() => clicavel && aoSelecionar(p.mes)}
                onPointerEnter={() => setAtivo(p.mes)}
                onFocus={() => setAtivo(p.mes)}
                onBlur={() => setAtivo(null)}
                className={`group flex w-full flex-col items-center rounded-md pt-5 ${clicavel ? 'cursor-pointer hover:bg-black/[0.03]' : 'cursor-default'}`}
              >
                <span className="relative flex w-full justify-center" style={{ height: ALTURA }}>
                  {ativo === p.mes && (
                    // Nas pontas, a dica se alinha à borda do gráfico para não sair da tela no celular.
                    <span
                      role="tooltip"
                      className={`pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-texto px-2.5 py-1.5 text-left text-[13px] text-white shadow-sm ${i === 0 ? 'left-0' : i === pontos.length - 1 ? 'right-0' : ''}`}
                      style={{ bottom: altura + 6 }}
                    >
                      <span className="block font-semibold tabular-nums">{formatarBRL(p.total)}</span>
                      <span className="block text-white/75 first-letter:uppercase">{nomeMes(p.mes)} · {p.compras} {p.compras === 1 ? 'compra' : 'compras'}</span>
                    </span>
                  )}
                  {escolhido && p.total > 0 && ativo !== p.mes && (
                    <span className="absolute text-[12px] font-medium text-texto tabular-nums" style={{ bottom: altura + 4 }}>
                      {formatarBRL(p.total).replace(/,\d{2}$/, '')}
                    </span>
                  )}
                  <span
                    className={`absolute bottom-0 w-full max-w-6 rounded-t ${escolhido ? 'bg-acao' : 'bg-linha-forte group-hover:bg-texto-3'}`}
                    style={{ height: altura }}
                  />
                </span>
                <span className="mt-1.5 w-full border-t border-linha pt-1.5 text-[12px] text-texto-3">
                  <span className={escolhido ? 'font-semibold text-texto' : ''}>{mesCurto(p.mes)}</span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
