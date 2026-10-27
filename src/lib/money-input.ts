import { fromMinor, minorDigits, toMinor, type Money } from './money';

/** Editable Indonesian text: dot grouping, comma decimal. Invalid paste stays visible. */
export function formatMoneyInput(value: string | number | bigint, currency = 'IDR'): string {
  const raw = String(value), digits = minorDigits(currency);
  if (!(digits ? /^[0-9.]*(?:,[0-9]*)?$/ : /^[0-9.]*$/).test(raw)) return raw;
  const [whole, fraction] = raw.split(',');
  if (fraction !== undefined && fraction.length > digits) return raw;
  const plain = whole.replace(/\./g, '');
  if (!plain && fraction === undefined) return '';
  const grouped = (plain || '0').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return grouped + (fraction === undefined ? '' : `,${fraction}`);
}
/** API major-unit decimals must never be interpreted as already grouped UI text. */
export function formatMoneyValue(value: Money, currency = 'IDR'): string {
  const text = fromMinor(toMinor(value, currency), currency);
  const [whole, fraction] = text.split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction === undefined ? '' : `,${fraction}`);
}
export function formatMoneyInputState(value: string, caret: number, currency = 'IDR', inputType = 'insertText'): { value: string; caret: number } {
  if ((inputType === 'insertFromPaste' || inputType === 'insertFromDrop') && parseMoneyInput(value, currency) === null) return { value, caret };
  const formatted = formatMoneyInput(value, currency);
  if (!(minorDigits(currency) ? /^[0-9.]*(?:,[0-9]*)?$/ : /^[0-9.]*$/).test(value)) return { value, caret };
  const count = value.slice(0, caret).replace(/[^0-9,]/g, '').length;
  let next = 0, seen = 0;
  while (next < formatted.length && seen < count) { if (/[0-9,]/.test(formatted[next])) seen++; next++; }
  return { value: formatted, caret: next };
}
export function parseMoneyInput(value: string, currency = 'IDR'): string | null {
  if (!/^(?:[0-9]+|[0-9]{1,3}(?:\.[0-9]{3})+)(?:,[0-9]+)?$/.test(value) || value.length > 64) return null;
  const plain = value.replace(/\./g, '').replace(',', '.');
  try {
    const minor = toMinor(plain, currency);
    if (minor > 9223372036854775807n * 10n ** BigInt(minorDigits(currency))) return null;
    return fromMinor(minor, currency);
  } catch { return null; }
}
