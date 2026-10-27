import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../pages/event/[id].astro', import.meta.url), 'utf8');

test('event reads financial state then expense action then ledger then contextual inspector', () => {
  const positions = ['id="summary-remaining"', 'id="btn-add-transaction"', 'id="transactions-tbody"', 'id="financial-inspector"'].map(text => page.indexOf(text));
  expect(positions.every(position => position >= 0)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
});
test('owner ledger uses disclosure rows and preserves evidence and CRUD actions', () => {
  expect(page).toContain('<ol id="transactions-tbody"');
  expect(page).not.toContain('<table');
  expect(page).toContain('document.createElement("details")');
  expect(page).toContain('/evidence');
  expect(page).toContain('mode: "edit", tx');
  expect(page).toContain('method: "DELETE"');
});
