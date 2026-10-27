import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude E2E tests (run with Playwright) and benchmarks (run separately)
    exclude: ['**/node_modules/**', '**/e2e/**', '**/*.bench.js'],
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Vitest 5 resolves coverage excludes as globs; bare `tests/` no longer matches.
      exclude: [
        '**/node_modules/**',
        '**/tests/**',
        '**/examples/**',
        '**/*.config.js',
        '**/docs/**',
      ],
      // Minimum coverage thresholds. Set to just under the measured coverage
      // (lines 81.84%, statements 81.09%, branches 75.48%, functions 88.15%).
      // The gap is mostly auto-reconnect / advanced-measure branches.
      // Raise these as the corresponding unit tests are added.
      thresholds: {
        lines: 81,
        functions: 88,
        branches: 75,
        statements: 81,
      },
    },
  },
});
