import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Factura, UpdateItemBody } from '@domain/models/factura.model';

@Injectable({ providedIn: 'root' })
export class FacturaRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getFacturas(nit: number): Observable<Factura[]> {
    return this.http.get<Factura[]>(`${this.apiUrl}/facturas/${nit}`);
  }

  /** GET /api/facturas/item/:id — single factura by UUID. */
  getById(id: string): Observable<Factura> {
    return this.http.get<Factura>(`${this.apiUrl}/facturas/item/${id}`);
  }

  /** PATCH /api/facturas/:id/items/:idx — edit cuenta/iva_code/rete_code. */
  updateItem(id: string, idx: number, body: UpdateItemBody): Observable<Factura> {
    return this.http.patch<Factura>(`${this.apiUrl}/facturas/${id}/items/${idx}`, body);
  }

  /** POST /api/facturas/:id/causar — sets status to 'causada'. */
  causar(id: string): Observable<Factura> {
    return this.http.post<Factura>(`${this.apiUrl}/facturas/${id}/causar`, {});
  }

  /** POST /api/facturas/:id/finalizar — sets status to 'finalizada' (idempotent). */
  finalizar(id: string): Observable<Factura> {
    return this.http.post<Factura>(`${this.apiUrl}/facturas/${id}/finalizar`, {});
  }

  /** POST /api/facturas/:id/reabrir — reverts to target status. */
  reabrir(id: string, target: 'pendiente' | 'causada'): Observable<Factura> {
    return this.http.post<Factura>(`${this.apiUrl}/facturas/${id}/reabrir`, { target });
  }

  /**
   * POST /api/excel/export-selection — dispara la exportación atómica de
   * la selección a un .xlsx de Siigo. Devuelve el `HttpResponse<Blob>`
   * completo para que el caller pueda leer `Content-Disposition`,
   * `X-Export-Causables` y `X-Export-Skipped` directamente de los headers.
   *
   * El `Authorization` lo adjunta el `authInterceptor` global — el repo
   * no debe setearlo a mano. Los errores 4xx llegan al subscriber como
   * `HttpErrorResponse.error = Blob`; este repositorio no los parsea, el
   * caller (componente) decide cómo presentarlos al usuario.
   *
   * `nit` es opcional: si el caller lo omite, el backend resuelve la
   * propiedad únicamente por `firmas.usuario_id`.
   */
  exportSelection(nit: number | undefined, facturaIds: string[]): Observable<HttpResponse<Blob>> {
    const body: { nit?: string; facturaIds: string[] } = { facturaIds };
    if (nit !== undefined && nit !== null) {
      body.nit = String(nit);
    }
    return this.http.post(
      `${this.apiUrl}/excel/export-selection`,
      body,
      { observe: 'response', responseType: 'blob' },
    );
  }
}
