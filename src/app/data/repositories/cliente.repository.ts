import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

/**
 * Body que acepta el PATCH /api/empresas/:nit. Coincide con el shape del
 * `UpdateEmpresaInput` de firmas (cliente y firma comparten la tabla
 * `empresas` en supabase) — pero NO incluye `nit` porque es el route param.
 *
 * `firmaId` es opcional pero SIEMPRE lo mandamos desde el modal de
 * clientes: le indica al use-case backend que valide ownership via
 * `clientes_siigo` (porque `firmas.nit` es null para firmas contador
 * Siigo — la empresa del cliente vive separada).
 */
export interface UpdateClienteInput {
  tipo_persona: 'juridica' | 'natural';
  nombre: string;
  tipo_id_rep_legal: 'cedula' | 'cedula_extranjeria' | 'pasaporte';
  id_rep_legal: number;
  firmaId?: string;
}

@Injectable({ providedIn: 'root' })
export class ClienteRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Disparador de sincronización de trazabilidad contable para un cliente.
   * El backend resuelve la firma asociada desde el JWT (usuario_id) — el
   * frontend solo manda el nit del cliente.
   */
  sincronizarTrazabilidad(nit: number): Observable<{ success: boolean; registros: number }> {
    return this.http.post<{ success: boolean; registros: number }>(
      `${this.apiUrl}/sync/siigo/trazabilidad`,
      { nit_cliente: nit }
    );
  }

  /**
   * PATCH /api/empresas/:nit — actualiza los datos de negocio de una
   * empresa cliente.
   *
   * Comparte endpoint con `FirmaRepository.updateEmpresa` porque cliente
   * (`clientes_siigo`) y firma (`firmas`) terminan referenciando la misma
   * fila en `empresas` por NIT. El backend actualmente rechaza claves
   * desconocidas (`.strict()` en `UpdateEmpresaSchema`), por lo que el
   * body debe limitarse a: `tipo_persona`, `nombre`, `tipo_id_rep_legal`,
   * `id_rep_legal`.
   *
   * El modal "Config cliente" NO permite cambiar el `nombre` (viene de
   * Siigo y debe permanecer sincronizado), pero el campo se envía igual
   * porque el schema del backend lo requiere.
   *
   * TODO backend: el controller de `getFirmaClientes` aún no devuelve
   * `tipo_id_rep_legal` ni `id_rep_legal` en la join con `empresas` —
   * hay que sumarlos al `.select(...)` para que el modal los muestre
   * pre-rellenados al abrir.
   */
  updateCliente(nit: number, input: UpdateClienteInput): Observable<unknown> {
    return this.http.patch(`${this.apiUrl}/empresas/${nit}`, input);
  }
}
