import { describe, expect, test } from 'bun:test';
import { compareDateOnly, formatDateRange, isValidDateOnly, normalizeDateRange } from './date-range';

describe('date-only event ranges', () => {
  test('validates real calendar days including leap years without timezone conversion', () => {
    expect(isValidDateOnly('2028-02-29')).toBe(true);
    expect(isValidDateOnly('2026-02-29')).toBe(false);
    expect(isValidDateOnly('2026-02-31')).toBe(false);
    expect(isValidDateOnly('2026-2-03')).toBe(false);
    expect(isValidDateOnly('2026-10-03T00:00:00Z')).toBe(false);
  });

  test('compares date-only strings and normalizes legacy single-day ranges', () => {
    expect(compareDateOnly('2026-10-11', '2026-10-12')).toBe(-1);
    expect(normalizeDateRange('2026-10-11')).toEqual({ start: '2026-10-11', end: '2026-10-11' });
    expect(normalizeDateRange('2026-10-11', '2026-10-12')).toEqual({ start: '2026-10-11', end: '2026-10-12' });
    expect(() => normalizeDateRange('2026-10-12', '2026-10-11')).toThrow();
    expect(() => normalizeDateRange('2026-02-31')).toThrow();
  });

  test('formats single month, cross-month and cross-year ranges in Indonesian', () => {
    expect(formatDateRange('2026-10-10', '2026-10-10')).toBe('10 Oktober 2026');
    expect(formatDateRange('2026-10-10', '2026-10-12')).toBe('10–12 Oktober 2026');
    expect(formatDateRange('2026-10-30', '2026-11-02')).toBe('30 Oktober – 2 November 2026');
    expect(formatDateRange('2026-12-30', '2027-01-02')).toBe('30 Desember 2026 – 2 Januari 2027');
  });
});
