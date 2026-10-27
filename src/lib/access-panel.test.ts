import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const component = readFileSync(new URL('../components/EconomyAccessPanel.astro', import.meta.url), 'utf8');

test('EconomyAccessPanel anchors Google sign-in in a tonal private-by-default surface', () => {
  expect(component).toContain('economy-access-panel');
  expect(component).toContain('GoogleLoginButton');
  expect(component).toContain('Private by default');
  expect(component).toContain('Share only when you choose');
  expect(component).not.toContain('box-shadow: var(--shadow-lg)');
});
