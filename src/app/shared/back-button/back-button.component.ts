import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { inject } from '@angular/core';

/**
 * BackButtonComponent — botón "Volver" uniforme para todas las pantallas
 * de detalle del flujo Firmas → Clientes → Facturas.
 *
 * Estilo idéntico al `SyncStatusPill` / `GearButton` del sidebar (PrimeNG
 * outlined secondary). Usa `pi pi-arrow-left` como icono.
 *
 * Modos de navegación:
 *   - Con `[routerLink]` + `[navigationState]` → navega explícitamente y
 *     forward el state (típico para volver de un detalle a su padre
 *     preservando el breadcrumb del padre).
 *   - Con solo `[routerLink]` → navega explícitamente sin state.
 *   - Sin nada → `history.back()` (preserva state del history.state nativo
 *     del navegador).
 *
 * El estado forward se usa para que el breadcrumb del padre siga mostrando
 * la jerarquía completa al volver (ej. volver de Factura → ClienteDetail
 * debe mantener "Firmas > Firma > Cliente" en el breadcrumb).
 */
@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [ButtonModule],
  template: `
    <p-button
      [label]="label()"
      icon="pi pi-arrow-left"
      severity="secondary"
      [outlined]="true"
      size="small"
      styleClass="app-back-button"
      (onClick)="onClick()"
    />
  `,
  styles: [`
    :host { display: inline-block; }

    // El p-button outlined-secondary que usamos para back tiene el texto
    // muy tenue por default — le subimos el contraste para que sea legible
    // en el contexto de page-header (junto al título grande). El icono hereda
    // el color del label para mantener consistencia visual.
    :host ::ng-deep .app-back-button.p-button.p-button-outlined.p-button-secondary {
      color: var(--text-strong);
      border-color: var(--border-strong);
      font-weight: 500;

      .p-button-icon,
      .p-button-label {
        color: inherit;
      }

      &:enabled:hover {
        color: var(--color-yellow);
        border-color: var(--color-yellow);
        background: rgba(241, 255, 88, 0.08);
      }

      &:enabled:focus-visible {
        outline: 2px solid var(--color-yellow);
        outline-offset: 2px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackButtonComponent {
  /** Texto del botón (default 'Volver'). */
  readonly label = input<string>('Volver');

  /**
   * Si se pasa, navega a ese path al hacer click (usa Angular Router).
   * Si NO se pasa, hace history.back() — útil para preservar el state
   * del navegador cuando el destino es ambiguo.
   */
  readonly routerLink = input<string[] | null>(null);

  /**
   * State a propagar en la navegación (mismo shape que
   * `Router.navigate(commands, { state })`). Se mergea con `routerLink`
   * cuando ambos están presentes.
   *
   * Ej: `<app-back-button [routerLink]="['/clientes', nit()]" [navigationState]="{ clienteNombre, firmaId, firmaNombre }" />`
   */
  readonly navigationState = input<Record<string, unknown> | null>(null);

  private readonly router = inject(Router);

  onClick(): void {
    const link = this.routerLink();
    const navState = this.navigationState();
    if (link) {
      this.router.navigate(link, navState ? { state: navState } : {});
    } else {
      // Fallback: historial del navegador.
      window.history.back();
    }
  }
}