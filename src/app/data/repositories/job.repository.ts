import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
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

export interface CreateSyncJobRequest {
  firma_id: string;
  nit_cliente: string;
  desde: string;
  hasta: string;
  token_dian: string;
}

export interface CreateSyncJobResponse {
  jobId: string;
  total: number;
}

export interface RetryErrorsRequest {
  token_dian: string;
  desde: string;
  hasta: string;
}

export interface RetryErrorsResponse {
  jobId: string;
  total: number;
}

export interface JobStatusResponse {
  estado: string;
  total: number;
  procesadas: number;
  errors: number;
  progress: number;
}

export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (!(error instanceof HttpErrorResponse)) {
    return new AppError('UNKNOWN_ERROR', 'An unexpected error occurred', 0);
  }

  const payload = error.error && typeof error.error === 'object'
    ? error.error as Record<string, unknown>
    : {};
  const nestedError = payload['error'] && typeof payload['error'] === 'object'
    ? payload['error'] as Record<string, unknown>
    : undefined;
  const code = typeof nestedError?.['code'] === 'string'
    ? nestedError['code']
    : typeof payload['code'] === 'string'
      ? payload['code']
      : 'HTTP_ERROR';
  const message = typeof nestedError?.['message'] === 'string'
    ? nestedError['message']
    : typeof payload['message'] === 'string'
      ? payload['message']
      : error.message;

  return new AppError(code, message, error.status);
}

@Injectable({ providedIn: 'root' })
export class JobRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  /** POST /api/jobs/sync-dian — creates an asynchronous DIAN sync job. */
  createSyncJob(req: CreateSyncJobRequest): Observable<CreateSyncJobResponse> {
    return this.http.post<CreateSyncJobResponse>(`${this.apiUrl}/jobs/sync-dian`, req).pipe(
      catchError((error: unknown) => throwError(() => toAppError(error))),
    );
  }

  /** GET /api/jobs/:jobId — authoritative job progress snapshot. */
  getJobStatus(jobId: string): Observable<JobStatusResponse> {
    return this.http.get<JobStatusResponse>(`${this.apiUrl}/jobs/${jobId}`).pipe(
      catchError((error: unknown) => throwError(() => toAppError(error))),
    );
  }

  /** POST /api/jobs/:jobId/retry-errors — retries exhausted items in a fresh job. */
  retryErrors(jobId: string, req: RetryErrorsRequest): Observable<RetryErrorsResponse> {
    return this.http.post<RetryErrorsResponse>(`${this.apiUrl}/jobs/${jobId}/retry-errors`, req).pipe(
      catchError((error: unknown) => throwError(() => toAppError(error))),
    );
  }

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
