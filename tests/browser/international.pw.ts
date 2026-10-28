import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { calculateBudgetChannels } from '../../src/lib/budget-channels';
import { convertReference } from '../../src/lib/fx';
import { subtractMoney, sumMoney } from '../../src/lib/money';
import type { EventDetail, Transaction } from '../../src/types';
const origin = 'https://economy.test';
const id = '00000000-0000-4000-8000-000000000001';
const at = '2026-10-23T10:00:00Z';
const currencies = [
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', minorUnits: 0 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', minorUnits: 2 },
  { code: 'USD', name: 'US Dollar', symbol: 'US$', minorUnits: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', minorUnits: 0 },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KWD', minorUnits: 3 },
  { code: 'AED', name: 'United Arab Emirates Dirham', symbol: 'د.إ', minorUnits: 2 },
  { code: 'AMD', name: 'Armenian Dram', symbol: '֏', minorUnits: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', minorUnits: 2 },
];
async function fixture(page: Page, options: { currency?: string; empty?: boolean; cash?: null; completed?: boolean; offline?: boolean; registryOffline?: boolean; large?: boolean; locked?: boolean; snapshot?: 'known' | 'unknown' } = {}) {
  const currency = options.currency ?? 'SGD';
  const event: EventDetail['event'] = {
    id, name: 'Singapore bersama', eventDate: '2026-10-23', budget: options.large ? '9007199254740993.01' : currency === 'IDR' || currency === 'JPY' ? '100' : '100.01',
    cashBudget: options.cash === null ? null : '40', digitalBudget: null,
    currencyMode: currency === 'IDR' ? 'domestic' : 'international', baseCurrency: currency,
    currencyLocked: !!options.locked || !options.empty,
    fxReferenceRateToIdr: options.offline ? null : currency === 'IDR' ? '1' : '12000.5',
    fxReferenceDate: options.offline || currency === 'IDR' ? null : '2026-10-23',
    fxReferenceProvider: options.offline ? null : currency === 'IDR' ? 'identity' : 'Frankfurter v2',
    status: options.completed ? 'completed' : 'active', completedAt: options.completed ? at : null, notes: null, createdAt: at, updatedAt: at,
    ...(options.snapshot ? { initialBudget: '80.25', initialBudgetKnown: options.snapshot === 'known' } : {}),
  };
  const tx: Transaction[] = options.empty ? [] : [{ id: 'tx-local', eventId: id, name: 'Makan bersama', quantity: 3, unitPrice: currency === 'IDR' || currency === 'JPY' ? '10' : '0.1', paymentMethod: 'cash', note: 'private-note', transactionAt: at, baseCurrency: currency,
    fxRateToIdr: options.offline ? null : currency === 'IDR' ? '1' : '10000', fxRateDate: options.offline || currency === 'IDR' ? null : '2026-10-22', fxRateProvider: options.offline ? null : currency === 'IDR' ? 'identity' : 'Snapshot provider', idrEquivalent: options.offline ? null : currency === 'IDR' ? '30' : '3000' }];
  const state = { event, tx, writes: [] as { path: string; body: any }[], requests: [] as { path: string; headers: Record<string, string> }[], errors: [] as string[], conflict: false, failPublic: false, revoked: false, rateStale: false, failRate: false, fxCalls: 0, publicCalls: 0, reallocations: [] as any[], adjustments: [] as any[] };
  page.on('pageerror', error => state.errors.push(error.message));
  await page.addInitScript(() => {
    const exp = Math.floor(Date.now() / 1000) + 36000;
    const user = { id: 'local-owner', email: 'local@example.test', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-01-01T00:00:00Z' };
    const access = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: user.id, exp }))}.local`;
    localStorage.setItem('sb-auth-auth-token', JSON.stringify({ access_token: access, refresh_token: 'local-refresh', token_type: 'bearer', expires_in: 36000, expires_at: exp, user }));
  });
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname;
    if (url.origin !== origin) return route.fulfill({ status: 200, body: '', contentType: url.hostname === 'fonts.googleapis.com' ? 'text/css' : 'text/plain' });
    if (path.startsWith('/api/')) {
      state.requests.push({ path, headers: req.headers() });
      let body: unknown = {};
      const code = event.baseCurrency!;
      if (path === '/api/fx/currencies') return route.fulfill(options.registryOffline ? { status: 503, json: { error: 'offline' } } : { json: currencies });
      if (path === '/api/fx/rate') {
        state.fxCalls++;
        return route.fulfill(options.offline || state.failRate ? { status: 503, json: { error: 'offline' } } : { json: { base: code, quote: 'IDR', rate: '12000.5', rateDate: '2026-10-23', provider: 'Frankfurter v2', stale: state.rateStale } });
      }
      if (path === '/api/public/events') {
        state.publicCalls++;
        if (state.revoked) return route.fulfill({ status: 404, json: {} });
        if (state.failPublic) return route.fulfill({ status: 503, json: {} });
        const totals = calculateBudgetChannels(event.budget, event.cashBudget, tx, code);
        body = { event: { name: event.name, eventDate: event.eventDate, status: event.status, updatedAt: event.updatedAt, initialBudget: event.initialBudget, initialBudgetKnown: event.initialBudgetKnown, currencyMode: event.currencyMode, baseCurrency: event.baseCurrency, fxReferenceRateToIdr: event.fxReferenceRateToIdr, fxReferenceDate: event.fxReferenceDate, fxReferenceProvider: event.fxReferenceProvider }, budgetSummary: { budget: event.budget, ...totals }, entries: tx.map(item => ({ type: 'expense', name: item.name, amount: sumMoney(Array.from({ length: item.quantity }, () => item.unitPrice), code), source: item.paymentMethod === 'cash' ? 'cash' : 'digital', transactionAt: item.transactionAt, fxRateToIdr: item.fxRateToIdr, fxRateDate: item.fxRateDate, fxRateProvider: item.fxRateProvider, idrEquivalent: item.idrEquivalent })) };
      } else if (path.endsWith('/budget-history')) body = { reallocations: state.reallocations, adjustments: state.adjustments };
      else if (path.endsWith('/public-link')) body = { enabled: false, token: null };
      else if (req.method() !== 'GET') {
        const input = req.postData() ? req.postDataJSON() : {};
        state.writes.push({ path, body: input });
        if (state.conflict) return route.fulfill({ status: 409, json: { error: 'Mata uang terkunci setelah transaksi pertama.' } });
        if (path.endsWith('/transactions')) {
          event.currencyLocked = true;
          tx.push({ ...input, id: 'created-local', eventId: id, fxRateToIdr: options.offline ? null : '12000.5', fxRateDate: options.offline ? null : '2026-10-23', fxRateProvider: options.offline ? null : 'Frankfurter v2', idrEquivalent: options.offline ? null : convertReference(sumMoney(Array.from({ length: input.quantity }, () => input.unitPrice), code), code, '12000.5', 'to-idr') });
          body = tx.at(-1);
        } else if (path.endsWith('/complete')) { event.status = 'completed'; event.completedAt = at; body = event; }
        else if (path.endsWith('/reallocations')) {
          const delta = input.from === 'cash' ? `-${input.amount}` : input.amount;
          event.cashBudget = sumMoney([event.cashBudget!, delta], code);
          state.reallocations.push({ from_channel: input.from, amount: input.amount, note: input.note, created_at: at }); body = event;
        } else if (path.endsWith('/budget-adjustments')) {
          event.budget = sumMoney([event.budget, input.budgetDelta], code); event.cashBudget = sumMoney([event.cashBudget!, input.cashBudgetDelta], code);
          state.adjustments.push({ budget_delta: input.budgetDelta, cash_budget_delta: input.cashBudgetDelta, reason: input.reason, created_at: at }); body = event;
        } else if (path.includes('/transactions/')) {
          const index = tx.findIndex(item => path.endsWith(`/${item.id}`));
          if (req.method() === 'DELETE' && index >= 0) tx.splice(index, 1);
          else if (index >= 0) { Object.assign(tx[index], input); tx[index].idrEquivalent = tx[index].fxRateToIdr ? convertReference(sumMoney(Array.from({ length: tx[index].quantity }, () => tx[index].unitPrice), code), code, tx[index].fxRateToIdr!, 'to-idr') : null; }
          body = tx[index] ?? {};
        } else { Object.assign(event, input); body = event; }
      } else if (path === '/api/events') body = [{ ...event, totalExpenses: calculateBudgetChannels(event.budget, event.cashBudget, tx, code).totalExpenses, participantCount: 3 }];
      else body = { event: { ...event, digitalBudget: event.cashBudget === null ? null : subtractMoney(event.budget, event.cashBudget, code) }, participants: [{ id: '1', name: 'Ayu' }, { id: '2', name: 'Bima' }, { id: '3', name: 'Citra' }], transactions: tx };
      return route.fulfill({ json: body });
    }
    let asset = path.startsWith('/event/') ? '/event/index/' : path;
    if (asset.endsWith('/')) asset += 'index.html';
    const file = resolve('dist', `.${asset}`);
    if (!file.startsWith(resolve('dist') + '/')) return route.fulfill({ status: 404 });
    try { return route.fulfill({ body: await readFile(file), contentType: asset.endsWith('.html') ? 'text/html' : asset.endsWith('.js') ? 'text/javascript' : asset.endsWith('.css') ? 'text/css' : 'application/octet-stream' }); }
    catch { return route.fulfill({ status: 404 }); }
  });
  return state;
}
async function eventPage(page: Page) { await page.goto(`${origin}/event/${id}`); await expect(page.locator('#dashboard-content')).toBeVisible(); }
async function openEdit(page: Page) { await page.locator('#financial-inspector > details').last().locator('summary').click(); await page.locator('#btn-edit-event').click(); await expect(page.locator('#btn-submit-event')).toBeEnabled(); }
async function openChannels(page: Page) { await page.locator('#financial-inspector > details').first().locator('summary').first().click(); }
async function setCurrencyMode(page: Page, mode: 'domestic' | 'international') { await page.locator(`[data-currency-mode="${mode}"]`).click(); }
async function chooseCurrency(page: Page, code: string) {
  await page.locator('#event-currency-combobox-trigger').click();
  await page.locator('#event-currency-combobox-currency-input').fill(code);
  await page.locator(`.currency-option[data-code="${code}"]`).click();
}

test('ordinary owner detail refreshes reuse the same budget history read', async ({ page }) => {
  const state = await fixture(page); await eventPage(page);
  const historyReads = () => state.requests.filter(r => r.path.endsWith('/budget-history')).length;
  const detailReads = () => state.requests.filter(r => r.path === `/api/events/${id}`).length;
  await expect.poll(historyReads).toBe(1);
  const before = detailReads();
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('refresh-event-detail'));
    window.dispatchEvent(new CustomEvent('refresh-event-detail'));
  });
  await expect.poll(detailReads).toBeGreaterThan(before);
  await openChannels(page);
  await expect(page.locator('#cash-channel-budget')).toHaveText('S$40,00');
  expect(historyReads()).toBe(1);
  expect(state.errors).toEqual([]);
});

test('completed owner history loads once on panel disclosure and remains read-only', async ({ page }) => {
  const state = await fixture(page, { completed: true });
  state.reallocations.push({ from_channel: 'cash', amount: '0.01', note: 'Historical move', created_at: at });
  await eventPage(page);
  const historyReads = () => state.requests.filter(r => r.path.endsWith('/budget-history')).length;
  expect(historyReads()).toBe(0);
  await openChannels(page);
  await expect(page.locator('#budget-history-list')).toContainText('Historical move');
  expect(historyReads()).toBe(1);
  await expect(page.locator('#fund-move-details')).toBeHidden();
  await expect(page.locator('#budget-adjustment-details')).toBeHidden();
  await openChannels(page); await openChannels(page);
  await expect(page.locator('#budget-history-list')).toContainText('Historical move');
  expect(historyReads()).toBe(1);
  expect(state.writes).toEqual([]);
  expect(state.errors).toEqual([]);
});

for (const [code, amount, expected] of [['SGD', '1,25', '1.25'], ['USD', '1,25', '1.25'], ['JPY', '125', '125'], ['KWD', '1,234', '1.234']]) {
  test(`create international ${code} from API search with exact budget`, async ({ page }) => {
    const state = await fixture(page, { empty: true });
    await page.goto(`${origin}/`); await page.locator('#btn-new-event').click();
    await expect(page.locator('html')).toHaveAttribute('data-mood', 'teal');
    await expect.poll(() => state.requests.some(r => r.path === '/api/fx/currencies')).toBe(true);
    await expect(page.locator('#event-currency-state')).toContainText('dapat diubah');
    await setCurrencyMode(page, 'international');
    await chooseCurrency(page, code);
    await page.locator('#event-input-name').fill('Perjalanan'); await page.locator('#event-input-budget').fill(amount); await page.locator('#event-input-participants').fill('Ayu, Bima');
    await page.locator('#btn-submit-event').click(); await expect(page.locator('#event-form-dialog')).not.toBeVisible();
    expect(state.writes.at(-1)?.body).toMatchObject({ currencyMode: 'international', baseCurrency: code, budget: expected });
    expect(state.errors).toEqual([]);
  });
}
test('offline registry preserves Domestic IDR creation without invented fallback options', async ({ page }) => {
  const state = await fixture(page, { currency: 'IDR', empty: true, registryOffline: true });
  await page.goto(`${origin}/`); await page.locator('#btn-new-event').click();
  await expect(page.locator('#event-currency-retry')).toBeVisible();
  await page.locator('#event-input-name').fill('Lokal'); await page.locator('#event-input-budget').fill('1250000'); await page.locator('#event-input-participants').fill('Ayu');
  await page.locator('#btn-submit-event').click(); await expect(page.locator('#event-form-dialog')).not.toBeVisible();
  expect(state.writes.at(-1)?.body).toMatchObject({ currencyMode: 'domestic', baseCurrency: 'IDR', budget: '1250000' });
  await page.locator('#btn-new-event').click(); await expect(page.locator('#event-currency-retry')).toBeVisible();
  await setCurrencyMode(page, 'international'); await expect(page.locator('#event-currency-combobox-trigger')).toBeDisabled(); await expect(page.locator('.currency-option')).toHaveCount(0);
});
for (const width of [320, 390, 1440]) {
  test(`international ledger and bidirectional converter at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await fixture(page); await eventPage(page);
    await expect(page.locator('#summary-remaining')).toHaveText('S$99,71');
    await expect(page.locator('.ledger-amount')).toHaveText('S$0,30');
    await expect(page.locator('.ledger-description .fx-equivalent')).toHaveText('≈ Rp3.000');
    await expect(page.locator('#budget-idr')).toContainText('≈ Rp');
    await page.locator('#fx-open').click(); await expect.poll(() => state.fxCalls).toBe(1);
    await page.locator('#fx-base-input').fill('2'); await expect(page.locator('#fx-idr-input')).toHaveValue('24.001');
    await page.locator('#fx-idr-input').fill('12001'); await expect(page.locator('#fx-base-input')).toHaveValue('1,00');
    await expect(page.locator('#fx-conversion')).toContainText('≈');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/international-converter-${width}.png`, fullPage: true });
    await page.locator('#fx-close').click(); await expect(page.locator('#fx-open')).toBeFocused();
    expect(state.errors).toEqual([]);
  });
}
test('pre-transaction currency change requires explicit budget/allocation acknowledgment', async ({ page }) => {
  const state = await fixture(page, { empty: true }); await eventPage(page); await openEdit(page);
  await expect(page.locator('#event-currency-combobox-trigger')).toBeEnabled();
  await chooseCurrency(page, 'USD');
  await expect(page.locator('#currency-change-notice')).toContainText('S$100,01 menjadi US$100,01');
  await page.locator('#btn-submit-event').click(); await expect(page.locator('#event-form-error')).toContainText('Setujui'); expect(state.writes).toHaveLength(0);
  await page.locator('#currency-change-ack').check(); await page.locator('#btn-submit-event').click();
  await expect(page.locator('#event-form-dialog')).not.toBeVisible(); await expect(page.locator('#summary-budget')).toHaveText('US$100,01');
  expect(state.writes[0].body.budget).toBeUndefined(); expect(state.writes[0].body.baseCurrency).toBe('USD');
});
test('unrepresentable yen currency change is rejected before a write', async ({ page }) => {
  const state = await fixture(page, { empty: true }); await eventPage(page); await openEdit(page);
  await chooseCurrency(page, 'JPY'); await page.locator('#currency-change-ack').check(); await page.locator('#btn-submit-event').click();
  await expect(page.locator('#event-form-error')).toContainText('tidak sesuai pecahan'); expect(state.writes).toHaveLength(0);
});
test('currency is locked persistently even with no remaining transactions', async ({ page }) => {
  await fixture(page, { empty: true, locked: true }); await eventPage(page); await openEdit(page);
  await expect(page.locator('#event-currency-combobox-trigger')).toBeDisabled(); await expect(page.locator('[data-currency-mode="international"]')).toBeDisabled(); await expect(page.locator('#event-currency-state')).toContainText('terkunci');
});
test('server currency conflict is visible and keeps entered form data', async ({ page }) => {
  const state = await fixture(page, { empty: true }); await eventPage(page); await openEdit(page);
  await chooseCurrency(page, 'USD'); await page.locator('#currency-change-ack').check(); state.conflict = true;
  await page.locator('#btn-submit-event').click(); await expect(page.locator('#event-form-error')).toContainText('Mata uang terkunci');
  await expect(page.locator('#event-form-dialog')).toBeVisible(); await expect(page.locator('#event-input-name')).toHaveValue('Singapore bersama'); await expect(page.locator('#event-currency-combobox-trigger')).toBeDisabled();
});
test('exact fractional expense and edit retain snapshot; first expense locks currency', async ({ page }) => {
  const state = await fixture(page, { empty: true }); await eventPage(page);
  await page.locator('#btn-add-transaction').click(); await page.locator('#tx-input-name').fill('Teh'); await page.locator('#tx-input-qty').fill('3'); await page.locator('#tx-input-price').fill('0,1');
  await expect(page.locator('#tx-live-total')).toHaveText('S$0,30'); await page.locator('#btn-submit-tx').click();
  await expect(page.locator('#tx-modal')).not.toBeVisible(); await expect(page.locator('#event-currency-lock')).toContainText('terkunci');
  expect(state.writes[0].body).toMatchObject({ unitPrice: '0.10', quantity: 3, baseCurrency: 'SGD' });
  await page.locator('.ledger-entry summary').click(); await page.getByRole('button', { name: 'Ubah transaksi Teh' }).click();
  await expect(page.locator('#tx-input-price')).toHaveValue('0,10'); await page.locator('#tx-input-price').fill('0,2'); await page.locator('#btn-submit-tx').click();
  await expect(page.locator('#summary-expenses')).toHaveText('S$0,60');
  expect(state.tx[0].fxRateToIdr).toBe('12000.5');
});
test('fractional allocation, movement, adjustments and signed budget history stay exact', async ({ page }) => {
  const state = await fixture(page, { empty: true, cash: null }); await eventPage(page); await openChannels(page);
  const historyReads = () => state.requests.filter(r => r.path.endsWith('/budget-history')).length;
  await expect.poll(historyReads).toBe(1);
  await page.locator('#cash-budget-input').fill('40,01'); await expect(page.locator('#digital-budget-preview')).toHaveText('S$60,00'); await page.locator('#save-budget-channel').click();
  await expect(page.locator('#cash-channel-budget')).toHaveText('S$40,01');
  expect(historyReads()).toBe(1);
  await page.locator('#fund-move-details summary').click(); await page.locator('#fund-move-amount').fill('0,01'); await page.locator('#fund-move-submit').click();
  await expect(page.locator('#cash-channel-budget')).toHaveText('S$40,00');
  await expect(page.locator('#budget-history-list')).toContainText('Pindah');
  expect(historyReads()).toBe(2);
  await page.locator('#budget-adjustment-details summary').click(); await page.locator('#budget-adjust-operation').selectOption('decrease'); await page.locator('#budget-adjust-amount').fill('0,01'); await page.locator('#budget-adjust-cash-amount').fill('0'); await page.locator('#budget-adjust-reason').fill('Koreksi'); await page.locator('#budget-adjust-submit').click();
  await expect(page.locator('#summary-budget')).toHaveText('S$100,00'); await expect(page.locator('#budget-history-list')).toContainText('−S$0,01');
  expect(historyReads()).toBe(3);
  expect(state.writes.map(w => w.body)).toEqual([{ cashBudget: '40.01' }, { from: 'cash', amount: '0.01' }, { budgetDelta: '-0.01', cashBudgetDelta: '0.00', reason: 'Koreksi' }]);
});
test('offline FX never blocks expense recording, and converter has honest unavailable state', async ({ page }) => {
  const state = await fixture(page, { offline: true, empty: true }); await eventPage(page);
  await expect(page.locator('#budget-idr')).toContainText('tidak tersedia'); await page.locator('#fx-open').click(); await expect(page.locator('#fx-tool-state')).toContainText('Kurs tidak tersedia'); await expect(page.locator('#fx-base-input')).toBeDisabled(); await page.locator('#fx-close').click();
  await page.locator('#btn-add-transaction').click(); await page.locator('#tx-input-name').fill('Tetap tercatat'); await page.locator('#tx-input-price').fill('0,25'); await page.locator('#btn-submit-tx').click();
  await expect(page.locator('#summary-expenses')).toHaveText('S$0,25'); expect(state.tx[0].idrEquivalent).toBeNull();
});
test('stale cache and failed refresh retain dated reference without claiming current FX', async ({ page }) => {
  const state = await fixture(page); state.rateStale = true; await eventPage(page); await page.locator('#fx-open').click();
  await expect(page.locator('#fx-tool-state')).toContainText('Kurs cache'); await expect(page.locator('#fx-tool-state')).toContainText('23 Oktober 2026');
  await page.locator('#fx-close').click(); state.failRate = true; await page.locator('#fx-open').click();
  await expect(page.locator('#fx-tool-state')).toContainText('Pembaruan gagal; menggunakan referensi tersimpan'); await expect(page.locator('#fx-base-input')).toBeEnabled();
});
test('completed international statement preserves frozen reference and exact settlement without rate fetch', async ({ page }) => {
  const state = await fixture(page, { completed: true }); await eventPage(page);
  await expect(page.locator('#settlement-share-per-person')).toHaveText('S$33,23'); await expect(page.locator('.settlement-rounding')).toContainText('S$0,02'); await expect(page.locator('#statement-fx-reference')).toContainText('dibekukan');
  await expect(page.locator('#btn-add-transaction')).not.toBeVisible(); await page.locator('#fx-open').click(); await expect(page.locator('#fx-tool-state')).toContainText('dibekukan'); expect(state.fxCalls).toBe(0);
  await page.screenshot({ path: 'artifacts/international-final.png', fullPage: true });
});
test('large international values remain complete without abbreviation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await fixture(page, { large: true, empty: true }); await eventPage(page);
  await expect(page.locator('#summary-budget')).toHaveText('S$9.007.199.254.740.993,01'); await expect(page.locator('#summary-remaining')).toHaveText('S$9.007.199.254.740.993,01');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('Domestic IDR preserves whole amounts and hides FX tools', async ({ page }) => {
  await fixture(page, { currency: 'IDR' }); await eventPage(page); await expect(page.locator('#summary-remaining')).toHaveText('Rp70'); await expect(page.locator('#fx-context')).not.toBeVisible(); await expect(page.locator('#budget-idr')).not.toBeVisible();
  await page.locator('#btn-add-transaction').click(); await page.locator('#tx-input-price').fill('1,5'); await page.locator('#tx-input-name').fill('Invalid'); await page.locator('#btn-submit-tx').click(); await expect(page.locator('#tx-form-error')).toContainText('pecahan');
});
test('international public polling preserves snapshots, pauses visibility, backs off and revokes', async ({ page }) => {
  await page.clock.install(); const state = await fixture(page); await page.goto(`${origin}/share/#${'a'.repeat(64)}`);
  await expect(page.locator('#public-total-remaining')).toContainText('S$99,71'); await expect(page.locator('.public-entry-amount .fx-equivalent')).toHaveText('≈ Rp3.000');
  await page.locator('.public-entry-row').evaluate(el => el.setAttribute('data-retained', 'true'));
  await page.clock.fastForward(6100); await expect.poll(() => state.publicCalls).toBe(2); await expect(page.locator('[data-retained]')).toHaveCount(1);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.clock.fastForward(30000); expect(state.publicCalls).toBe(2);
  state.failPublic = true; await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.locator('#public-live-state')).toContainText('dijeda'); await expect(page.locator('#public-total-remaining')).toContainText('S$99,71');
  state.failPublic = false; await page.clock.fastForward(12100); await expect(page.locator('#public-live-state')).toContainText('Live');
  state.revoked = true; await page.clock.fastForward(6100); await expect(page.locator('#public-content')).not.toBeVisible();
  const count = state.publicCalls; await page.clock.fastForward(60000); expect(state.publicCalls).toBe(count);
  expect(state.requests.filter(r => r.path === '/api/public/events').every(r => !r.headers.authorization)).toBe(true); expect(await page.locator('body').textContent()).not.toContain('private-');
});
test('public completed international statement stops polling and converter never refreshes frozen rate', async ({ page }) => {
  await page.clock.install(); const state = await fixture(page, { completed: true }); await page.goto(`${origin}/share/#${'a'.repeat(64)}`);
  await expect(page.locator('#public-statement-label')).toHaveText('Final Statement'); await expect(page.locator('#public-total-budget')).toContainText('S$100,01'); await page.clock.fastForward(30000); expect(state.publicCalls).toBe(1);
  await page.locator('#fx-open').click(); await expect(page.locator('#fx-tool-state')).toContainText('dibekukan'); expect(state.fxCalls).toBe(0);
});

