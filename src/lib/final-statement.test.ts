import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import type { EventDetail } from '../types';
import { initialBudgetStatement, ownerFinalStatement, INITIAL_BUDGET_UNAVAILABLE } from './final-statement';
import { normalizePublicEvent } from './public-view';
import { toMinor } from './money';

const detail: EventDetail = {
  event: {
    id: 'synthetic-event', name: 'Acara uji', eventDate: '2026-10-23', status: 'completed',
    budget: '100.01', initialBudget: '80.25', initialBudgetKnown: true,
    cashBudget: '40', digitalBudget: '60.01', currencyMode: 'international', baseCurrency: 'SGD',
    fxReferenceRateToIdr: '12000.5', fxReferenceDate: '2026-10-23', fxReferenceProvider: 'Frankfurter v2',
    notes: null, createdAt: '2026-10-23T10:00:00Z', updatedAt: '2026-10-23T12:00:00Z', completedAt: '2026-10-23T12:00:00Z',
  },
  participants: ['Ayu', 'Bima', 'Citra'].map(name => ({ id: name, name })),
  transactions: [{ id: 'synthetic-tx', eventId: 'synthetic-event', name: 'Konsumsi', quantity: 3, unitPrice: '0.1', paymentMethod: 'cash', note: null, transactionAt: '2026-10-23T11:00:00Z' }],
};
const publicPayload = {
  event: {
    name: 'Acara uji', eventDate: '2026-10-23', status: 'completed', currencyMode: 'international', baseCurrency: 'SGD',
    fxReferenceRateToIdr: '12000.5', fxReferenceDate: '2026-10-23', fxReferenceProvider: 'Frankfurter v2',
  },
  budgetSummary: { budget: '100.01', cashBudget: '40', digitalBudget: '60.01', totalExpenses: '0.3', cashExpenses: '0.3', digitalExpenses: '0', totalRemaining: '99.71', cashRemaining: '39.7', digitalRemaining: '60.01' },
  entries: [{ type: 'expense', name: 'Konsumsi', amount: '0.3', source: 'cash', transactionAt: '2026-10-23T11:00:00Z' }],
};

describe('owner Final Statement', () => {
  test('keeps the known initial snapshot distinct from the final budget, channels and exact settlement', () => {
    const statement = ownerFinalStatement(detail);
    expect(statement.initial).toEqual({ amount: '80.25', unavailable: null });
    expect(statement.finalBudget).toBe('100.01');
    expect(statement.currency).toBe('SGD');
    expect(statement.channels).toMatchObject({ totalExpenses: '0.30', totalRemaining: '99.71', cashRemaining: '39.70', digitalRemaining: '60.01' });
    expect(statement.outcome).toEqual({ kind: 'surplus', amount: '99.71' });
    expect(statement.settlement).toEqual({ share: '33.23', remainder: '0.02' });
    expect(toMinor(statement.settlement!.share, 'SGD') * 3n + toMinor(statement.settlement!.remainder, 'SGD')).toBe(toMinor(statement.channels.totalRemaining, 'SGD'));
    expect(statement.participants).toEqual(detail.participants);
    expect(statement.reference).toEqual({ rate: '12000.5', date: '2026-10-23', provider: 'Frankfurter v2' });
  });

  test('unknown legacy snapshots never display their placeholder or infer an initial amount', () => {
    for (const snapshot of [{ initialBudgetKnown: false, initialBudget: '100.01' }, { initialBudgetKnown: false, initialBudget: '57.25' }, { initialBudgetKnown: undefined, initialBudget: undefined }]) {
      const statement = ownerFinalStatement({ ...detail, event: { ...detail.event, ...snapshot } });
      expect(statement.initial).toEqual({ amount: null, unavailable: INITIAL_BUDGET_UNAVAILABLE });
      expect(statement.finalBudget).toBe('100.01');
      expect(statement.settlement).toEqual({ share: '33.23', remainder: '0.02' });
    }
  });

  test('deficit, zero and missing participants retain the final totals without inventing a distribution', () => {
    for (const budget of ['0.20', '0.30']) {
      const statement = ownerFinalStatement({ ...detail, event: { ...detail.event, budget, cashBudget: null } });
      expect(statement.outcome.kind).toBe(budget === '0.20' ? 'deficit' : 'balanced');
      expect(statement.settlement).toBeNull();
      expect(statement.participants).toHaveLength(3);
      expect(statement.initial.amount).toBe('80.25');
    }
    expect(ownerFinalStatement({ ...detail, participants: [] }).settlement).toBeNull();
  });

  test('formats no false initial claim on malformed owner snapshots and keeps large amounts exact', () => {
    for (const initialBudget of [undefined, '0', '-1', '1.001', Number.MAX_SAFE_INTEGER + 1]) {
      expect(initialBudgetStatement({ initialBudgetKnown: true, initialBudget }, 'SGD').amount).toBeNull();
    }
    expect(initialBudgetStatement({ initialBudgetKnown: true, initialBudget: '9223372036854775806.99' }, 'SGD').amount).toBe('9223372036854775806.99');
  });
});

