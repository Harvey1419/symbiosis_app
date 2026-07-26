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
    // happy-dom replaces jsdom because jsdom's CSS parser can't handle
    // modern features PrimeNG relies on (color-mix, custom-property
    // selectors, layered rules). happy-dom uses a CSS parser that
    // accepts them, so "Could not parse CSS stylesheet" warnings stop
    // appearing at the source instead of being silenced downstream.
    environment: 'happy-dom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/test-setup.ts', 'src/main.ts', 'src/environments/**'],
    },
  },
});
