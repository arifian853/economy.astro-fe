import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', testMatch: '**/*.pw.ts',
  fullyParallel: false, workers: 1, maxFailures: 1,
  reporter: [['list'], ['json', { outputFile: 'artifacts/browser-results.json' }]],
  outputDir: 'artifacts/browser',
  use: { launchOptions: { chromiumSandbox: true }, headless: true, timezoneId: 'Asia/Jakarta', locale: 'id-ID', reducedMotion: 'reduce', trace: 'retain-on-failure' },
});