describe('public initial-budget projection and statement', () => {
  test('known and unknown snapshots remain independent of the final budget and frozen reference', () => {
    for (const initialBudgetKnown of [true, false]) {
      const view = normalizePublicEvent({ ...publicPayload, event: { ...publicPayload.event, initialBudgetKnown, initialBudget: '80.25' } });
      expect(view).not.toBeNull();
      expect(view!.event.initialBudget).toBe('80.25');
      expect(view!.event.initialBudgetKnown).toBe(initialBudgetKnown);
      expect(initialBudgetStatement(view!.event, 'SGD')).toEqual(initialBudgetKnown
        ? { amount: '80.25', unavailable: null } : { amount: null, unavailable: INITIAL_BUDGET_UNAVAILABLE });
      expect(view!.budgetSummary.budget).toBe('100.01');
      expect(view!.event.fxReferenceRateToIdr).toBe('12000.5');
      expect(view!.event.fxReferenceDate).toBe('2026-10-23');
      expect(view!.event.status).toBe('completed');
    }
  });

  test('old international and IDR responses are explicitly unknown without deriving any initial amount', () => {
    const legacyIdr = { event: { name: 'Uji IDR', eventDate: '2026-10-23', status: 'completed' }, budgetSummary: { budget: 100, cashBudget: null, digitalBudget: null, totalExpenses: 0, cashExpenses: 0, digitalExpenses: 0, totalRemaining: 100, cashRemaining: null, digitalRemaining: null }, entries: [] };
    for (const payload of [publicPayload, legacyIdr]) {
      const view = normalizePublicEvent(payload);
      expect(view).not.toBeNull();
      expect(view!.event.initialBudgetKnown).toBe(false);
      expect(Object.hasOwn(view!.event, 'initialBudget')).toBe(false);
      expect(initialBudgetStatement(view!.event, view!.event.baseCurrency)).toEqual({ amount: null, unavailable: INITIAL_BUDGET_UNAVAILABLE });
    }
  });

  test('validates positive exact initial amount, magnitude, currency precision and both snapshot fields', () => {
    const project = (snapshot: Record<string, unknown>) => normalizePublicEvent({ ...publicPayload, event: { ...publicPayload.event, ...snapshot } });
    for (const initialBudgetKnown of [true, false]) {
      for (const initialBudget of ['0.001', '9223372036854775807.01', '0', '-1', 'NaN', '1e2', Infinity, Number.MAX_SAFE_INTEGER + 1, null, {}, 'private-path']) {
        expect(project({ initialBudgetKnown, initialBudget })).toBeNull();
      }
      expect(project({ initialBudgetKnown, initialBudget: '9223372036854775806.99' })?.event.initialBudget).toBe('9223372036854775806.99');
    }
    for (const initialBudgetKnown of ['true', 'false', 1, null, undefined]) expect(project({ initialBudgetKnown, initialBudget: '1' })).toBeNull();
    expect(project({ initialBudgetKnown: true })).toBeNull();
    expect(project({ initialBudget: '1' })).toBeNull();
    expect(project({ initialBudgetKnown: true, initialBudget: undefined })).toBeNull();
    for (const [baseCurrency, initialBudget, valid] of [['JPY', '1.1', false], ['KWD', '1.234', true], ['KWD', '1.2345', false], ['IDR', '1.1', false]] as const) {
      // Whole-valued totals isolate initial-budget precision for each ISO currency.
      const payload = { ...publicPayload, event: { ...publicPayload.event, baseCurrency, currencyMode: 'international', initialBudgetKnown: true, initialBudget }, budgetSummary: { budget: '100', cashBudget: null, digitalBudget: null, totalExpenses: '0', cashExpenses: '0', digitalExpenses: '0', totalRemaining: '100', cashRemaining: null, digitalRemaining: null }, entries: [] };
      payload.event.fxReferenceRateToIdr = baseCurrency === 'IDR' ? '1' : '12000.5';
      const result = normalizePublicEvent({ ...payload, event: { ...payload.event, fxReferenceDate: baseCurrency === 'IDR' ? null : '2026-10-23', fxReferenceProvider: baseCurrency === 'IDR' ? 'identity' : 'Frankfurter v2' } });
      expect(result !== null).toBe(valid);
    }
  });

  test('rejects malformed/mismatched currency assertions, partial FX and all private fields', () => {
    for (const patch of [{ baseCurrency: null }, { baseCurrency: 'XYZ' }, { baseCurrency: 'sgd' }, { currencyMode: 'domestic' }, { currency: 'USD' }, { initialBudgetCurrency: 'USD' }, { ownerId: 'private' }, { notes: 'private' }, { participants: [] }, { fxReferenceProvider: 'https://private.example/key' }]) {
      expect(normalizePublicEvent({ ...publicPayload, event: { ...publicPayload.event, ...patch } })).toBeNull();
    }
    expect(normalizePublicEvent({ ...publicPayload, participants: [] })).toBeNull();
    expect(normalizePublicEvent({ ...publicPayload, budgetSummary: { ...publicPayload.budgetSummary, reason: 'private' } })).toBeNull();
    for (const patch of [{ currency: 'USD' }, { baseCurrency: 'USD' }, { note: 'private' }, { evidence: [] }, { fxRateDate: '2026-10-23' }]) {
      expect(normalizePublicEvent({ ...publicPayload, entries: [{ ...publicPayload.entries[0], ...patch }] })).toBeNull();
    }
  });
});

test('owner and public statement renderers use the tested snapshot distinction and separate final rows', () => {
  const owner = readFileSync(new URL('../components/SettlementSummary.astro', import.meta.url), 'utf8');
  const page = readFileSync(new URL('../pages/share.astro', import.meta.url), 'utf8');
  expect(owner).toContain('ownerFinalStatement(detail)');
  expect(owner).toContain('initialRow.hidden = initial.amount === null');
  expect(owner).toContain('id="report-initial-unavailable"');
  expect(owner).toContain('Anggaran akhir');
  expect(owner).toContain('statement.settlement!');
  expect(page).toContain('initialBudgetStatement(view.event, currency)');
  expect(page).toContain('initialRow.hidden = !completed || initial.amount === null');
  expect(page).toContain("completed ? 'Anggaran akhir' : 'Anggaran total'");
  expect(page).toContain('public-initial-unavailable');
});
