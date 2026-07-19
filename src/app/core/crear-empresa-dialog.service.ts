import { Injectable, signal } from '@angular/core';
import type { Firma } from '@data/repositories/firma.repository';

/**
 * Bridge signal-based para abrir/cerrar el `CrearEmpresaDialogComponent`
 * desde cualquier punto de la app sin prop-drilling.
 *
 * Usado por:
 *   - `LoginComponent` post-login cuando el usuario no tiene firmas.
 *   - `ClienteListComponent` botón "Agregar Empresa" (modo create).
 *   - `ClienteListComponent` botón "Terminar Registro" (modo edit, con
 *     `editingFirma` pre-llenada).
 *
 * El dialog se hostea en `cliente-list.component.html` y reacciona al
 * `visible()` + `editingFirma()` de este servicio.
 */
@Injectable({ providedIn: 'root' })
export class CrearEmpresaDialogService {
  readonly visible = signal(false);
  readonly editingFirma = signal<Firma | null>(null);

  /**
   * Modo create: dialog vacío para registrar una nueva empresa.
   */
  open(): void {
    this.editingFirma.set(null);
    this.visible.set(true);
  }

  /**
   * Modo edit ("Terminar Registro"): dialog pre-llenado con la firma
   * legacy para completar sus campos de negocio faltantes (nit, etc.).
   */
  openForEdit(firma: Firma): void {
    this.editingFirma.set(firma);
    this.visible.set(true);
  }

  close(): void {
    this.visible.set(false);
    this.editingFirma.set(null);
  }
}

