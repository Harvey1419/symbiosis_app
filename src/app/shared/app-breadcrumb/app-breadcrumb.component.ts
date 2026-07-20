import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import type { MenuItem } from 'primeng/api';

/**
 * AppBreadcrumbComponent — wrapper sobre `<p-breadcrumb>` de PrimeNG con
 * los overrides de estilo encapsulados.
 *
 * ¿Por qué un wrapper y no usar `<p-breadcrumb>` directo en cada página?
 *   - **Una sola fuente de verdad** para los estilos del breadcrumb (que
 *     se usan en 3 páginas: firma-clientes, cliente-detail, factura-detail).
 *     Antes los overrides vivían en `styles.scss` global — eso rompía
 *     la regla de que `styles.scss` sea solo design tokens.
 *   - **Encapsulación Angular** — las reglas viven con el componente;
 *     si se borra el componente, las reglas se van con él.
 *   - **API mínima** — solo `model` y `home`; el resto de inputs de
 *     PrimeNG no se exponen para mantener el contrato cerrado.
 *
 * API:
 *   - `[model]` (required): MenuItem[] — los segmentos del breadcrumb.
 *   - `[home]` (optional): MenuItem — primer segmento (default usa 🏠 de PrimeNG).
 *
 * Estilo (en `app-breadcrumb.component.scss`):
 *   - Sin background (Aura theme lo trae por default).
 *   - Texto muted, hover amarillo, último item no interactivo.
 */
@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [BreadcrumbModule],
  template: `<p-breadcrumb [model]="model()" [home]="home()" />`,
  styleUrl: './app-breadcrumb.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBreadcrumbComponent {
  /** Segmentos del breadcrumb. El último segmento es la página actual (sin routerLink). */
  readonly model = input.required<MenuItem[]>();
  /** Item del "home" (default: 🏠). */
  readonly home = input<MenuItem | undefined>(undefined);
}