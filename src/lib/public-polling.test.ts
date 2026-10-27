import { expect, test } from 'bun:test';
import { createPublicPoller, type PollEnvironment } from './public-polling';
const payload = (status?: string) => ({
 event: { name: 'Local example', eventDate: '2026-10-27', ...(status ? { status } : {}), updatedAt: '2026-10-27T10:00:00Z' },
 budgetSummary: { budget: 100, cashBudget: null, digitalBudget: null, totalExpenses: 0, cashExpenses: 0, digitalExpenses: 0, totalRemaining: 100, cashRemaining: null, digitalRemaining: null }, entries: [],
});
function fixture(request?: typeof fetch) {
 let visible = true, listener = () => {};
 let id = 0;
 const timers = new Map<number, { fn: () => void; delay: number }>();
 const environment: PollEnvironment = { visible: () => visible, listen: fn => { listener = fn; return () => { listener = () => {}; }; }, schedule: (fn, delay) => { timers.set(++id, { fn, delay }); return id; }, cancel: id => { timers.delete(id); } };
 const states: string[] = [], data: unknown[] = [], requests: RequestInit[] = [];
 const poller = createPublicPoller({ endpoint: '/api/public/events', token: 'a'.repeat(64), environment,
 request: request ?? (async (_url, init) => { requests.push(init!); return Response.json(payload()); }) as typeof fetch,
 onData: value => { data.push(value); }, onState: state => { states.push(state); },
 });
 const tick = async () => { const item = [...timers].find(([, value]) => value.delay !== 15000); if (!item) throw Error('No polling timer'); timers.delete(item[0]); item[1].fn(); await flush(); };
 return { poller, timers, states, data, requests, tick, visibility: (value: boolean) => { visible = value; listener(); } };
}
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

test('polls at six seconds with anonymous no-store requests and emits only changed payloads', async () => {
 const f = fixture(); f.poller.start(); await flush();
 expect(f.data).toHaveLength(1);
 expect([...f.timers.values()].map(timer => timer.delay)).toEqual([6000]);
 await f.tick(); expect(f.data).toHaveLength(1);
 expect(f.requests[0]).toMatchObject({ credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer', headers: { 'X-Economy-Share-Token': 'a'.repeat(64) } });
 expect(new Headers(f.requests[0].headers).has('Authorization')).toBe(false);
 f.poller.stop(); expect(f.timers.size).toBe(0);
});
test('hidden tabs abort in-flight reads, ignore stale responses and resume immediately', async () => {
 let finish: ((response: Response) => void) | undefined;
 let signal: AbortSignal | undefined;
 const f = fixture((async (_url, init) => { signal = init?.signal as AbortSignal; return new Promise<Response>(resolve => { finish = resolve; }); }) as typeof fetch);
 f.poller.start(); f.visibility(false); expect(signal?.aborted).toBe(true);
 finish!(Response.json(payload())); await flush(); expect(f.data).toHaveLength(0); expect(f.timers.size).toBe(0);
 expect(f.states.at(-1)).toBe('paused');
 f.visibility(true); expect(signal?.aborted).toBe(false); f.poller.stop();
});
test('failures back off, retain prior data and recover without resetting content', async () => {
 let fail = false;
 const f = fixture((async () => fail ? new Response('', { status: 503 }) : Response.json(payload())) as typeof fetch);
 f.poller.start(); await flush(); fail = true; await f.tick();
 expect(f.states.at(-1)).toBe('paused'); expect(f.data).toHaveLength(1);
 expect([...f.timers.values()][0].delay).toBe(12000);
 await f.tick(); expect([...f.timers.values()][0].delay).toBe(24000);
 fail = false; await f.tick(); expect(f.states.at(-1)).toBe('live'); expect(f.data).toHaveLength(1);
 f.poller.stop();
});
test('explicit completed status stops polling; absent status is never inferred as final', async () => {
 const f = fixture((async () => Response.json(payload('completed'))) as typeof fetch);
 f.poller.start(); await flush(); expect(f.states.at(-1)).toBe('final'); expect(f.timers.size).toBe(0);
 f.visibility(false); f.visibility(true); expect(f.states.at(-1)).toBe('final'); f.poller.stop();
});
test('revocation clears access and stops retries', async () => {
 const f = fixture((async () => new Response('', { status: 404 })) as typeof fetch);
 f.poller.start(); await flush(); expect(f.states.at(-1)).toBe('unavailable'); expect(f.timers.size).toBe(0); f.poller.stop();
});
test('international polling accepts exact currency metadata and freezes the final reference', async () => {
 const event = { name: 'International', eventDate: '2026-10-23', status: 'active', baseCurrency: 'SGD', currencyMode: 'international', fxReferenceRateToIdr: '12000.5', fxReferenceDate: '2026-10-23', fxReferenceProvider: 'Frankfurter v2' };
 const projection = { event, budgetSummary: { budget: '9007199254740993.01', cashBudget: null, digitalBudget: null, totalExpenses: '0.1', cashExpenses: '0.1', digitalExpenses: '0', totalRemaining: '9007199254740992.91', cashRemaining: null, digitalRemaining: null }, entries: [{ type: 'expense', name: 'Tea', amount: '0.1', source: 'cash', transactionAt: '2026-10-23T10:00:00Z', fxRateToIdr: '10000', fxRateDate: '2026-10-22', fxRateProvider: 'snapshot', idrEquivalent: '1000' }] };
 const f = fixture((async () => Response.json(projection)) as typeof fetch);
 f.poller.start(); await flush();
 expect(f.states.at(-1)).toBe('live');
 expect(f.data[0]).toMatchObject({ event: { baseCurrency: 'SGD', fxReferenceRateToIdr: '12000.5' }, entries: [{ idrEquivalent: '1000' }], budgetSummary: { totalRemaining: '9007199254740992.91' } });
 event.status = 'completed'; await f.tick();
 expect(f.states.at(-1)).toBe('final'); expect(f.timers.size).toBe(0);
 expect(f.data).toHaveLength(2); f.poller.stop();
});
