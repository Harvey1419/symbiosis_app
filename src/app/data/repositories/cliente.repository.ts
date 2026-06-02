import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Cliente } from '@domain/models/cliente.model';

@Injectable({ providedIn: 'root' })
export class ClienteRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getClientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.apiUrl}/clientes`);
  }

  getCliente(nit: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/clientes/${nit}`);
  }

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
}
