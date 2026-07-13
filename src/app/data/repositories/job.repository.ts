import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

/** Paginated metadata returned by the job endpoints. */
export interface JobPageMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/** A single error record persisted on chunk failure (job_errores table). */
export interface JobError {
  id: string;
  job_id: string;
  factura_id: string | null;
  tipo: string;
  mensaje: string;
  detalle: Record<string, unknown> | null;
  created_at: string;
}

/** Response shape for GET /api/jobs/:jobId/errores. */
export interface JobErroresResponse {
  errors: JobError[];
  meta: JobPageMeta;
}

/** Lightweight invoice row returned by GET /api/jobs/:jobId/invoices. */
export interface JobInvoice {
  id: string;
  track_id: string;
  client_nit: number;
  vendor_nit: string;
  vendor_name: string;
  status: string;
  total_pagar: number | null;
  created_at: string;
  job_id: string;
}

/** Response shape for GET /api/jobs/:jobId/invoices. */
export interface JobInvoicesResponse {
  invoices: JobInvoice[];
  meta: JobPageMeta;
}

@Injectable({ providedIn: 'root' })
export class JobRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** GET /api/jobs/:jobId/errores — paginated audit errors for a sync job. */
  getJobErrores(jobId: string, page = 1, limit = 50): Observable<JobErroresResponse> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http.get<JobErroresResponse>(`${this.apiUrl}/jobs/${jobId}/errores`, { params });
  }

  /** GET /api/jobs/:jobId/invoices — paginated invoices processed by a sync job. */
  getJobInvoices(jobId: string, page = 1, limit = 50): Observable<JobInvoicesResponse> {
    const params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    return this.http.get<JobInvoicesResponse>(`${this.apiUrl}/jobs/${jobId}/invoices`, { params });
  }
}
