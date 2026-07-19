import { Injectable, signal } from '@angular/core';

/**
 * Bridge signal-based para abrir/cerrar el `CrearEmpresaDialogComponent`
 * desde cualquier punto de la app sin prop-drilling.
 *
 * Usado por:
 *   - `LoginComponent` post-login cuando el usuario no tiene firmas (AC-3).
 *   - `ClienteListComponent` botón "Agregar Empresa" (AC-10).
 *
 * El dialog se hostea en un punto alto del tree (ej. `app.component`)
 * y reacciona al `visible()` signal de este servicio.
 */
@Injectable({ providedIn: 'root' })
export class CrearEmpresaDialogService {
  readonly visible = signal(false);

  open(): void {
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
  }
}
