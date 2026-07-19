import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
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
  // Campos adicionales devueltos por POST /api/firmas (crear empresa)
  // o PATCH /api/firmas/:id (terminar registro). Opcionales porque
  // GET /api/firmas no los incluye.
  tipo_persona?: 'juridica' | 'natural' | null;
  nombre?: string | null;
  activo?: boolean;
  usuario_id?: string;
  created_at?: string;
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

  /**
   * POST /api/firmas — crea una nueva firma (modal "Crear Empresa").
   * El backend encripta `firma_pass` antes de persistir; la respuesta
   * NUNCA incluye `firma_pass`.
   */
  create(input: CrearEmpresaInput): Observable<Firma> {
    return this.http.post<Firma>(`${this.apiUrl}/firmas`, input);
  }

  /**
   * PATCH /api/firmas/:id — completa los datos de negocio de una firma
   * legacy (modal "Terminar Registro"). Solo los 5 campos de negocio
   * son aceptados; `firma_pass`, `firma_user`, `tipo_siigo` están
   * reservados al flow de creación.
   */
  updateFirma(id: string, input: UpdateEmpresaInput): Observable<Firma> {
    return this.http.patch<Firma>(`${this.apiUrl}/firmas/${id}`, input);
  }
}
