import { describe, expect, test } from 'bun:test';
import { formatCurrency } from './currency';
import { toMinor, fromMinor, multiplyMoney, sumMoney, subtractMoney, splitMoney } from './money';

describe('exact money', () => {
  test('formats complete Indonesian rupiah without abbreviations or spaces', () => {
    expect(formatCurrency('1250000')).toBe('Rp1.250.000');
    expect(formatCurrency('-100000')).toBe('-Rp100.000');
    expect(formatCurrency('9007199254740993123')).toBe('Rp9.007.199.254.740.993.123');
  });
  test('uses ISO minor digits and Indonesian decimal conventions', () => {
    expect(formatCurrency('17.00', 'SGD')).toBe('S$17,00');
    expect(formatCurrency('48.25', 'USD')).toBe('US$48,25');
    expect(formatCurrency('12500', 'JPY')).toBe('¥12.500');
    expect(formatCurrency('125.40', 'MYR')).toBe('RM125,40');
    expect(formatCurrency('12.345', 'KWD')).toContain('12,345');
  });
  test('arithmetic uses minor units without floating point drift', () => {
    expect(toMinor('0.29', 'SGD')).toBe(29n);
    expect(fromMinor(29n, 'SGD')).toBe('0.29');
    expect(sumMoney(['0.1', '0.2'], 'SGD')).toBe('0.30');
    expect(multiplyMoney('8.50', 2, 'SGD')).toBe('17.00');
    expect(subtractMoney('1', '0.9', 'SGD')).toBe('0.10');
    expect(splitMoney('10.01', 3, 'SGD')).toEqual({ share: '3.33', remainder: '0.02' });
    expect(splitMoney('10000', 3)).toEqual({ share: '3333', remainder: '1' });
  });
  test('rejects unsupported precision, unsafe numeric transport and invalid quantities', () => {
    for (const value of ['1.1', 'NaN', '1e6', '1,23', '']) expect(() => toMinor(value)).toThrow();
    expect(() => toMinor('1.001', 'SGD')).toThrow();
    expect(() => toMinor(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    expect(toMinor('9007199254740992')).toBe(9007199254740992n);
    expect(() => multiplyMoney('10', 1.5)).toThrow();
    expect(() => splitMoney('10', 0)).toThrow();
  });
});
