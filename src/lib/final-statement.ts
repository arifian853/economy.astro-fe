import type { EventDetail, InitialBudgetSnapshot } from '../types';
import { calculateBudgetChannels } from './budget-channels';
import { getBudgetOutcome } from './event-lifecycle';
import { eventReference } from './fx';
import { minorDigits, splitMoney, toMinor, type Money } from './money';

export const INITIAL_BUDGET_UNAVAILABLE = 'Anggaran awal historis tidak tersedia.';

/** Validate the backend snapshot independently of today's budget or adjustment history. */
export function validateInitialBudget(value: unknown, currency = 'IDR'): Money {
  if ((typeof value !== 'number' && typeof value !== 'string') || String(value).length > 100) throw Error('Invalid initial budget');
  const minor = toMinor(value, currency);
  if (minor <= 0n || minor > 9223372036854775807n * 10n ** BigInt(minorDigits(currency))) throw Error('Invalid initial budget');
  return value;
}

export function initialBudgetStatement(snapshot: InitialBudgetSnapshot, currency = 'IDR') {
  if (snapshot.initialBudgetKnown === true) {
    try {
      return { amount: validateInitialBudget(snapshot.initialBudget, currency), unavailable: null };
    } catch { /* Fail closed for a malformed owner response too. */ }
  }
  return { amount: null, unavailable: INITIAL_BUDGET_UNAVAILABLE };
}

export function ownerFinalStatement({ event, participants = [], transactions = [] }: EventDetail) {
  const currency = event.baseCurrency ?? 'IDR';
  const channels = calculateBudgetChannels(event.budget, event.cashBudget, transactions, currency);
  const outcome = getBudgetOutcome(event.budget, channels.totalExpenses, currency);
  return {
    currency,
    initial: initialBudgetStatement(event, currency),
    finalBudget: event.budget,
    channels,
    outcome,
    participants,
    settlement: outcome.kind === 'surplus' && participants.length > 0
      ? splitMoney(channels.totalRemaining, participants.length, currency) : null,
    reference: eventReference(event),
  };
}
