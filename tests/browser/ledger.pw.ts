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
const publicParticipants = ['Ayu', 'Bima', 'Citra', 'Daffa', 'Eka', 'Fauzan dengan nama panjang untuk diuji pada layar kecil', 'Gita', 'Hana'];
const publicPayload = { event: { name: event.name, eventDate: event.eventDate, status: 'active', updatedAt: date }, participants: publicParticipants, budgetSummary: summary, entries: [{ type: 'expense', name: transactions[0].name, amount: 70000, source: 'digital', transactionAt: date }] };

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
    if (width === 320) {
      const headerBounds = await page.locator('.site-header-inner').evaluate(el => el.getBoundingClientRect().toJSON());
      const appearanceBounds = await page.locator('#header-appearance > summary').evaluate(el => el.getBoundingClientRect().toJSON());
      expect(appearanceBounds.left).toBeGreaterThanOrEqual(headerBounds.left - 1);
      expect(appearanceBounds.right).toBeLessThanOrEqual(headerBounds.right + 1);
      await expect(page.locator('.appearance-trigger-label')).toBeHidden();
      await expect(page.locator('#btn-logout')).toBeVisible();
    } else if (width === 360) {
      await expect(page.locator('.appearance-trigger-label')).toBeVisible();
    }
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
    const participantNames = page.locator('.public-participant-chip');
    await expect(participantNames).toHaveCount(publicParticipants.length);
    expect(await participantNames.allTextContents()).toEqual(publicParticipants);
    await expect(page.locator('#public-participant-toggle')).toHaveCount(0);
    const badge = await participantNames.first().evaluate(el => {
      const style = getComputedStyle(el);
      return { display: style.display, background: style.backgroundColor, radius: style.borderRadius,
        borders: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth] };
    });
    expect(badge.display).toBe('inline-flex');
    expect(badge.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(badge.radius).toBe('9999px');
    expect(badge.borders).toEqual(['1px', '1px', '1px', '1px']);
    const contentWidth = await page.locator('#public-content').evaluate(el => el.getBoundingClientRect().width);
    const participantsWidth = await page.locator('#public-participants').evaluate(el => el.getBoundingClientRect().width);
    expect(participantsWidth).toBeGreaterThan(260);
    expect(participantsWidth).toBeGreaterThanOrEqual(contentWidth - 1);
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
    await page.goto(`${origin}/share/#${'a'.repeat(64)}`);
    await expect(page.locator('#public-participants')).toBeVisible();
    await expect(page.locator('.public-participant-chip')).toHaveCount(publicParticipants.length);
    await expect(page.locator('#public-participant-toggle')).toHaveCount(0);
    const badgeColors = await page.locator('.public-participant-chip').first().evaluate(el => {
      const probe = document.createElement('span'); probe.style.color = 'var(--text-main)'; probe.style.backgroundColor = 'var(--bg-surface)'; document.body.append(probe);
      const expected = { color: getComputedStyle(probe).color, background: getComputedStyle(probe).backgroundColor }; probe.remove();
      const actual = getComputedStyle(el); return { color: actual.color, background: actual.backgroundColor, expected };
    });
    expect(badgeColors.color).toBe(badgeColors.expected.color);
    expect(badgeColors.background).toBe(badgeColors.expected.background);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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

test('date-range selection has visible endpoints, a distinct in-range state, and an updated summary', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await setup(page);
  await page.goto(`${origin}/`);
  await page.locator('#btn-new-event').click();
  const trigger = page.locator('#event-date-range-trigger');
  const currentSummary = await trigger.locator('.range-value').innerText();
  await trigger.click();
  await expect(page.locator('.calendar-status')).toContainText(`Rentang terpilih: ${currentSummary}`);
  const grid = page.locator('.range-picker .calendar-grid');
  const initial = grid.locator('.day[aria-selected="true"]');
  await expect(initial).toHaveCount(1);
  const initialStyle = await initial.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color,
    selected: el.getAttribute('aria-selected') }));
  const primaryStyle = await page.evaluate(() => {
    const probe = document.createElement('span'); probe.style.backgroundColor = 'var(--primary)'; probe.style.color = 'var(--on-primary)'; document.body.append(probe);
    const result = { background: getComputedStyle(probe).backgroundColor, color: getComputedStyle(probe).color }; probe.remove(); return result;
  });
  expect(initialStyle.selected).toBe('true');
  expect(initialStyle.background).toBe(primaryStyle.background);
  expect(initialStyle.color).toBe(primaryStyle.color);
  await initial.focus();
  const beforeArrow = await initial.getAttribute('data-date');
  await page.keyboard.press('ArrowRight');
  const afterArrow = await page.evaluate(() => document.activeElement?.getAttribute('data-date'));
  expect(afterArrow).not.toBe(beforeArrow);
  await page.keyboard.press('Enter');
  await expect(page.locator('.calendar-status')).toContainText('Pilih tanggal selesai');
  await page.locator('.range-dialog .cancel').click();
  await trigger.click();

  const days = grid.locator('.day');
  const start = days.nth(4);
  const end = days.nth(7);
  await start.click();
  await expect(page.locator('.calendar-status')).toContainText('Pilih tanggal selesai');
  await end.click();
  const startState = grid.locator('.day[data-range-start="true"]');
  const endState = grid.locator('.day[data-range-end="true"]');
  const inRange = grid.locator('.day[data-in-range="true"][aria-selected="false"]').first();
  await expect(startState).toHaveAttribute('aria-selected', 'true');
  await expect(endState).toHaveAttribute('aria-selected', 'true');
  await expect(inRange).toBeVisible();
  const rangeStyles = await Promise.all([startState, endState, inRange].map(el => el.evaluate(node => ({
    background: getComputedStyle(node).backgroundColor, radius: getComputedStyle(node).borderRadius,
    color: getComputedStyle(node).color,
  }))));
  expect(rangeStyles[0].background).toBe(primaryStyle.background);
  expect(rangeStyles[1].background).toBe(primaryStyle.background);
  expect(rangeStyles[0].radius).not.toBe(rangeStyles[1].radius);
  expect(rangeStyles[2].background).not.toBe(primaryStyle.background);

  for (const mood of ['rosewood', 'graphite', 'sky-night']) {
    await page.locator('html').evaluate((el, value) => el.setAttribute('data-mood', String(value)), mood);
    const colors = await startState.evaluate(el => {
      const probe = document.createElement('span'); probe.style.color = 'var(--on-primary)'; document.body.append(probe);
      const expected = getComputedStyle(probe).color; probe.remove();
      return { actual: getComputedStyle(el).color, expected };
    });
    expect(colors.actual).toBe(colors.expected);
  }
  await page.locator('html').evaluate(el => el.setAttribute('data-mood', 'teal'));

  await page.locator('.range-dialog .confirm').click();
  await expect(trigger.locator('.range-value')).not.toHaveText('Pilih tanggal');
  await expect(trigger.locator('.range-value')).toContainText('5');
  await expect(trigger.locator('.range-value')).toContainText('8');

  await trigger.click();
  const fifth = grid.locator('.day[data-date$="-05"]');
  await fifth.click(); await fifth.click();
  await expect(fifth).toHaveAttribute('data-range-start', 'true');
  await expect(fifth).toHaveAttribute('data-range-end', 'true');
  expect(await fifth.evaluate(el => getComputedStyle(el).borderRadius)).toBe('9999px');
  await page.locator('.range-dialog .confirm').click();
  await expect(trigger.locator('.range-value')).not.toHaveText('Pilih tanggal');
});

