import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../styles/global.css', import.meta.url), 'utf8');
const share = readFileSync(new URL('../pages/share.astro', import.meta.url), 'utf8');
const home = readFileSync(new URL('../pages/index.astro', import.meta.url), 'utf8');

test('Economy motion uses shared quiet tokens and has reduced-motion overrides', () => {
  for (const token of ['--motion-fast: 150ms', '--motion-control: 190ms', '--motion-overlay: 240ms', '--motion-layout: 300ms', '--motion-emphasis: 420ms', '--ease-out-soft: cubic-bezier(.2,.8,1,1)']) {
    expect(css).toContain(token);
  }
  expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  expect(share).toMatch(/prefers-reduced-motion:\s*reduce/);
  expect(home).toContain('home-events-entered');
  expect(css).toContain('@keyframes home-event-enter');
});
