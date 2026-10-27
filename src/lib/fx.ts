import { fromMinor, minorDigits, toMinor, type Money } from './money';
import { formatCurrency, formatDate } from './currency';
export type FxReference = { rate: string | null; date: string | null; provider: string | null };
export type CurrencyInfo = { code: string; name: string; symbol: string; minorUnits: number };
export const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
function rateParts(rate: string) {
  if (rate.length > 48 || !/^\d+(?:\.\d+)?$/.test(rate)) throw Error('Kurs tidak valid.');
  const [whole, fraction = ''] = rate.split('.');
  const units = BigInt(whole + fraction);
  if (units <= 0n) throw Error('Kurs tidak valid.');
  return { units, factor: 10n ** BigInt(fraction.length) };
}
export function normalizeFx(rate: unknown, date: unknown, provider: unknown, currency: string): FxReference {
  if (rate === null && date === null && provider === null) return { rate: null, date: null, provider: null };
  if (typeof rate !== 'string' || typeof provider !== 'string' || !/^[\p{L}\p{N} ._()/+-]{1,100}$/u.test(provider)) throw Error('Referensi kurs tidak valid.');
  rateParts(rate);
  if (currency === 'IDR' ? rate !== '1' || date !== null || provider !== 'identity' : !validDate(date) || date > new Date().toISOString().slice(0, 10)) throw Error('Tanggal kurs tidak valid.');
  return { rate, date: date as string | null, provider };
}
export function eventReference(event: { fxReferenceRateToIdr?: string | null; fxReferenceDate?: string | null; fxReferenceProvider?: string | null }): FxReference {
  return { rate: event.fxReferenceRateToIdr ?? null, date: event.fxReferenceDate ?? null, provider: event.fxReferenceProvider ?? null };
}
/** One stored event→IDR rate drives both directions. Round half up to target minor units. */
export function convertReference(amount: Money, currency: string, rate: string, direction: 'to-idr' | 'from-idr'): string {
  const { units, factor } = rateParts(rate);
  const source = toMinor(amount, direction === 'to-idr' ? currency : 'IDR');
  const currencyFactor = 10n ** BigInt(minorDigits(currency));
  const numerator = direction === 'to-idr' ? source * units : source * factor * currencyFactor;
  const denominator = direction === 'to-idr' ? currencyFactor * factor : units;
  const sign = numerator < 0n ? -1n : 1n;
  const rounded = sign * (((numerator < 0n ? -numerator : numerator) + denominator / 2n) / denominator);
  return fromMinor(rounded, direction === 'to-idr' ? 'IDR' : currency);
}
export function approximateIdr(amount: Money, currency: string, fx: FxReference): string {
  return fx.rate ? `≈ ${formatCurrency(convertReference(amount, currency, fx.rate, 'to-idr'))}` : 'Referensi IDR tidak tersedia';
}
export function referenceLabel(fx: FxReference, frozen = false, stale = false, today = new Date().toISOString().slice(0, 10)): string {
  if (!fx.rate || !fx.date || !fx.provider) return frozen ? 'Referensi akhir IDR tidak tersedia; tidak ada kurs yang dibekukan.' : 'Kurs referensi tidak tersedia. Pencatatan tetap dapat dilakukan.';
  return `${frozen ? 'Referensi akhir dibekukan' : stale ? 'Kurs cache · pembaruan tidak tersedia' : fx.date < today ? 'Observasi lama · bukan kurs saat ini' : 'Kurs referensi'} · ${formatDate(fx.date)} · ${fx.provider}`;
}
export function currencyChangeNotice(event: { baseCurrency?: string; budget: Money; cashBudget: Money | null }, next: string): string {
  const previous = event.baseCurrency ?? 'IDR';
  const cash = event.cashBudget;
  // Precision is validated before asking the user to retain the same numeric amounts.
  toMinor(event.budget, next);
  if (cash !== null) toMinor(cash, next);
  return `Anggaran ${formatCurrency(event.budget, previous)} menjadi ${formatCurrency(event.budget, next)}${cash === null ? '' : `; alokasi tunai ${formatCurrency(cash, previous)} menjadi ${formatCurrency(cash, next)}`}. Angka dipertahankan, tanpa konversi kurs. Setujui perubahan nominal ini untuk melanjutkan.`;
}
export function normalizeCurrencies(value: unknown): CurrencyInfo[] {
  if (!Array.isArray(value)) throw Error('Daftar mata uang tidak tersedia.');
  const codes = new Set<string>();
  const currencies = value.filter((item): item is CurrencyInfo => {
    try {
      if (!item || typeof item.code !== 'string' || codes.has(item.code) || minorDigits(item.code) !== item.minorUnits || typeof item.name !== 'string' || !item.name.trim() || typeof item.symbol !== 'string') return false;
      codes.add(item.code); return true;
    } catch { return false; }
  });
  if (!currencies.length) throw Error('Daftar mata uang tidak tersedia.');
  return currencies;
}
