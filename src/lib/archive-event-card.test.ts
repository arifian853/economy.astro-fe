import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const component = readFileSync(new URL('../components/ArchiveEventCard.astro', import.meta.url), 'utf8');

test('ArchiveEventCard uses a left-aligned identity, explicit totals, report link and secondary overflow action', () => {
  expect(component).toContain('archive-event-card');
  expect(component).toContain('archive-event-identity');
  expect(component).toContain('Total anggaran');
  expect(component).toContain('Total pengeluaran');
  expect(component).toContain('Sisa');
  expect(component).toContain('Lihat laporan');
  expect(component).toContain('aria-label="Aksi arsip"');
  expect(component).toContain('action-delete');
  expect(component).not.toContain('Anggaran akhir');
});
