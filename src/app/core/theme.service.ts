import { Injectable, effect, signal } from '@angular/core';

const STORAGE_KEY = 'symbiosis-theme';

/**
 * ThemeService — dark/light toggle for the platform.
 * Default: dark (matches Luminous Dark Management style guide).
 * Persists preference in localStorage. Applies `.app-dark` or `.app-light`
 * class to <html> so PrimeNG darkModeSelector picks it up.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  /** Public signal: true = dark, false = light. */
  readonly isDark = signal<boolean>(true);

  constructor() {
    // Hydrate from localStorage
    const stored = this.readStored();
    if (stored !== null) {
      this.isDark.set(stored);
    }

    // Apply on every change
    effect(() => {
      const dark = this.isDark();
      this.applyToDocument(dark);
      this.writeStored(dark);
    });
  }

  toggle(): void {
    this.isDark.update((v) => !v);
  }

  setDark(dark: boolean): void {
    this.isDark.set(dark);
  }

  // ---- private helpers ----

  private applyToDocument(dark: boolean): void {
    if (typeof document === 'undefined') return;
    const html = document.documentElement;
    html.classList.remove('app-dark', 'app-light');
    html.classList.add(dark ? 'app-dark' : 'app-light');
  }

  private readStored(): boolean | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'dark') return true;
    if (raw === 'light') return false;
    return null;
  }

  private writeStored(dark: boolean): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  }
}