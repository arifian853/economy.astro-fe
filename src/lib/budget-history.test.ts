import { describe, expect, test } from 'bun:test';
import { createBudgetHistoryLoader } from './budget-history';

function fixture() {
  const pending: { eventId: string; resolve: (value: string[] | null) => void; reject: (error: Error) => void }[] = [];
  const rendered: string[][] = [];
  let display: string[] = [];
  let clears = 0;
  const loader = createBudgetHistoryLoader<string[]>({
    fetchHistory: eventId => new Promise((resolve, reject) => pending.push({ eventId, resolve, reject })),
    renderHistory: history => { display = history; rendered.push(history); },
    clearHistory: () => { display = []; clears++; },
  });
  return { loader, pending, rendered, get display() { return display; }, get clears() { return clears; } };
}

describe('budget history request lifecycle', () => {
  test('deduplicates overlapping and settled ordinary renders of the same event', async () => {
    const f = fixture();
    f.loader.selectEvent('a');
    const first = f.loader.load('a');
    f.loader.selectEvent('a');
    expect(f.loader.load('a')).toBe(first);
    expect(f.pending.map(p => p.eventId)).toEqual(['a']);
    f.pending[0]!.resolve(['existing']);
    await first;
    await f.loader.load('a');
    expect(f.pending).toHaveLength(1);
    expect(f.rendered).toEqual([['existing']]);
    expect(f.clears).toBe(1);
  });

  test('clears history on event change and ignores the old response arriving last', async () => {
    const f = fixture();
    f.loader.selectEvent('a');
    const old = f.loader.load('a');
    f.loader.selectEvent('b');
    const current = f.loader.load('b');
    f.pending[1]!.resolve(['b history']);
    await current;
    f.pending[0]!.resolve(['private a history']);
    await old;
    expect(f.pending.map(p => p.eventId)).toEqual(['a', 'b']);
    expect(f.rendered).toEqual([['b history']]);
    expect(f.display).toEqual(['b history']);
  });

  test('switching without a read clears prior rows and invalidates pending display', async () => {
    const f = fixture();
    f.loader.selectEvent('a');
    const first = f.loader.load('a');
    f.pending[0]!.resolve(['a history']);
    await first;
    const refresh = f.loader.load('a', { force: true });
    // A completed event with its panel closed selects the event without loading.
    f.loader.selectEvent('completed');
    expect(f.display).toEqual([]);
    f.pending[1]!.resolve(['stale a history']);
    await refresh;
    expect(f.display).toEqual([]);
    expect(f.rendered).toEqual([['a history']]);
    const visible = f.loader.load('completed');
    f.pending[2]!.resolve(['read-only history']);
    await visible;
    expect(f.display).toEqual(['read-only history']);
  });

  test('revisiting an event reuses its cached read without leaking the other event', async () => {
    const f = fixture();
    for (const id of ['a', 'b']) {
      f.loader.selectEvent(id);
      const loaded = f.loader.load(id);
      f.pending.at(-1)!.resolve([id]);
      await loaded;
    }
    f.loader.selectEvent('a');
    expect(f.display).toEqual([]);
    await f.loader.load('a');
    expect(f.display).toEqual(['a']);
    expect(f.pending).toHaveLength(2);
  });

  test('each successful mutation forces a read and ordinary detail refreshes reuse it', async () => {
    const f = fixture();
    f.loader.selectEvent('a');
    let loaded = f.loader.load('a');
    f.pending[0]!.resolve([]);
    await loaded;
    for (const records of [['reallocation'], ['reallocation', 'adjustment']]) {
      loaded = f.loader.load('a', { force: true });
      expect(f.loader.load('a')).toBe(loaded);
      f.pending.at(-1)!.resolve(records);
      await loaded;
      expect(f.display).toEqual(records);
    }
    expect(f.pending).toHaveLength(3);
  });

  test('forced post-mutation reads supersede older requests for the same event', async () => {
    const f = fixture();
    f.loader.selectEvent('a');
    const old = f.loader.load('a');
    const refresh = f.loader.load('a', { force: true });
    f.pending[1]!.resolve(['new mutation']);
    await refresh;
    f.pending[0]!.resolve(['before mutation']);
    await old;
    expect(f.rendered).toEqual([['new mutation']]);
    await f.loader.load('a');
    expect(f.pending).toHaveLength(2);
  });

  test('failed reads are tolerated and deduplicated; a forced retry retains last good history', async () => {
    const f = fixture();
    f.loader.selectEvent('a');
    const failed = f.loader.load('a');
    f.pending[0]!.reject(new Error('offline'));
    await failed;
    await f.loader.load('a');
    expect(f.pending).toHaveLength(1);
    const retry = f.loader.load('a', { force: true });
    f.pending[1]!.resolve(['saved history']);
    await retry;
    const unavailable = f.loader.load('a', { force: true });
    f.pending[2]!.resolve(null); // Non-OK HTTP response.
    await unavailable;
    expect(f.display).toEqual(['saved history']);
    expect(f.rendered).toEqual([['saved history']]);
  });

  test('late mutation success invalidates its event cache without fetching or displaying on another event', async () => {
    const f = fixture();
    f.loader.selectEvent('a');
    const first = f.loader.load('a');
    f.pending[0]!.resolve(['old a']);
    await first;
    f.loader.selectEvent('b');
    await f.loader.load('a', { force: true });
    expect(f.pending).toHaveLength(1);
    expect(f.display).toEqual([]);
    f.loader.selectEvent('a');
    const refreshed = f.loader.load('a');
    f.pending[1]!.resolve(['new a']);
    await refreshed;
    expect(f.display).toEqual(['new a']);
  });
});
