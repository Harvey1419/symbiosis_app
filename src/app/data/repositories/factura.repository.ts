import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Factura, UpdateItemBody } from '@domain/models/factura.model';

export interface HistoricoRow {
  id: string;
  client_nit: string;
  vendor_nit: string;
  vendor_name: string | null;
  fecha: string | null;
  item_text: string | null;
  item_value: number | null;
  account_code: string;
  account_name: string | null;
  iva_code: string | null;
  iva_pct: number | null;
  rete_code: string | null;
  rete_pct: number | null;
  has_tax: boolean | null;
  created_at: string;
}

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

  /** POST /api/facturas/:id/reabir — reverts to target status. */
  reabrir(id: string, target: 'pendiente' | 'causada'): Observable<Factura> {
    return this.http.post<Factura>(`${this.apiUrl}/facturas/${id}/reabrir`, { target });
  }

  /** GET /api/facturas/:id/historico — vendor causacion history. */
  getHistorico(id: string): Observable<HistoricoRow[]> {
    return this.http.get<HistoricoRow[]>(`${this.apiUrl}/facturas/${id}/historico`);
  }
}