test('evidence picker is custom, accessible, clearable, and validates type and 12 MiB size', async ({ page }) => {
  const state = await setup(page);
  await page.goto(`${origin}/event/${eventId}`);
  await page.locator('#btn-add-transaction').click();
  await page.locator('.tx-evidence-details summary').click();
  const input = page.locator('#tx-input-evidence-file');
  const pick = page.getByRole('button', { name: 'Pilih file bukti' });
  const status = page.locator('#tx-evidence-file-name');
  const clear = page.locator('#tx-evidence-file-clear');
  const error = page.locator('#tx-evidence-file-error');
  await expect(input).toBeHidden();
  await expect(pick).toBeVisible();
  await expect(status).toHaveText('Belum ada file dipilih');
  await input.setInputFiles({ name: 'nota-makan.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00]) });
  await expect(status).toContainText('nota-makan.jpg');
  await expect(clear).toBeVisible();
  await clear.click();
  await expect(status).toHaveText('Belum ada file dipilih');
  await expect(clear).toBeHidden();

  await input.setInputFiles({ name: 'catatan.txt', mimeType: 'text/plain', buffer: Buffer.from('bukan bukti gambar') });
  await expect(error).toContainText('Jenis file tidak didukung');
  await expect(input).toHaveValue('');
  await input.setInputFiles({ name: 'terlalu-besar.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(12 * 1024 * 1024 + 1) });
  await expect(error).toContainText('12 MiB');
  await expect(input).toHaveValue('');
  expect(state.writes).toEqual([]);
});
