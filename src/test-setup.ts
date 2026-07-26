// jsdom's CSS parser doesn't understand modern features (color-mix,
// custom-property selectors, layered rules). PrimeNG renders inline
// styles into jsdom during tests, which triggers harmless
// "Could not parse CSS stylesheet" warnings to stderr — and they bypass
// Vitest's `onConsoleLog` hook (emitted during environment init, before
// the hook attaches). Wrap `process.stderr.write` so we filter those
// specific lines while letting every other stderr write pass through.
const originalStderrWrite = process.stderr.write.bind(process.stderr);
(process.stderr as { write: typeof process.stderr.write }).write = function (
  chunk: string | Uint8Array,
  ...rest: unknown[]
): boolean {
  const text = typeof chunk === 'string' ? chunk : chunk.toString();
  if (text.includes('Could not parse CSS stylesheet')) {
    return true;
  }
  return (originalStderrWrite as unknown as (...a: unknown[]) => boolean)(chunk, ...rest);
};

import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