for (const snapshot of ['known', 'unknown', undefined] as const) {
  for (const publicView of [false, true]) {
    test(`${publicView ? 'public' : 'owner'} final statement initial budget ${snapshot ?? 'legacy absent'}`, async ({ page }) => {
      const state = await fixture(page, { completed: true, snapshot });
      if (publicView) await page.goto(`${origin}/share/#${'a'.repeat(64)}`);
      else await eventPage(page);
      const row = page.locator(publicView ? '#public-initial-row' : '#report-initial-row');
      const unavailable = page.locator(publicView ? '#public-initial-unavailable' : '#report-initial-unavailable');
      if (snapshot === 'known') {
        await expect(row).toBeVisible();
        await expect(row).toContainText('S$80,25');
        await expect(unavailable).not.toBeVisible();
      } else {
        await expect(row).not.toBeVisible();
        await expect(unavailable).toHaveText('Anggaran awal historis tidak tersedia.');
        await expect(unavailable).toBeVisible();
        await expect(page.locator(publicView ? '#public-initial-budget' : '#report-initial-budget')).toBeEmpty();
      }
      await expect(page.locator(publicView ? '#public-total-budget' : '#report-budget')).toContainText('S$100,01');
      if (publicView) await expect(page.locator('#public-budget-label')).toHaveText('Anggaran akhir');
      else {
        await expect(page.locator('#report-participants')).toHaveText('3 peserta');
        await expect(page.locator('.settlement-rounding')).toContainText('S$0,02');
      }
      await page.locator('#fx-open').click();
      await expect(page.locator('#fx-tool-state')).toContainText('dibekukan');
      expect(state.fxCalls).toBe(0);
      expect(state.errors).toEqual([]);
    });
  }
}

