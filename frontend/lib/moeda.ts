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

/**
 * Valor digitado pelo usuário → centavos (inteiro, sem erro de float).
 * Aceita "1500", "1500,5", "1.500,50", "R$ 1.500,50", "1500.50" e "1.500" (mil e quinhentos).
 * Retorna null se o texto não for um valor válido.
 */
export function paraCentavos(texto: string): number | null {
  let t = texto.replace(/R\$|\s/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [inteiro, decimal = ''] = t.split('.');
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'));
}

/** 150050 → "1500,50" (formato da API). */
export function centavosParaBR(centavos: number): string {
  return `${Math.floor(centavos / 100)},${String(centavos % 100).padStart(2, '0')}`;
}

/** "2026-11" → "nov" (rótulo curto para eixos). */
export function mesCurto(mesAno: string): string {
  const [ano, mes] = mesAno.split('-').map(Number);
  return new Date(ano, mes - 1).toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
}

/** "2026-11" → "2026-10" (deslocamento em meses; negativo volta no tempo). */
export function deslocarMes(mesAno: string, delta: number): string {
  const [ano, mes] = mesAno.split('-').map(Number);
  const d = new Date(ano, mes - 1 + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
