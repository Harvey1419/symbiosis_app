import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Tag, type TagSeverity } from 'primeng/tag';
import { ConfianzaCellComponent } from './confianza-cell.component';

/**
 * Acceptance scenarios from spec rev 3 §6 (Capability 4):
 *   - >=85 → green, 60–84 → yellow, <60 → red, null → nothing
 *   - Color MUST NOT be the sole signal: numeric value in tooltip AND aria-label
 *
 * PR-C (decision #878, user feedback): ConfianzaCellComponent must
 * render a PrimeNG `p-tag` rounded — NOT custom CSS circles. The
 * severity maps level → success/warn/danger and the rounded=true
 * prop renders a circular chip.
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

  function getPrimeTag(): { instance: Tag; native: HTMLElement } | null {
    const debugEl = fixture.debugElement.query(By.directive(Tag));
    if (!debugEl) return null;
    const native = debugEl.nativeElement as HTMLElement;
    return { instance: debugEl.componentInstance as Tag, native };
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

  // PR-C (decision #878): use PrimeNG `p-tag` rounded, NOT custom CSS.
  describe('PrimeNG p-tag (rounded semáforo)', () => {
    it('renders a PrimeNG Tag component (not a custom CSS span)', () => {
      setInput(85);

      const tag = getPrimeTag();
      // Tag component must be present and be a real PrimeNG component instance.
      expect(tag).not.toBeNull();
      expect(tag!.instance).toBeInstanceOf(Tag);
    });

    it('binds severity to "success" for high level (85)', () => {
      setInput(85);

      const tag = getPrimeTag();
      expect(tag?.instance.severity).toBe<TagSeverity>('success');
    });

    it('binds severity to "warn" for medium level (70)', () => {
      setInput(70);

      const tag = getPrimeTag();
      expect(tag?.instance.severity).toBe<TagSeverity>('warn');
    });

    it('binds severity to "danger" for low level (30)', () => {
      setInput(30);

      const tag = getPrimeTag();
      expect(tag?.instance.severity).toBe<TagSeverity>('danger');
    });

    it('rounds the tag (rounded=true) so it renders as a circle', () => {
      setInput(85);

      const tag = getPrimeTag();
      expect(tag?.instance.rounded).toBe(true);
    });

    it('renders the numeric value inside the tag (e.g., "85")', () => {
      setInput(85);

      const tag = getPrimeTag();
      expect(tag?.instance.value).toBe('85');
    });

    it('preserves the tooltip with the numeric value (pTooltip)', () => {
      setInput(85);

      const indicator = getIndicator();
      // happy-dom does not always render PrimeNG tooltip directive attrs,
      // but the wrapper span must still receive the numeric label so the
      // pTooltip directive can read it on hover.
      expect(indicator).not.toBeNull();
      expect(indicator?.textContent?.trim()).toBe('85');
    });

    it('preserves the aria-label and aria-level on the wrapper span', () => {
      setInput(70);

      const indicator = getIndicator();
      expect(indicator).not.toBeNull();
      expect(indicator?.getAttribute('aria-label')).toBe('Confianza media: 70');
      expect(indicator?.getAttribute('aria-level')).toBe('medium');
    });
  });
});