// Conversão entre o formato usado pela UI/API (strings no padrão brasileiro, ex: "1.234,56")
// e o formato do Postgres (numeric como string com ponto decimal, ex: "1234.56").

export class ErroValidacao extends Error {}

/** "1.234,56" | "0,308" | 12.5 → "1234.56" | "0.308" | "12.5". Vazio → null. */
export function brParaNumeric(valor: unknown, campo: string): string | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) throw new ErroValidacao(`Valor inválido em "${campo}"`);
    return String(valor);
  }
  const texto = String(valor).trim();
  if (!texto) return null;
  const normalizado = texto.replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) throw new ErroValidacao(`Valor inválido em "${campo}": ${texto}`);
  return normalizado;
}

/** "1234.5000" → "1234,50" (minCasas = 2) ou "0.3080" → "0,308" (minCasas = 0). */
export function numericParaBr(valor: string | null, minCasas: number): string {
  if (valor === null) return '';
  const [inteiro, decimais = ''] = valor.split('.');
  const semZeros = decimais.replace(/0+$/, '');
  const casas = semZeros.padEnd(minCasas, '0');
  return casas ? `${inteiro},${casas}` : inteiro;
}

/** Aceita "" (sem data) ou "AAAA-MM-DD". */
export function validarData(valor: unknown): string | null {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (!texto) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) throw new ErroValidacao(`Data inválida: ${texto}`);
  return texto;
}

/** Aceita "" (sem hora), "HH:MM" ou "HH:MM:SS". */
export function validarHora(valor: unknown): string | null {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (!texto) return null;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(texto)) throw new ErroValidacao(`Hora inválida: ${texto}`);
  return texto;
}
