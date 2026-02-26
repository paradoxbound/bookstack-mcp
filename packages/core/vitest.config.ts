import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 90_000,
    hookTimeout: 60_000,
    globalSetup: './tests/global-setup.ts',
    globalTeardown: './tests/global-teardown.ts',
    sequence: {
      sequential: true,
    },
    include: [
      'tests/write-tools.test.ts',
      'tests/read-tools.test.ts',
      'tests/write-gate.test.ts',
    ],
  },
});
