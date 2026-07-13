import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ThemeService } from '@core/theme.service';

/**
 * ThemeToggleButton — sun/moon toggle for switching between dark and light
 * themes. Persists preference via ThemeService.
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [ButtonModule, TooltipModule],
  template: `
    <p-button
      [icon]="theme.isDark() ? 'pi pi-sun' : 'pi pi-moon'"
      severity="secondary"
      [text]="true"
      [rounded]="true"
      size="small"
      (onClick)="theme.toggle()"
      [pTooltip]="theme.isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
      tooltipPosition="bottom"
      [attr.aria-label]="theme.isDark() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
    />
  `,
  styles: [`
    :host { display: inline-flex; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleButtonComponent {
  readonly theme = inject(ThemeService);
}