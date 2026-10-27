import { expect, test } from 'bun:test';
import { calculateBudgetChannels } from './budget-channels';
import { getBudgetOutcome } from './event-lifecycle';
import { parseMoneyInput, formatMoneyValue, formatMoneyInputState } from './money-input';
import { convertReference, referenceLabel, normalizeFx, currencyChangeNotice } from './fx';
import { moneyPercent } from './money';

test('international inputs produce exact major-unit strings and reject overprecision', () => {
  expect(parseMoneyInput('1.234,56', 'SGD')).toBe('1234.56');
  expect(parseMoneyInput('9.223.372.036.854.775.807', 'IDR')).toBe('9223372036854775807');
  expect(parseMoneyInput('1,001', 'SGD')).toBeNull();
  expect(parseMoneyInput('1,2', 'JPY')).toBeNull();
  expect(parseMoneyInput('1,234', 'KWD')).toBe('1.234');
  expect(parseMoneyInput('9223372036854775808', 'IDR')).toBeNull();
  expect(formatMoneyValue('1234.50', 'SGD')).toBe('1.234,50');
  expect(formatMoneyInputState('1234,5', 6, 'SGD')).toEqual({ value: '1.234,5', caret: 7 });
});
test('channels, outcome and progress preserve fractional and large amounts', () => {
  const channels = calculateBudgetChannels('9007199254740993.31', '0.10', [
    { quantity: 3, unitPrice: '0.1', paymentMethod: 'cash' },
    { quantity: 2, unitPrice: '0.2', paymentMethod: 'qris' },
  ], 'SGD');
  expect(channels.totalExpenses).toBe('0.70');
  expect(channels.cashRemaining).toBe('-0.20');
  expect(channels.totalRemaining).toBe('9007199254740992.61');
  expect(getBudgetOutcome('0.1', '0.3', 'SGD')).toEqual({ kind: 'deficit', amount: '0.20' });
  expect(moneyPercent('0.3', '1', 'SGD')).toBe(30);
  expect(moneyPercent('9223372036854775807', '1')).toBe(100);
});
test('bidirectional converter rounds half up in target minor units without Number', () => {
  expect(convertReference('0.01', 'SGD', '12000.5', 'to-idr')).toBe('120');
  expect(convertReference('12000', 'SGD', '12000', 'from-idr')).toBe('1.00');
  expect(convertReference('1', 'KWD', '3', 'from-idr')).toBe('0.333');
  expect(convertReference('1', 'JPY', '2', 'from-idr')).toBe('1');
  expect(convertReference('9007199254740993.01', 'SGD', '1', 'to-idr')).toBe('9007199254740993');
  expect(() => convertReference('1', 'SGD', '0', 'from-idr')).toThrow();
});
test('FX metadata has honest unavailable, older, stale and frozen labels', () => {
  expect(normalizeFx(null, null, null, 'SGD')).toEqual({ rate: null, date: null, provider: null });
  expect(() => normalizeFx('1', '2026-02-30', 'test', 'SGD')).toThrow();
  const fx = { rate: '12000.5', date: '2026-10-23', provider: 'Frankfurter v2' };
  expect(referenceLabel(fx, false, false, '2026-10-27')).toContain('lama');
  expect(referenceLabel(fx, false, true, '2026-10-23')).toContain('cache');
  expect(referenceLabel(fx, true)).toContain('dibekukan');
  expect(referenceLabel({ rate: null, date: null, provider: null }, false)).toContain('tidak tersedia');
});
test('currency changes explicitly disclose retained budgets and reject unrepresentable allocation', () => {
  expect(currencyChangeNotice({ baseCurrency: 'SGD', budget: '100', cashBudget: '20' }, 'USD')).toContain('US$100,00');
  expect(currencyChangeNotice({ baseCurrency: 'SGD', budget: '100', cashBudget: '20' }, 'USD')).toContain('S$100,00');
  expect(() => currencyChangeNotice({ baseCurrency: 'SGD', budget: '100.01', cashBudget: null }, 'JPY')).toThrow();
});

