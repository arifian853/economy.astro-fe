import { toMinor, minorDigits, type Money } from './money';
import { convertReference, normalizeFx } from './fx';
import { validateInitialBudget } from './final-statement';
import { normalizeDateRange } from './date-range';
import type { EventCurrency, InitialBudgetSnapshot, TransactionFx } from '../types';
export type PublicEventEntry = {
  type: 'expense'; name: string; amount: Money; source: 'cash' | 'digital'; transactionAt: string;
} & Omit<TransactionFx, 'baseCurrency'>;
export type PublicBudgetSummary = {
  budget: Money; cashBudget: Money | null; digitalBudget: Money | null;
  totalExpenses: Money; cashExpenses: Money; digitalExpenses: Money;
  totalRemaining: Money; cashRemaining: Money | null; digitalRemaining: Money | null;
};
export type PublicEventData = {
  event: { name: string; eventDate: string; eventEndDate: string; status?: 'upcoming' | 'active' | 'completed'; updatedAt?: string } & InitialBudgetSnapshot & Omit<EventCurrency, 'currencyLocked'>;
  budgetSummary: PublicBudgetSummary; entries: PublicEventEntry[]; participants: string[];
};
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
// Public responses must match the backend projection. Fail closed on owner/private fields.
const onlyKeys = (value: Record<string, unknown>, allowed: readonly string[]) => Object.keys(value).every(key => allowed.includes(key));
const eventKeys = ['name', 'eventDate', 'eventEndDate', 'status', 'updatedAt', 'initialBudget', 'initialBudgetKnown', 'currencyMode', 'baseCurrency', 'fxReferenceRateToIdr', 'fxReferenceDate', 'fxReferenceProvider'];
const summaryKeys = ['budget', 'cashBudget', 'digitalBudget', 'totalExpenses', 'cashExpenses', 'digitalExpenses', 'totalRemaining', 'cashRemaining', 'digitalRemaining'];
const entryKeys = ['type', 'name', 'amount', 'source', 'transactionAt', 'fxRateToIdr', 'fxRateDate', 'fxRateProvider', 'idrEquivalent'];
function money(value: unknown, currency: string, signed = false): Money {
  if (typeof value !== 'number' && typeof value !== 'string') throw Error('Invalid money');
  if (typeof value === 'string' && value.length > 100) throw Error('Invalid money');
  const minor = toMinor(value, currency);
  if (!signed && minor < 0n) throw Error('Negative money');
  return value;
}
export function normalizePublicEvent(value: unknown): PublicEventData | null {
  try {
    if (!isRecord(value) || !isRecord(value.event) || !isRecord(value.budgetSummary) || !Array.isArray(value.entries) || !Array.isArray(value.participants)) return null;
    if (!onlyKeys(value, ['event', 'budgetSummary', 'entries', 'participants']) || !onlyKeys(value.event, eventKeys) || !onlyKeys(value.budgetSummary, summaryKeys)) return null;
    const rawEvent = value.event;
    const { name, eventDate, eventEndDate } = rawEvent;
    if (typeof name !== 'string' || !name.trim() || typeof eventDate !== 'string' || typeof eventEndDate !== 'string') return null;
    const dateRange = normalizeDateRange(eventDate, eventEndDate);
    const event: PublicEventData['event'] = { name: name.trim(), eventDate: dateRange.start, eventEndDate: dateRange.end };
    const currency = rawEvent.baseCurrency === undefined ? 'IDR' : rawEvent.baseCurrency;
    if (typeof currency !== 'string') return null;
    minorDigits(currency);
    if (rawEvent.baseCurrency !== undefined) {
      const mode = rawEvent.currencyMode;
      if ((mode !== 'domestic' && mode !== 'international') || (mode === 'domestic' && currency !== 'IDR')) return null;
      const fx = normalizeFx(rawEvent.fxReferenceRateToIdr, rawEvent.fxReferenceDate, rawEvent.fxReferenceProvider, currency);
      Object.assign(event, { currencyMode: mode, baseCurrency: currency, fxReferenceRateToIdr: fx.rate, fxReferenceDate: fx.date, fxReferenceProvider: fx.provider });
    } else if (['currencyMode', 'fxReferenceRateToIdr', 'fxReferenceDate', 'fxReferenceProvider'].some(key => key in rawEvent)) return null;
    const hasInitial = Object.hasOwn(rawEvent, 'initialBudget');
    const hasKnown = Object.hasOwn(rawEvent, 'initialBudgetKnown');
    if (hasInitial !== hasKnown) return null;
    if (hasInitial) {
      if (typeof rawEvent.initialBudgetKnown !== 'boolean') return null;
      event.initialBudget = validateInitialBudget(rawEvent.initialBudget, currency);
      event.initialBudgetKnown = rawEvent.initialBudgetKnown;
    } else {
      // Old public responses are unknown. Never copy today's budget into an initial field.
      event.initialBudgetKnown = false;
    }
    // Legacy lifecycle hints remain optional; completion is never inferred from dates.
    if (rawEvent.status === 'upcoming' || rawEvent.status === 'active' || rawEvent.status === 'completed') event.status = rawEvent.status;
    if (typeof rawEvent.updatedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(rawEvent.updatedAt) && Number.isFinite(Date.parse(rawEvent.updatedAt))) event.updatedAt = rawEvent.updatedAt;
    const raw = value.budgetSummary;
    const summary: PublicBudgetSummary = {
      budget: money(raw.budget, currency), totalExpenses: money(raw.totalExpenses, currency),
      cashExpenses: money(raw.cashExpenses, currency), digitalExpenses: money(raw.digitalExpenses, currency),
      totalRemaining: money(raw.totalRemaining, currency, true),
      cashBudget: raw.cashBudget === null ? null : money(raw.cashBudget, currency),
      digitalBudget: raw.digitalBudget === null ? null : money(raw.digitalBudget, currency),
      cashRemaining: raw.cashRemaining === null ? null : money(raw.cashRemaining, currency, true),
      digitalRemaining: raw.digitalRemaining === null ? null : money(raw.digitalRemaining, currency, true),
    };
    const m = (amount: Money) => toMinor(amount, currency);
    const { budget, cashBudget, digitalBudget, totalExpenses, cashExpenses, digitalExpenses, totalRemaining, cashRemaining, digitalRemaining } = summary;
    const split = cashBudget !== null && digitalBudget !== null;
    if ((cashBudget === null) !== (digitalBudget === null) ||
      (split && m(cashBudget) + m(digitalBudget) !== m(budget)) ||
      m(totalExpenses) !== m(cashExpenses) + m(digitalExpenses) || m(totalRemaining) !== m(budget) - m(totalExpenses) ||
      (split && (cashRemaining === null || digitalRemaining === null || m(cashRemaining) !== m(cashBudget) - m(cashExpenses) || m(digitalRemaining) !== m(digitalBudget) - m(digitalExpenses))) ||
      (!split && (cashRemaining !== null || digitalRemaining !== null))) return null;
    const entries: PublicEventEntry[] = [];
    for (const raw of value.entries) {
      if (!isRecord(raw) || !onlyKeys(raw, entryKeys)) return null;
      if (raw.type !== 'expense') continue;
      if (typeof raw.name !== 'string' || !raw.name.trim() || (raw.source !== 'cash' && raw.source !== 'digital') || typeof raw.transactionAt !== 'string' || !Number.isFinite(Date.parse(raw.transactionAt))) return null;
      const entry: PublicEventEntry = { type: 'expense', name: raw.name.trim(), amount: money(raw.amount, currency), source: raw.source, transactionAt: raw.transactionAt };
      const hasFx = ['fxRateToIdr', 'fxRateDate', 'fxRateProvider', 'idrEquivalent'].some(key => key in raw);
      if (hasFx) {
        const fx = normalizeFx(raw.fxRateToIdr, raw.fxRateDate, raw.fxRateProvider, currency);
        Object.assign(entry, { fxRateToIdr: fx.rate, fxRateDate: fx.date, fxRateProvider: fx.provider,
          idrEquivalent: fx.rate === null ? null : convertReference(entry.amount, currency, fx.rate, 'to-idr') });
      }
      entries.push(entry);
    }
    const entryTotal = entries.reduce((sum, e) => sum + m(e.amount), 0n);
    const entryCash = entries.filter(e => e.source === 'cash').reduce((sum, e) => sum + m(e.amount), 0n);
    if (entryTotal !== m(totalExpenses) || entryCash !== m(cashExpenses) || entryTotal - entryCash !== m(digitalExpenses)) return null;
    if (value.participants.length > 100) return null;
    const participants: string[] = [];
    for (const name of value.participants) {
      if (typeof name !== 'string') return null;
      const trimmed = name.trim();
      if (!trimmed || trimmed.length > 100) return null;
      participants.push(trimmed);
    }
    return { event, budgetSummary: summary, entries, participants };
  } catch { return null; }
}
