import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ConfianzaCellComponent } from './confianza-cell.component';

/**
 * Acceptance scenarios from spec rev 3 §6 (Capability 4):
 *   - >=85 → green, 60–84 → yellow, <60 → red, null → nothing
 *   - Color MUST NOT be the sole signal: numeric value in tooltip AND aria-label
 *
 * Tests assert visible/accessible behavior, never CSS classes.
 */
describe('ConfianzaCellComponent', () => {
  let fixture: ComponentFixture<ConfianzaCellComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ConfianzaCellComponent],
    });
  });

  function setInput(value: number | null): void {
    fixture = TestBed.createComponent(ConfianzaCellComponent);
    fixture.componentRef.setInput('value', value);
    fixture.detectChanges();
  }

  function getIndicator(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-testid="confianza-indicator"]');
  }

  function getAriaLabel(): string | null {
    return getIndicator()?.getAttribute('aria-label') ?? null;
  }

  it('renders the high level at the green boundary (85)', () => {
    setInput(85);

    const indicator = getIndicator();
    expect(indicator).not.toBeNull();
    expect(getAriaLabel()).toBe('Confianza alta: 85');
    expect(indicator?.getAttribute('aria-level')).toBe('high');
    expect(indicator?.textContent?.trim()).toBe('85');
  });

  it('renders the medium level just below green (84)', () => {
    setInput(84);

    const indicator = getIndicator();
    expect(indicator).not.toBeNull();
    expect(getAriaLabel()).toBe('Confianza media: 84');
    expect(indicator?.getAttribute('aria-level')).toBe('medium');
    expect(indicator?.textContent?.trim()).toBe('84');
  });

  it('renders the medium level at the yellow boundary (60)', () => {
    setInput(60);

    const indicator = getIndicator();
    expect(indicator).not.toBeNull();
    expect(getAriaLabel()).toBe('Confianza media: 60');
    expect(indicator?.getAttribute('aria-level')).toBe('medium');
    expect(indicator?.textContent?.trim()).toBe('60');
  });

  it('renders the low level just below yellow (59)', () => {
    setInput(59);

    const indicator = getIndicator();
    expect(indicator).not.toBeNull();
    expect(getAriaLabel()).toBe('Confianza baja: 59');
    expect(indicator?.getAttribute('aria-level')).toBe('low');
    expect(indicator?.textContent?.trim()).toBe('59');
  });

  it('renders a mid-range low value (10) with the low level and accessible text', () => {
    setInput(10);

    const indicator = getIndicator();
    expect(indicator).not.toBeNull();
    expect(getAriaLabel()).toBe('Confianza baja: 10');
    expect(indicator?.getAttribute('aria-level')).toBe('low');
    expect(indicator?.textContent?.trim()).toBe('10');
  });

  it('renders nothing when confianza is null', () => {
    setInput(null);

    expect(getIndicator()).toBeNull();
    expect(fixture.nativeElement.textContent?.trim()).toBe('');
  });

  it('exports the 85/60 thresholds as CONFIANZA_THRESHOLDS', () => {
    // Triangulation: thresholds are the source of truth for the boundary logic.
    expect(ConfianzaCellComponent.CONFIANZA_THRESHOLDS).toEqual({ green: 85, yellow: 60 });
  });
});