import { normalizePublicEvent } from './public-view';
const publicInternational = {
  event: { name: 'Singapore', eventDate: '2026-10-23', eventEndDate: '2026-10-23', status: 'completed', updatedAt: '2026-10-23T12:00:00Z', currencyMode: 'international', baseCurrency: 'SGD', fxReferenceRateToIdr: '12000.5', fxReferenceDate: '2026-10-23', fxReferenceProvider: 'Frankfurter v2' },
  budgetSummary: { budget: '1', cashBudget: '0.5', digitalBudget: '0.5', totalExpenses: '0.3', cashExpenses: '0.1', digitalExpenses: '0.2', totalRemaining: '0.7', cashRemaining: '0.4', digitalRemaining: '0.3' },
  entries: [
    { type: 'expense', name: 'Cash', amount: '0.1', source: 'cash', transactionAt: '2026-10-23T11:00:00Z', fxRateToIdr: '12000.5', fxRateDate: '2026-10-22', fxRateProvider: 'Frankfurter v2', idrEquivalent: '999999' },
    { type: 'expense', name: 'Digital', amount: '0.2', source: 'digital', transactionAt: '2026-10-23T12:00:00Z', fxRateToIdr: null, fxRateDate: null, fxRateProvider: null, idrEquivalent: null },
  ],
  participants: [],
};
test('public international projection preserves frozen currency, uses snapshots and rejects private fields', () => {
  const result = normalizePublicEvent(publicInternational);
  expect(result?.event.baseCurrency).toBe('SGD');
  expect(result?.event.fxReferenceRateToIdr).toBe('12000.5');
  expect(result?.entries[0].idrEquivalent).toBe('1200');
  expect(result?.entries[0].fxRateDate).toBe('2026-10-22');
  expect(result?.entries[1].idrEquivalent).toBeNull();
  expect(JSON.stringify(result)).not.toContain('private-');
  expect(normalizePublicEvent({ ...publicInternational, event: { ...publicInternational.event, ownerId: 'private-owner' } })).toBeNull();
  expect(normalizePublicEvent({ ...publicInternational, entries: [{ ...publicInternational.entries[0], evidence: 'private-evidence' }, publicInternational.entries[1]] })).toBeNull();
  expect(normalizePublicEvent({ ...publicInternational, event: { ...publicInternational.event, currencyMode: 'domestic' } })).toBeNull();
  expect(normalizePublicEvent({ ...publicInternational, budgetSummary: { ...publicInternational.budgetSummary, totalExpenses: '0.30000000000000004' } })).toBeNull();
});

import { normalizeCurrencies } from './fx';
test('currency picker consumes only validated API options without inventing fallback international choices', () => {
  expect(normalizeCurrencies([
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', minorUnits: 2 },
    { code: 'XYZ', name: 'Invented', symbol: 'X', minorUnits: 2 },
    { code: 'JPY', name: 'Incorrect precision', symbol: 'Y', minorUnits: 2 },
  ]).map(item => item.code)).toEqual(['SGD']);
  expect(() => normalizeCurrencies({ currencies: [] })).toThrow();
});
test('public international view rejects malformed snapshots and unsafe numeric money', () => {
  for (const entry of [
    { ...publicInternational.entries[0], fxRateToIdr: '0' },
    { ...publicInternational.entries[0], fxRateProvider: 'https://private.example/key' },
    { ...publicInternational.entries[0], fxRateDate: '2099-01-01' },
    { ...publicInternational.entries[0], fxRateToIdr: null },
  ]) expect(normalizePublicEvent({ ...publicInternational, entries: [entry, publicInternational.entries[1]] })).toBeNull();
  expect(normalizePublicEvent({ ...publicInternational, budgetSummary: { ...publicInternational.budgetSummary, budget: Number.MAX_SAFE_INTEGER + 1 } })).toBeNull();
});
test('malformed grouped paste stays visible instead of changing its monetary value', () => {
  expect(formatMoneyInputState('1.2', 3, 'SGD', 'insertFromPaste')).toEqual({ value: '1.2', caret: 3 });
  expect(parseMoneyInput('1.2', 'SGD')).toBeNull();
  expect(formatMoneyInputState('1.234,56', 8, 'SGD', 'insertFromPaste').value).toBe('1.234,56');
});
