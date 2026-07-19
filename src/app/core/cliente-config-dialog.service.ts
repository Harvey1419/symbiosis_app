import { Injectable, signal } from '@angular/core';
import type { Cliente } from '@domain/models/cliente.model';

/**
 * Bridge signal-based para abrir/cerrar el `ClienteConfigDialogComponent`
 * desde `FirmaClientesComponent` (lista de `/clientes/firma/:id`).
 *
 * Espejo de `CrearEmpresaDialogService` pero para clientes — los datos
 * del cliente vienen de Siigo (sync), no son editables como una firma
 * propia, pero el modal permite ajustar `tipo_persona` y datos del
 * representante legal igual que una empresa normal.
 *
 * Hospedaje: el `<app-cliente-config-dialog>` se monta en
 * `firma-clientes.component.html` y reacciona a `visible()` + `editingCliente()`.
 */
@Injectable({ providedIn: 'root' })
export class ClienteConfigDialogService {
  readonly visible = signal(false);
  readonly editingCliente = signal<Cliente | null>(null);

  /** Cierra el dialog sin payload. */
  close(): void {
    this.visible.set(false);
    this.editingCliente.set(null);
  }

  /**
   * Abre el dialog pre-llenado con los datos del cliente indicado.
   * El modal muestra `cliente.empresas.*` (join con la tabla `empresas`).
   */
  openForEdit(cliente: Cliente): void {
    this.editingCliente.set(cliente);
    this.visible.set(true);
  }
}