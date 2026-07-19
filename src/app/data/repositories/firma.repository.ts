import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay, tap } from 'rxjs';
import { environment } from '@environments/environment';
import { Cliente } from '@domain/models/cliente.model';
import type {
  CrearEmpresaInput,
  UpdateEmpresaInput,
} from '@app/shared/crear-empresa-dialog/crear-empresa.schema';

export interface Firma {
  id: string;
  firma_user: string;
  tipo_siigo: 'contador' | 'nube';
  nit: number | null;
  last_token: string | null;
  // Campos adicionales devueltos por POST /api/firmas (crear empresa),
  // PATCH /api/empresas/:nit (terminar registro) y GET /api/firmas (read
  // model — WU-6). Opcionales / nullables porque filas legacy pre-migration
  // pueden tener defaults vacíos.
  tipo_persona?: 'juridica' | 'natural' | null;
  nombre?: string | null;
  tipo_id_rep_legal?: 'cedula' | 'cedula_extranjeria' | 'pasaporte' | null;
  id_rep_legal?: number | null;
  activo?: boolean;
  usuario_id?: string;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class FirmaRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private firmas$: Observable<Firma[]> | null = null;

  getFirmas(): Observable<Firma[]> {
    if (!this.firmas$) {
      this.firmas$ = this.http.get<Firma[]>(`${this.apiUrl}/firmas`).pipe(
        shareReplay(1)
      );
    }
    return this.firmas$;
  }

  getFirmaClientes(firmaId: string): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.apiUrl}/firmas/${firmaId}/clientes`);
  }

  /**
   * POST /api/firmas — crea una nueva firma (modal "Crear Empresa").
   * El backend encripta `firma_pass` antes de persistir; la respuesta
   * NUNCA incluye `firma_pass`.
   */
  create(input: CrearEmpresaInput): Observable<Firma> {
    return this.http.post<Firma>(`${this.apiUrl}/firmas`, input).pipe(
      tap(() => {
        this.firmas$ = null;
      })
    );
  }

  /**
   * PATCH /api/empresas/:nit — actualiza los datos de negocio de la empresa
   * asociada a una firma. Solo los 5 campos de negocio son aceptados;
   * `firma_pass`, `firma_user`, `tipo_siigo` están reservados al flujo de
   * creación.
   */
  updateEmpresa(nit: number, input: UpdateEmpresaInput): Observable<Firma> {
    return this.http.patch<Firma>(`${this.apiUrl}/empresas/${nit}`, input).pipe(
      tap(() => {
        this.firmas$ = null;
      })
    );
  }

  /**
   * DELETE /api/empresas/:nit — soft-delete de la empresa.
   *
   * La empresa NO se borra físicamente; el backend la marca como oculta
   * y deja de aparecer en `GET /api/firmas`.
   *
   * Solo aplica cuando la firma YA tiene NIT (es decir, ya fue
   * "terminada" y existe la fila en `empresas`). Para firmas legacy sin
   * NIT usar `deleteFirma(id)`.
   *
   * TODO backend: este endpoint aún no existe en
   * `api/src/presentation/routes/empresa.routes.ts`. Cuando se agregue,
   * el handler debe responder `204 No Content` y el use-case debe
   * invalidar `firmas$` para que el siguiente `getFirmas()` traiga la
   * lista actualizada.
   */
  deleteEmpresa(nit: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/empresas/${nit}`).pipe(
      tap(() => {
        this.firmas$ = null;
      }),
    );
  }

  /**
   * DELETE /api/firmas/:id — soft-delete de la firma (sin empresa asociada).
   *
   * Aplica cuando la firma NO tiene NIT (caso legacy nube pendiente de
   * "Terminar registro"). El identificador estable es `firma.id` (UUID),
   * no el NIT, porque la fila de `empresas` aún no existe.
   *
   * Para firmas con NIT, usar `deleteEmpresa(nit)` que opera sobre la
   * fila de `empresas`.
   *
   * TODO backend: este endpoint tampoco existe aún. La regresión histórica
   * que removió `PATCH /api/firmas/:id` (empresas-aux-revert WU) NO
   * aplica a DELETE — agregar este endpoint es seguro.
   */
  deleteFirma(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/firmas/${id}`).pipe(
      tap(() => {
        this.firmas$ = null;
      }),
    );
  }
}
