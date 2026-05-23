/**
 * Vitest config — Stage 19 + Q-1.1-POLISH-B1 (jsdom added for render tests).
 *
 * Excludes Playwright e2e specs from Vitest discovery so the unit test
 * runner doesn't try to evaluate `test.skip` (Playwright API) at file load.
 * Playwright runs via `pnpm --filter @mm/web e2e` separately.
 *
 * @/ alias mirrors tsconfig.json paths: "@/*": ["./src/*"].
 * Required for tests that import components which use the @/ alias internally.
 *
 * esbuild.jsx: 'automatic' overrides tsconfig "preserve" so .tsx test files
 * are JSX-transformed correctly. tsconfig "preserve" is Next.js/SWC only.
 */
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: ['node_modules/**', 'playwright/**', '.next/**'],
  },
});
