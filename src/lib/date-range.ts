export type DateRange = { start: string; end: string };

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function compareDateOnly(left: string, right: string): -1 | 0 | 1 {
  if (!isValidDateOnly(left) || !isValidDateOnly(right)) throw new Error('Tanggal event tidak valid.');
  return left < right ? -1 : left > right ? 1 : 0;
}

export function normalizeDateRange(start: string, end = start): DateRange {
  if (!isValidDateOnly(start) || !isValidDateOnly(end)) throw new Error('Tanggal event tidak valid.');
  if (compareDateOnly(end, start) < 0) throw new Error('Tanggal selesai tidak boleh sebelum tanggal mulai.');
  return { start, end };
}

const dateParts = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const parts = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).formatToParts(date);
  return {
    day: parts.find(part => part.type === 'day')!.value,
    month: parts.find(part => part.type === 'month')!.value,
    year: parts.find(part => part.type === 'year')!.value,
  };
};

export function formatDateRange(start: string, end = start): string {
  normalizeDateRange(start, end);
  const from = dateParts(start);
  const to = dateParts(end);
  if (start === end) return `${from.day} ${from.month} ${from.year}`;
  if (from.year === to.year && from.month === to.month) return `${from.day}–${to.day} ${from.month} ${from.year}`;
  return `${from.day} ${from.month}${from.year === to.year ? '' : ` ${from.year}`} – ${to.day} ${to.month} ${to.year}`;
}
