import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      // Local game server with dev sign-in (apps/api/.dev.vars sets DEV_AUTH=true).
      command: 'npm run db:migrate:local -w @cfx/api && npm run dev -w @cfx/api',
      cwd: '../..',
      url: 'http://localhost:8787/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
  ],
});
