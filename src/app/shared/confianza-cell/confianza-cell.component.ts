import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';

export type ConfianzaLevel = 'high' | 'medium' | 'low' | null;

/**
 * PR-C (decision #878, user feedback): the user explicitly asked for
 * a PrimeNG component for the semáforo — NOT custom CSS circles.
 * We render a `<p-tag rounded>` whose severity maps from the level
 * (`high` → success, `medium` → warn, `low` → danger). The numeric
 * value is bound to `[value]` so it shows inside the circle, and the
 * accessibility story (aria-label + pTooltip) is preserved on a
 * wrapper span so color is NEVER the sole signal.
 */
@Component({
  selector: 'app-confianza-cell',
  standalone: true,
  imports: [TooltipModule, TagModule],
  template: `
    @if (level(); as lvl) {
      <span
        class="confianza-cell"
        data-testid="confianza-indicator"
        [attr.aria-level]="lvl"
        [attr.aria-label]="ariaLabel()"
        [pTooltip]="numericLabel()"
        tooltipPosition="top"
      >
        <p-tag
          [value]="numericLabel()"
          [severity]="tagSeverity()"
          [rounded]="true"
        />
      </span>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfianzaCellComponent {
  static readonly CONFIANZA_THRESHOLDS = { green: 85, yellow: 60 } as const;

  readonly value = input<number | null>(null);

  readonly level = computed<ConfianzaLevel>(() => {
    const v = this.value();
    if (v === null || v === undefined) return null;
    if (v >= ConfianzaCellComponent.CONFIANZA_THRESHOLDS.green) return 'high';
    if (v >= ConfianzaCellComponent.CONFIANZA_THRESHOLDS.yellow) return 'medium';
    return 'low';
  });

  /**
   * Mapea el nivel de confianza a la severidad de PrimeNG `p-tag`:
   *   high   → success (verde)
   *   medium → warn    (amarillo)
   *   low    → danger  (rojo)
   * Devuelve `null` cuando no hay valor (mata el @if del template).
   */
  readonly tagSeverity = computed<'success' | 'warn' | 'danger' | null>(() => {
    const lvl = this.level();
    if (lvl === 'high') return 'success';
    if (lvl === 'medium') return 'warn';
    if (lvl === 'low') return 'danger';
    return null;
  });

  readonly ariaLabel = computed<string | null>(() => {
    const v = this.value();
    const lvl = this.level();
    if (v === null || v === undefined || !lvl) return null;
    const label = lvl === 'high' ? 'alta' : lvl === 'medium' ? 'media' : 'baja';
    return `Confianza ${label}: ${v}`;
  });

  readonly numericLabel = computed<string | undefined>(() => {
    const v = this.value();
    return v === null || v === undefined ? undefined : `${v}`;
  });
}