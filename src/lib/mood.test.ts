import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { moods, resolveMood, moodBootstrap } from './mood';

const designBytes = readFileSync(new URL('../../DESIGN.md', import.meta.url));
const design = designBytes.toString('utf8');
const css = readFileSync(new URL('../styles/moods.css', import.meta.url), 'utf8');
const tokens = (block: string) => Object.fromEntries(
  [...block.matchAll(/(--[\w-]+):\s*(#[\da-fA-F]+)/g)].map(m => [m[1], m[2]]),
);
const moodTokens = (id: string) => tokens(css.split(`[data-mood="${id}"]`)[1].split('}')[0]);
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const luminance = (color: number[]) => color.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (foreground: number[], background: number[]) => {
  const [dark, light] = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
  return (light + 0.05) / (dark + 0.05);
};

test('Teal fallback, persisted valid mood and eight canonical atmospheres', () => {
  expect(resolveMood(null)).toBe('teal');
  expect(resolveMood('unknown')).toBe('teal');
  expect(resolveMood('sky-night')).toBe('sky-night');
  expect(moods).toHaveLength(8);
  expect(moods.filter(m => m.dark).map(m => m.id)).toEqual(['graphite', 'sky-night']);
});
test('bootstrap works before paint and without localStorage access', () => {
  for (const saved of [null, 'graphite', 'invalid', 'denied']) {
    const root = { dataset: {} as Record<string, string>, style: { colorScheme: '' } };
    let theme = '';
    const document = { documentElement: root, querySelector: () => ({ setAttribute: (_: string, value: string) => theme = value }) };
    const localStorage = { getItem: () => { if (saved === 'denied') throw Error(); return saved; } };
    new Function('document', 'localStorage', moodBootstrap)(document, localStorage);
    expect(root.dataset.mood).toBe(saved === 'graphite' ? 'graphite' : 'teal');
    expect(root.style.colorScheme).toBe(saved === 'graphite' ? 'dark' : 'light');
    expect(theme).toBe(saved === 'graphite' ? '#111315' : '#F3F8F7');
  }
});
test('DESIGN.md matches the canonical Bookshelf source at commit 9cb76d4d2d6e73a7e84753a306813fbd3b0977df', () => {
  // Pin the source bytes without requiring a sibling Bookshelf checkout in CI.
  expect(createHash('sha256').update(designBytes).digest('hex'))
    .toBe('23dc69baa8f6735df55e92f699ef61d0e5b799c8cef63b97c9f116ea39847b26');
});

test('all eight Economy palettes match the current Bookshelf source tokens', () => {
  const canonicalMoods = [...design.matchAll(/^## ([^\n]+)\n\n```css\n/gm)].map(m => m[1]).sort();
  expect(moods.map(mood => mood.name).sort()).toEqual(canonicalMoods);
  for (const mood of moods) {
    const block = design.split(`## ${mood.name}\n`)[1].split('```css\n')[1].split('```')[0];
    expect(moodTokens(mood.id)).toEqual(tokens(block));
    expect(mood.canvas).toBe(moodTokens(mood.id)['--bg-main']);
    expect(mood).toHaveProperty('swatch', moodTokens(mood.id)['--primary']);
  }
  expect(css).toMatch(/:root,\s*\[data-mood="teal"\]/);
});

test('canonical muted and available text clear WCAG AA in all eight moods', () => {
  for (const mood of moods) {
    const colors = moodTokens(mood.id);
    for (const surface of ['--bg-main', '--bg-surface', '--bg-surface-variant']) {
      expect(contrast(rgb(colors['--text-muted']), rgb(colors[surface]))).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(rgb(colors['--status-available-text']), rgb(colors['--status-available-bg'])))
      .toBeGreaterThanOrEqual(4.5);
  }
});

test('readable supporting text clears AA on all eight tonal surfaces', () => {
  const styles = readFileSync(new URL('../styles/global.css', import.meta.url), 'utf8');
  expect(styles).toContain('--text-muted-readable: color-mix(in srgb, var(--text-muted) 80%, var(--text-main))');
  for (const mood of moods) {
    const colors = Object.fromEntries(Object.entries(moodTokens(mood.id)).map(([name, hex]) => [name, rgb(hex)]));
    const readable = colors['--text-muted'].map((v, i) => Math.round(v * 0.8 + colors['--text-main'][i] * 0.2));
    expect(contrast(readable, colors['--bg-surface-variant'])).toBeGreaterThanOrEqual(4.5);
  }
});
