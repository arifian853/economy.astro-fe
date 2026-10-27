/** Money enters as decimal major-unit strings; all accounting uses bigint minor units. */
export type Money = string | number;
const supportedCurrencies = new Set(Intl.supportedValuesOf('currency'));
const digitsCache = new Map<string, number>();
export function minorDigits(currency = 'IDR'): number {
  if (!supportedCurrencies.has(currency)) throw new RangeError('Invalid ISO currency');
  let digits = digitsCache.get(currency);
  if (digits === undefined) {
    digits = currency === 'IDR' ? 0 : new Intl.NumberFormat('id-ID', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits!;
    digitsCache.set(currency, digits);
  }
  return digits;
}
export function toMinor(value: Money, currency = 'IDR'): bigint {
  if (typeof value === 'number' && (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER)) throw new RangeError('Unsafe money number');
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(String(value));
  const digits = minorDigits(currency);
  if (!match || (match[3]?.length ?? 0) > digits) throw new RangeError('Invalid money precision');
  const amount = BigInt(match[2]) * 10n ** BigInt(digits) + BigInt((match[3] ?? '').padEnd(digits, '0') || '0');
  if (typeof value === 'number' && amount > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Unsafe money number');
  return match[1] ? -amount : amount;
}
export function fromMinor(value: bigint, currency = 'IDR'): string {
  const digits = minorDigits(currency);
  const absolute = (value < 0n ? -value : value).toString().padStart(digits + 1, '0');
  return `${value < 0n ? '-' : ''}${digits ? `${absolute.slice(0, -digits)}.${absolute.slice(-digits)}` : absolute}`;
}
export function sumMoney(values: Money[], currency = 'IDR'): string {
  return fromMinor(values.reduce((sum, value) => sum + toMinor(value, currency), 0n), currency);
}
export function subtractMoney(a: Money, b: Money, currency = 'IDR'): string {
  return fromMinor(toMinor(a, currency) - toMinor(b, currency), currency);
}
export function multiplyMoney(amount: Money, quantity: number, currency = 'IDR'): string {
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new RangeError('Invalid quantity');
  return fromMinor(toMinor(amount, currency) * BigInt(quantity), currency);
}
export function splitMoney(amount: Money, count: number, currency = 'IDR') {
  if (!Number.isSafeInteger(count) || count < 1 || toMinor(amount, currency) < 0n) throw new RangeError('Invalid settlement');
  const value = toMinor(amount, currency);
  return { share: fromMinor(value / BigInt(count), currency), remainder: fromMinor(value % BigInt(count), currency) };
}
export const compareMoney = (a: Money, b: Money, currency = 'IDR') => {
  const difference = toMinor(a, currency) - toMinor(b, currency);
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
};
export const absMoney = (value: Money, currency = 'IDR') => fromMinor(toMinor(value, currency) < 0n ? -toMinor(value, currency) : toMinor(value, currency), currency);
/** Only a bounded UI percentage crosses into Number; money never does. */
export function moneyPercent(spent: Money, budget: Money, currency = 'IDR'): number {
  const total = toMinor(budget, currency), used = toMinor(spent, currency);
  if (total <= 0n || used <= 0n) return 0;
  return Number(used >= total ? 10000n : (used * 10000n + total / 2n) / total) / 100;
}
