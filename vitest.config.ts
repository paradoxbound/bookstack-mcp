import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    globalSetup: './tests/global-setup.ts',
    sequence: {
      sequential: true,
    },
    // Order: write tests first (seed instance is empty), then read tests, then gate tests
    include: [
      'tests/write-tools.test.ts',
      'tests/read-tools.test.ts',
      'tests/write-gate.test.ts',
    ],
  },
});
