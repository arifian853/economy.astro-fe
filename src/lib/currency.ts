import { toMinor, minorDigits, type Money } from './money';

const symbols: Record<string, string> = { IDR: 'Rp', SGD: 'S$', USD: 'US$', JPY: '¥', MYR: 'RM' };
export function formatCurrency(value: Money, currency = 'IDR'): string {
  const amount = toMinor(value, currency);
  const digits = minorDigits(currency);
  const absolute = amount < 0n ? -amount : amount;
  const factor = 10n ** BigInt(digits);
  const whole = (absolute / factor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fraction = digits ? `,${(absolute % factor).toString().padStart(digits, '0')}` : '';
  const symbol = symbols[currency] ?? new Intl.NumberFormat('id-ID', { style: 'currency', currency }).formatToParts(0).find(part => part.type === 'currency')!.value;
  return `${amount < 0n ? '-' : ''}${symbol}${/^[A-Z]{3}$/.test(symbol) ? ' ' : ''}${whole}${fraction}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(isoStr: string): string {
  if (!isoStr) return "-";
  try {
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoStr;
  }
}

export function formatPaymentMethod(method: string): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "transfer":
      return "Transfer";
    case "qris":
      return "QRIS";
    case "ewallet":
      return "E-Wallet";
    case "other":
      return "Lainnya";
    default:
      return method;
  }
}
