import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Impuesto } from '../../domain/models/impuesto.model';

@Injectable({ providedIn: 'root' })
export class ImpuestosRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** Returns all active impuestos configured for a client (NIT). */
  getImpuestosByNit(nit: number): Observable<Impuesto[]> {
    return this.http.get<Impuesto[]>(`${this.apiUrl}/clientes-impuestos/${nit}`);
  }
}