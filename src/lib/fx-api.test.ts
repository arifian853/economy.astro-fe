import { expect, test } from 'bun:test';
import { fetchFx } from './fx-api';

test('FX requests use the backend anonymously with no-store and reject unavailable data', async () => {
  const original = globalThis.fetch;
  const reads: { url: string; init: RequestInit }[] = [];
  let offline = false;
  globalThis.fetch = (async (input, init) => {
    reads.push({ url: String(input), init: init ?? {} });
    return offline ? new Response('', { status: 503 }) : Response.json([{ code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', minorUnits: 2 }]);
  }) as typeof fetch;
  try {
    expect(await fetchFx('currencies')).toEqual([{ code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', minorUnits: 2 }]);
    expect(reads[0].url).toEndWith('/api/fx/currencies');
    expect(reads[0].init).toMatchObject({ credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error' });
    expect(new Headers(reads[0].init.headers).has('Authorization')).toBe(false);
    offline = true;
    await expect(fetchFx('rate?base=SGD&quote=IDR')).rejects.toThrow('sementara tidak tersedia');
  } finally { globalThis.fetch = original; }
});