test('currency options keep spaced labels and a compact selected mark in light and dark moods', async ({ page }) => {
  const state = await fixture(page, { currency: 'IDR', empty: true });
  await page.goto(`${origin}/`);
  await page.locator('#btn-new-event').click();
  await expect.poll(() => state.requests.some(r => r.path === '/api/fx/currencies')).toBe(true);
  await setCurrencyMode(page, 'international');
  const trigger = page.locator('#event-currency-combobox-trigger');
  await trigger.click();
  const selected = page.locator('.currency-option[data-code="IDR"]');
  await expect(selected).toBeVisible();
  const metrics = await selected.evaluate(row => {
    const code = row.querySelector('.currency-option-code')!.getBoundingClientRect();
    const name = row.querySelector('.currency-option-name')!.getBoundingClientRect();
    const check = getComputedStyle(row.querySelector('.currency-option-check svg')!);
    return { display: getComputedStyle(row).display, gap: getComputedStyle(row).gap,
      labelGap: name.left - code.right, checkWidth: check.width, checkHeight: check.height,
      selected: row.getAttribute('aria-selected'), ariaLabel: row.getAttribute('aria-label') };
  });
  expect(metrics.display).toBe('flex');
  expect(metrics.gap).toBe('11px');
  expect(metrics.labelGap).toBeGreaterThanOrEqual(10);
  expect(metrics.checkWidth).toBe('17px');
  expect(metrics.checkHeight).toBe('17px');
  expect(metrics.selected).toBe('true');
  expect(metrics.ariaLabel).toBe('IDR · Indonesian Rupiah (Rp)');

  const search = page.locator('#event-currency-combobox-currency-input');
  await search.fill('AED');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const active = page.locator('.currency-option[data-active="true"]');
  await expect(active).toHaveAttribute('data-code', 'AED');
  expect(await search.getAttribute('aria-activedescendant')).toBe(await active.getAttribute('id'));
  const activeBackground = await active.evaluate(el => {
    const probe = document.createElement('span'); probe.style.backgroundColor = 'var(--bg-surface-hover)'; document.body.append(probe);
    const expected = getComputedStyle(probe).backgroundColor; probe.remove(); return { actual: getComputedStyle(el).backgroundColor, expected };
  });
  expect(activeBackground.actual).toBe(activeBackground.expected);
  await page.keyboard.press('Enter');
  await expect(trigger).toContainText('AED · United Arab Emirates Dirham');
  await trigger.click();

  for (const [code, label] of [
    ['SGD', 'SGD · Singapore Dollar (S$)'],
    ['AED', 'AED · United Arab Emirates Dirham (د.إ)'],
    ['AMD', 'AMD · Armenian Dram (֏)'],
    ['JPY', 'JPY · Japanese Yen (¥)'],
    ['MYR', 'MYR · Malaysian Ringgit (RM)'],
  ]) {
    await page.locator('#event-currency-combobox-currency-input').fill(code);
    const row = page.locator(`.currency-option[data-code="${code}"]`);
    await expect(row).toBeVisible();
    await expect(row).toHaveAttribute('aria-label', label);
  }

  for (const mood of ['graphite', 'sky-night']) {
    await page.locator('html').evaluate((el, value) => el.setAttribute('data-mood', String(value)), mood);
    await page.locator('#event-currency-combobox-currency-input').fill('AED');
    const selectedRow = page.locator('.currency-option[data-selected="true"]');
    await expect(selectedRow).toBeVisible();
    const colors = await selectedRow.evaluate(el => {
      const probe = document.createElement('span'); probe.style.color = 'var(--primary)'; document.body.append(probe);
      const primary = getComputedStyle(probe).color; probe.remove();
      return { color: getComputedStyle(el).color, body: getComputedStyle(document.body).color,
        background: getComputedStyle(el).backgroundColor, check: getComputedStyle(el.querySelector('.currency-option-check')!).color, primary };
    });
    expect(colors.color).toBe(colors.body);
    expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(colors.check).toBe(colors.primary);
  }
});
