// Formatação para exibição. A API usa strings no formato brasileiro sem separador de milhar
// ("1234,50", "0,308"); aqui só convertemos para mostrar na tela, nunca para salvar.

/** "1234,50" → 1234.5 (aceita também "1.234,50"). */
export function paraNumero(valor: string | null | undefined): number {
  if (!valor) return 0;
  const n = Number(valor.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 1234.5 ou "1234,50" → "R$ 1.234,50". */
export function formatarBRL(valor: number | string): string {
  return brl.format(typeof valor === 'string' ? paraNumero(valor) : valor);
}

/** 1234.5 → "1.234,50" (sem o símbolo, para quando o "R$" vem separado). */
export function formatarDecimal(valor: number | string): string {
  return decimal.format(typeof valor === 'string' ? paraNumero(valor) : valor);
}

/** "2026-11-25" → "25/11/2026". */
export function formatarData(iso: string): string {
  return iso ? iso.split('-').reverse().join('/') : '';
}

/** "2026-11" → "novembro de 2026". */
export function nomeMes(mesAno: string): string {
  const [ano, mes] = mesAno.split('-').map(Number);
  return new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}
