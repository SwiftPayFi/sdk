import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      // types.ts is type-only; nothing to execute at runtime.
      exclude: ['src/types.ts'],
      thresholds: {
        lines: 90,
        functions: 95,
        branches: 80,
      },
    },
  },
});
