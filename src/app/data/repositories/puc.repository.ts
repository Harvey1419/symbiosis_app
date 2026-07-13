import { HttpClient } from '@angular/common/http';
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
}
