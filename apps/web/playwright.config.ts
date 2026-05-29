/**
 * Playwright config — Stage 19.
 *
 * First e2e of the build. CI integration deferred to Stage 26 (Q-19.9).
 * Run locally with `pnpm --filter @mm/web e2e` after
 * `pnpm exec playwright install chromium`.
 *
 * The session-flow spec drives the full happy path through the auth-svc
 * + assessment-svc surface. Local dev requires a Supabase instance + the
 * three Edge Functions (auth-svc, content-svc, assessment-svc) running.
 */
import { defineConfig, devices } from '@playwright/test';
import { config as loadDotenv } from 'dotenv';
import { resolve } from 'path';

// Load .env.e2e so operators can store live env vars once rather than
// exporting them manually before every run.
loadDotenv({ path: resolve(__dirname, '.env.e2e') });

export default defineConfig({
  testDir: './playwright/e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
