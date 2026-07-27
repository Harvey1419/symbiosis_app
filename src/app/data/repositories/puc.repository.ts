import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { CuentaPuc } from '@domain/models/puc.model';

@Injectable({ providedIn: 'root' })
export class PucRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** GET /api/clientes-puc/:nit — PUC accounts for a client, ordered by account_code. */
  getCuentaPuc(nit: number): Observable<CuentaPuc[]> {
    return this.http.get<CuentaPuc[]>(`${this.apiUrl}/clientes-puc/${nit}`);
  }

  /**
   * GET /api/clientes-puc/:nit?groups=1,2 — PUC accounts filtered by account group.
   *
   * Used by the factura-detail payment-row branch to source payment options
   * (`groups=1,2` — banks/cash/creditors) and expense options
   * (`groups=5` — gastos) from the SAME endpoint, so the backend can keep
   * the account-class filtering authoritative. See spec rev 3 §3 (Capability 1)
   * and decision-puc-filtering (#862).
   *
   * `HttpParams` serialises the array as a single comma-separated `groups`
   * query parameter; the backend's `PucQuerySchema` parses it back into
   * the unique integer set {1, 2}. Empty groups fall back to the
   * unfiltered contract for safety.
   */
  getCuentasByGroups(nit: number, groups: readonly number[]): Observable<CuentaPuc[]> {
    let params = new HttpParams();
    if (groups.length > 0) {
      params = params.set('groups', groups.join(','));
    }
    return this.http.get<CuentaPuc[]>(`${this.apiUrl}/clientes-puc/${nit}`, { params });
  }
}
