import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { applyMood } from './mood';

const control = readFileSync(new URL('../components/AppearanceControl.astro', import.meta.url), 'utf8');
const moodSource = readFileSync(new URL('./mood.ts', import.meta.url), 'utf8');

test('AppearanceControl uses authored radio semantics and contains all eight moods without a native select', () => {
  expect(control).not.toMatch(/<select\b/i);
  expect(control).toContain('<fieldset class="appearance-options">');
  expect(control).toContain('<legend class="sr-only">Mood</legend>');
  expect(control).toContain('type="radio"');
  expect(control).toContain('Escape');
  expect(control).toContain('style={`--appearance-swatch:${mood.swatch}`}');
  expect(control).not.toContain('style={`--appearance-swatch:${mood.canvas}`}');
  for (const mood of ['teal', 'forest', 'beige', 'slate', 'lavender', 'rosewood', 'graphite', 'sky-night']) {
    expect(moodSource).toContain(`id: '${mood}'`);
  }
});

test('applyMood persists, updates checked mood inputs and dispatches the decoupled change event', () => {
  const attrs: Record<string, string> = {};
  const radios = ['teal', 'graphite'].map(value => ({ value, checked: false }));
  let dispatched: Event | undefined;
  const oldDocument = globalThis.document;
  const oldStorage = globalThis.localStorage;
  const fakeDocument = {
    documentElement: { dataset: {} as Record<string, string>, style: { colorScheme: '' } },
    querySelector: () => ({ setAttribute: (name: string, value: string) => { attrs[name] = value; } }),
    querySelectorAll: () => radios,
    dispatchEvent: (event: Event) => { dispatched = event; return true; },
  } as unknown as Document;
  Object.defineProperty(globalThis, 'document', { configurable: true, value: fakeDocument });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem: (key: string, value: string) => { attrs[key] = value; } } });
  try {
    applyMood('graphite');
    expect(fakeDocument.documentElement.dataset.mood).toBe('graphite');
    expect(fakeDocument.documentElement.style.colorScheme).toBe('dark');
    expect(radios.map(radio => radio.checked)).toEqual([false, true]);
    expect(attrs['economy-mood']).toBe('graphite');
    expect(attrs.content).toBe('#111315');
    expect(dispatched?.type).toBe('economy:moodchange');
  } finally {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: oldDocument });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: oldStorage });
  }
});
