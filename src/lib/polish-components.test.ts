import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const currency = readFileSync(new URL('../components/CurrencyCombobox.astro', import.meta.url), 'utf8');
const range = readFileSync(new URL('../components/EventDateRangePicker.astro', import.meta.url), 'utf8');

test('currency control exposes an accessible keyboard combobox and decoupled event contract', () => {
  expect(currency).toContain('role="combobox"');
  expect(currency).toContain('role="listbox"');
  expect(currency).toContain('economy:currency-options');
  expect(currency).toContain('economy:currency-value');
  expect(currency).toContain('economy:currency-selected');
  expect(currency).toContain('Escape');
  expect(currency).toContain('type="search"');
  expect(currency).toContain('currency-layer');
  expect(currency).toContain('currency-scrim');
  expect(currency).toContain('role="dialog"');
  expect(currency).toContain('aria-activedescendant');
  expect(currency).toMatch(/min-height:\s*44px/);
  expect(currency).not.toMatch(/<select\b/i);
});

test('date range picker renders hidden date-only fields and custom Indonesian calendar contract', () => {
  expect(range).toContain('economy:date-range-selected');
  expect(range).toContain('role="grid"');
  expect(range).toContain('formatDateRange');
  expect(range).toContain('type="hidden"');
  expect(range).toContain("new Event('input'");
  expect(range).toContain("new Event('change'");
  expect(range).toContain('Escape');
  expect(range).toContain('range-scrim');
  expect(range).toContain('button.dataset.date=key');
  expect(range).not.toMatch(/type="date"|<input[^>]+type="date"/i);
});
