import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
const home = readFileSync(new URL('../pages/index.astro', import.meta.url), 'utf8');
test('gate uses a synthetic exact ledger specimen before login', () => {
  expect(home).toContain('Spend together.');
  expect(home).toContain('Rp1.275.000');
  expect(home).toContain('Contoh ilustrasi');
});
test('home groups lifecycle states with active first', () => {
  expect(home).toContain('["active", "upcoming", "completed"]');
  expect(home).toContain('lifecycleGroups.get(ev.status)');
});
