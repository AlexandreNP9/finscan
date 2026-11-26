import { formatarBRL } from '../../lib/moeda';

export type LinhaRanking = {
  nome: string;
  valor: number;
  /** Texto secundário sob o nome (ex.: "3 compras"). */
  detalhe?: string;
  /** Linha clicável (ex.: abrir o detalhe da categoria). */
  aoClicar?: () => void;
};

type Props = {
  id: string;
  titulo: string;
  linhas: LinhaRanking[];
  /** Base do percentual (normalmente o total do mês). */
  total: number;
  vazio: string;
  /** Linhas de resumo no fim, sem barra (ex.: "Outras 4 categorias"). */
  rodape?: { nome: string; valor: number }[];
};

/**
 * Barras horizontais ordenadas (maior primeiro), uma cor só: comparar partes de um total.
 * Cada linha traz nome, valor e participação no total escritos, então a barra só reforça.
 */
export default function RankingBarras({ id, titulo, linhas, total, vazio, rodape = [] }: Props) {
  const maior = linhas[0]?.valor || 1;
  const pct = (v: number) => {
    const p = total > 0 ? (v / total) * 100 : 0;
    return p > 0 && p < 1 ? '<1' : String(Math.round(p));
  };

  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-[15px] font-semibold">{titulo}</h2>
      {linhas.length === 0 ? (
        <p className="mt-3 text-[14px] text-texto-3">{vazio}</p>
      ) : (
        <ul className="mt-2 divide-y divide-linha">
          {linhas.map((l) => {
            const conteudo = (
              <>
                <span className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0">
                    <span className={`block truncate text-[15px] ${l.aoClicar ? 'group-hover:underline underline-offset-2' : ''}`}>{l.nome}</span>
                    {l.detalhe && <span className="block text-[13px] text-texto-3">{l.detalhe}</span>}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="valor block text-[15px] font-medium">{formatarBRL(l.valor)}</span>
                    <span className="block text-[13px] text-texto-3 tabular-nums">{pct(l.valor)}%</span>
                  </span>
                </span>
                <span className="mt-2 block h-1.5 rounded-full bg-linha" aria-hidden>
                  <span className="block h-1.5 rounded-full bg-acao" style={{ width: `${(l.valor / maior) * 100}%` }} />
                </span>
              </>
            );
            return (
              <li key={l.nome}>
                {l.aoClicar ? (
                  <button type="button" onClick={l.aoClicar} className="group w-full py-3 text-left">{conteudo}</button>
                ) : (
                  <div className="py-3">{conteudo}</div>
                )}
              </li>
            );
          })}
          {rodape.filter((r) => r.valor > 0).map((r) => (
            <li key={r.nome} className="py-3 flex justify-between gap-4 text-[14px] text-texto-3">
              <span>{r.nome}</span>
              <span className="valor">{formatarBRL(r.valor)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
