// Accept Spanish monetary notation or an ungrouped decimal point; never guess
// malformed groups or silently convert a non-numeric entry into zero.
export function parseEuroAmountInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  let value = trimmed.replace(/\s/g, '').replace(/€$/, '');
  if (value.includes(',')) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(value)) throw new Error('Escribe un importe válido, por ejemplo 12.500,00.');
    value = value.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) {
    value = value.replace(/\./g, '');
  }
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(value)) throw new Error('Usa un importe positivo o cero, con un máximo de dos decimales.');
  const [whole, cents = ''] = value.split('.');
  return String(Number(whole)) + '.' + cents.padEnd(2, '0');
}
