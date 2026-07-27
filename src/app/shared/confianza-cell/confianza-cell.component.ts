import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';

export type ConfianzaLevel = 'high' | 'medium' | 'low' | null;

@Component({
  selector: 'app-confianza-cell',
  standalone: true,
  imports: [TooltipModule],
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
        {{ value() }}
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