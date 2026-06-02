import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Cliente } from '@domain/models/cliente.model';

export interface Firma {
  id: string;
  firma_user: string;
  tipo_siigo: 'contador' | 'nube';
  nit: number | null;
  last_token: string | null;
}

@Injectable({ providedIn: 'root' })
export class FirmaRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getFirmas(): Observable<Firma[]> {
    return this.http.get<Firma[]>(`${this.apiUrl}/firmas`);
  }

  getFirmaClientes(firmaId: string): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.apiUrl}/firmas/${firmaId}/clientes`);
  }
}