import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3173',
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
    viewport: { width: 1280, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --port 3173 --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:3173',
    timeout: 20_000,
    reuseExistingServer: false
  }
});
