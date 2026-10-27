import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const origin = 'https://economy.test';
const eventId = '00000000-0000-4000-8000-000000000001';
const txId = '00000000-0000-4000-8000-000000000002';
const date = '2026-10-27T10:00:00Z';
const event = { id: eventId, name: 'Weekend bersama', eventDate: '2026-10-27', budget: 2000000, cashBudget: 500000, digitalBudget: 1500000, status: 'active', notes: null, createdAt: date, updatedAt: date, completedAt: null };
const transactions = [{ id: txId, eventId, name: 'Makan siang bersama', quantity: 2, unitPrice: 35000, paymentMethod: 'qris', transactionAt: date, note: 'Nota tersimpan privat' }];
const summary = { budget: 2000000, cashBudget: 500000, digitalBudget: 1500000, totalExpenses: 70000, cashExpenses: 0, digitalExpenses: 70000, totalRemaining: 1930000, cashRemaining: 500000, digitalRemaining: 1430000 };
const publicPayload = { event: { name: event.name, eventDate: event.eventDate, status: 'active', updatedAt: date }, budgetSummary: summary, entries: [{ type: 'expense', name: transactions[0].name, amount: 70000, source: 'digital', transactionAt: date }] };

type MockState = { completed?: boolean; empty?: boolean; failPublic?: boolean; publicRequests: number; writes: { path: string; body: any }[]; errors: string[]; requests: { path: string; headers: Record<string, string> }[] };
async function setup(page: Page, owner = true) {
  const state: MockState = { publicRequests: 0, writes: [], errors: [], requests: [] };
  page.on('pageerror', error => state.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') state.errors.push(message.text()); });
  await page.addInitScript(({ owner }) => {
    if (!owner) { localStorage.removeItem('sb-auth-auth-token'); return; }
    const user = { id: 'local-owner', email: 'local@example.test', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-01-01T00:00:00Z' };
    const exp = Math.floor(Date.now() / 1000) + 36000;
    const access = `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ sub: user.id, exp }))}.local`;
    localStorage.setItem('sb-auth-auth-token', JSON.stringify({ access_token: access, refresh_token: 'local-refresh', token_type: 'bearer', expires_in: 36000, expires_at: exp, user }));
  }, { owner });
  // All documents, scripts, and APIs are fulfilled from the local build. No server or network service is used.
  await page.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== origin) { await route.fulfill({ status: 200, body: '', contentType: url.hostname === 'fonts.googleapis.com' ? 'text/css' : 'text/plain' }); return; }
    if (url.pathname.startsWith('/api/')) {
      const path = url.pathname;
      state.requests.push({ path, headers: request.headers() });
      const status = state.completed ? 'completed' : 'active';
      let body: unknown = {};
      if (path === '/api/public/events') {
        state.publicRequests++;
        if (state.failPublic) { await route.fulfill({ status: 503, json: { error: 'Local outage' } }); return; }
        body = { ...publicPayload, event: { ...publicPayload.event, status } };
      } else if (path.endsWith('/public-link')) body = { enabled: false, token: null };
      else if (path.endsWith('/budget-history')) body = { reallocations: [], adjustments: [] };
      else if (path.endsWith('/evidence')) body = [{ type: 'link', label: 'Nota', url: 'https://receipt.example.test/local' }];
      else if (request.method() !== 'GET') {
        const input = request.postDataJSON();
        state.writes.push({ path, body: input }); body = { id: txId, ...input };
      } else if (path === '/api/events') body = state.empty ? [] : ['active', 'upcoming', 'completed'].map((status, i) => ({ ...event, id: i === 0 ? eventId : `${eventId}-${i}`, status, totalExpenses: 70000, participantCount: 3 }));
      else body = { event: { ...event, status, completedAt: state.completed ? date : null }, participants: [{ id: '1', name: 'Ayu' }, { id: '2', name: 'Bima' }, { id: '3', name: 'Citra' }], transactions: state.empty ? [] : transactions };
      await route.fulfill({ json: body }); return;
    }
    let path = url.pathname;
    if (path.startsWith('/event/')) path = '/event/index/';
    if (path.endsWith('/')) path += 'index.html';
    try {
      const file = resolve('dist', `.${path}`);
      if (!file.startsWith(resolve('dist') + '/')) throw Error('Invalid asset');
      const body = await readFile(file);
      const contentType = path.endsWith('.html') ? 'text/html' : path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream';
      await route.fulfill({ body, contentType });
    } catch { await route.fulfill({ status: 404, body: '' }); }
  });
  return state;
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const bad = await page.locator('button:visible, input:visible, select:visible, strong:visible').evaluateAll(elements => elements.filter(el => { const box = el.getBoundingClientRect(); return box.left < -1 || box.right > innerWidth + 1; }).map(el => el.textContent || el.id));
  expect(bad).toEqual([]);
}
for (const width of [320, 360, 390, 430, 768, 1024, 1280, 1440]) {
  test(`owner and public at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await setup(page);
    await page.goto(`${origin}/event/${eventId}`);
    await expect(page.locator('#summary-remaining')).toHaveText('Rp1.930.000');
    await expect(page.locator('#btn-add-transaction')).toBeVisible();
    await noOverflow(page);
    if ([390, 1440].includes(width)) await page.screenshot({ path: `artifacts/event-${width}.png`, fullPage: true });
    await page.locator('#btn-add-transaction').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.locator('#tx-input-price').fill('1250000');
    await expect(page.locator('#tx-input-price')).toHaveValue('1.250.000');
    await noOverflow(page);
    if (width === 390) await page.screenshot({ path: 'artifacts/expense-390.png', fullPage: true });
    await page.locator('#btn-close-tx').click();
    await page.goto(`${origin}/share/#${'a'.repeat(64)}`);
    await expect(page.locator('#public-total-remaining')).toHaveText('Rp1.930.000');
    await noOverflow(page);
    if ([390, 1440].includes(width)) await page.screenshot({ path: `artifacts/public-${width}.png`, fullPage: true });
    expect(state.errors).toEqual([]);
    const publicRequest = state.requests.find(request => request.path === '/api/public/events')!;
    expect(publicRequest.headers.authorization).toBeUndefined();
  });
}
for (const mood of ['teal', 'forest', 'beige', 'slate', 'lavender', 'rosewood', 'graphite', 'sky-night']) {
  test(`appearance, keyboard and accessibility: ${mood}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await setup(page);
    await page.goto(`${origin}/event/${eventId}`);
    await expect(page.locator('#dashboard-content')).toBeVisible();
    await page.getByRole('combobox', { name: 'Appearance · Mood' }).first().selectOption(mood);
    await expect(page.locator('html')).toHaveAttribute('data-mood', mood);
    expect(await page.evaluate(() => localStorage.getItem('economy-mood'))).toBe(mood);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-mood', mood);
    await expect(page.locator('#dashboard-content')).toBeVisible();
    expect(await page.locator('html').evaluate(el => getComputedStyle(el).colorScheme)).toBe(['graphite', 'sky-night'].includes(mood) ? 'dark' : 'light');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({ path: `artifacts/mood-${mood}.png`, fullPage: true });
    await page.locator('#btn-add-transaction').click();
    await page.locator('#btn-close-tx').click();
    await expect(page.locator('#btn-add-transaction')).toBeFocused();
  });
}
test('synthetic login, Teal first paint and unavailable storage', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await setup(page, false);
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw Error('denied'); } }));
  await page.goto(`${origin}/`);
  await expect(page.locator('html')).toHaveAttribute('data-mood', 'teal');
  await expect(page.locator('#login-title')).toContainText('Spend together.');
  await expect(page.locator('#google-login')).toBeVisible();
  await page.screenshot({ path: 'artifacts/gate-mobile.png', fullPage: true });
  await noOverflow(page);
});
test('event home lifecycle groups, empty state and create form', async ({ page }) => {
  const state = await setup(page);
  await page.goto(`${origin}/`);
  await expect(page.locator('.lifecycle-group')).toHaveCount(3);
  await expect(page.locator('.lifecycle-group').first()).toHaveClass(/lifecycle-active/);
  await page.locator('#btn-new-event').click();
  await page.locator('#event-input-budget').fill('2000000');
  await expect(page.locator('#event-input-budget')).toHaveValue('2.000.000');
  await page.locator('#btn-close-modal').click();
  state.empty = true; await page.reload();
  await expect(page.locator('#events-empty')).toBeVisible();
});
test('CRUD and evidence preserve transaction before attachment', async ({ page }) => {
  const state = await setup(page);
  await page.goto(`${origin}/event/${eventId}`);
  await page.locator('#btn-add-transaction').click();
  await page.locator('#tx-input-name').fill('Air mineral');
  await page.locator('#tx-input-price').fill('25000');
  await page.locator('.tx-evidence-details summary').click();
  await page.locator('#tx-input-evidence-url').fill('https://receipt.example.test/local');
  await page.locator('#btn-submit-tx').click();
  await expect(page.locator('#tx-modal')).not.toBeVisible();
  expect(state.writes.map(write => write.path)).toEqual([`/api/events/${eventId}/transactions`, `/api/transactions/${txId}/evidence-links`]);
  expect(state.writes[0].body.unitPrice).toBe('25000');
  await page.locator('.ledger-entry summary').click();
  await page.getByRole('button', { name: 'Ubah transaksi Makan siang bersama' }).click();
  await expect(page.locator('#tx-input-price')).toHaveValue('35.000');
});
test('completed statement is immutable and exposes exact rounding remainder', async ({ page }) => {
  const state = await setup(page); state.completed = true;
  await page.goto(`${origin}/event/${eventId}`);
  await expect(page.locator('#settlement-section')).toBeVisible();
  await expect(page.locator('#btn-add-transaction')).not.toBeVisible();
  await expect(page.locator('#settlement-share-per-person')).toHaveText('Rp643.333');
  await expect(page.locator('.settlement-rounding')).toContainText('Rp1');
  await page.locator('.ledger-entry summary').click();
  await expect(page.locator('.ledger-actions')).not.toBeVisible();
  await noOverflow(page);
});
test('public polling retains rows and totals on failure then resumes', async ({ page }) => {
  await page.clock.install();
  const state = await setup(page, false);
  await page.goto(`${origin}/share/#${'a'.repeat(64)}`);
  await expect(page.locator('#public-total-remaining')).toHaveText('Rp1.930.000');
  await page.locator('.public-entry-row').evaluate(el => el.setAttribute('data-preserved', 'yes'));
  await page.clock.fastForward(6100);
  await expect.poll(() => state.publicRequests).toBe(2);
  await expect(page.locator('[data-preserved]')).toHaveCount(1);
  state.failPublic = true; await page.clock.fastForward(6100);
  await expect(page.locator('#public-live-state')).toHaveText('Pembaruan dijeda');
  await expect(page.locator('#public-total-remaining')).toHaveText('Rp1.930.000');
  state.failPublic = false; await page.clock.fastForward(12100);
  await expect(page.locator('#public-live-state')).toContainText('Live');
  expect(await page.locator('body').textContent()).not.toContain('never-render');
});

for (const width of [320, 360, 390, 430, 768, 1024, 1280, 1440]) {
 test(`gate at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await setup(page, false);
  await page.goto(`${origin}/`);
  await expect(page.locator('#login-title')).toBeVisible();
  await noOverflow(page);
  if (width === 1440) await page.screenshot({ path: 'artifacts/gate-desktop.png', fullPage: true });
 });
}
