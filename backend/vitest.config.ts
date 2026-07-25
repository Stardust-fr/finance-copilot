import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Native tsconfig paths support (replaces vite-tsconfig-paths plugin)
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/tests/**', 'src/index.ts'],
    },
    // Run test files sequentially to avoid DB conflicts
    sequence: { concurrent: false },
    maxWorkers: 1,
  },
});
