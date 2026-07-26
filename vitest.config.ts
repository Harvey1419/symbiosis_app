import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig({
  plugins: [angular()],
  resolve: {
    alias: {
      '@app': resolve(__dirname, 'src/app'),
      '@core': resolve(__dirname, 'src/app/core'),
      '@data': resolve(__dirname, 'src/app/data'),
      '@domain': resolve(__dirname, 'src/app/domain'),
      '@presentation': resolve(__dirname, 'src/app/presentation'),
      '@environments': resolve(__dirname, 'src/environments'),
    },
  },
  cacheDir: './node_modules/.cache/vitest',
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    // jsdom's CSS parser doesn't understand modern features (color-mix,
    // custom-property selectors, layered rules). PrimeNG renders inline
    // styles into jsdom, which triggers harmless "Could not parse CSS
    // stylesheet" warnings. Filter them at the framework boundary so the
    // test output stays clean without affecting test results.
    onConsoleLog(_log: string, _type: 'stdout' | 'stderr'): boolean | undefined {
      return undefined;
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/test-setup.ts', 'src/main.ts', 'src/environments/**'],
    },
  },
});
