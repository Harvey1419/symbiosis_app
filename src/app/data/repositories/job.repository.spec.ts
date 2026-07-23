import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppError, JobRepository } from './job.repository';
import { environment } from '@environments/environment';

describe('JobRepository', () => {
  let repo: JobRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [JobRepository, provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(JobRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('getJobErrores(jobId) hace GET /api/jobs/:id/errores con page+limit', () => {
    const mock = {
      errors: [
        {
          id: '1',
          job_id: 'j1',
          factura_id: null,
          tipo: 'Error',
          mensaje: 'fail',
          detalle: null,
          created_at: '2026-07-13T00:00:00Z',
        },
      ],
      meta: { page: 1, limit: 50, total: 1, pages: 1 },
    };

    let receivedErrorsLength = 0;
    let receivedTotal = 0;
    repo.getJobErrores('j1').subscribe((res) => {
      receivedErrorsLength = res.errors.length;
      receivedTotal = res.meta.total;
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/jobs/j1/errores` &&
        r.params.get('page') === '1' &&
        r.params.get('limit') === '50',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mock);

    expect(receivedErrorsLength).toBe(1);
    expect(receivedTotal).toBe(1);
    httpMock.verify();
  });

  it('getJobErrores(jobId, page, limit) reenvia page y limit', () => {
    repo.getJobErrores('j1', 2, 25).subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/jobs/j1/errores` &&
        r.params.get('page') === '2' &&
        r.params.get('limit') === '25',
    );
    expect(req.request.method).toBe('GET');
    req.flush({ errors: [], meta: { page: 2, limit: 25, total: 0, pages: 0 } });
    httpMock.verify();
  });

  it('getJobInvoices(jobId) hace GET /api/jobs/:id/invoices con page+limit', () => {
    const mock = {
      invoices: [
        {
          id: 'f1',
          track_id: 'track-1',
          client_nit: 900123456,
          vendor_nit: 'v1',
          vendor_name: 'Vendor 1',
          status: 'pendiente',
          total_pagar: 1000,
          created_at: '2026-07-13T00:00:00Z',
          job_id: 'j1',
        },
      ],
      meta: { page: 1, limit: 50, total: 1, pages: 1 },
    };

    let receivedInvoicesLength = 0;
    let receivedTotal = 0;
    repo.getJobInvoices('j1').subscribe((res) => {
      receivedInvoicesLength = res.invoices.length;
      receivedTotal = res.meta.total;
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiUrl}/jobs/j1/invoices` &&
        r.params.get('page') === '1' &&
        r.params.get('limit') === '50',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mock);

    expect(receivedInvoicesLength).toBe(1);
    expect(receivedTotal).toBe(1);
    httpMock.verify();
  });

  it('getJobInvoices(jobId) maneja respuesta vacia', () => {
    const mock = { invoices: [], meta: { page: 1, limit: 50, total: 0, pages: 0 } };

    let received: unknown[] | undefined;
    repo.getJobInvoices('j1').subscribe((res) => {
      received = res.invoices;
    });

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/jobs/j1/invoices`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mock);

    expect(received).toEqual([]);
    httpMock.verify();
  });

  it('createSyncJob(req) POSTs the DIAN sync request and returns the created job', () => {
    const request = {
      firma_id: 'firma-1',
      nit_cliente: '900123456',
      desde: '2026-07-01',
      hasta: '2026-07-23',
      token_dian: 'dian-token-value',
    };
    let received: { jobId: string; total: number } | undefined;

    repo.createSyncJob(request).subscribe((response) => {
      received = response;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/jobs/sync-dian`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ jobId: 'job-new', total: 12 });

    expect(received).toEqual({ jobId: 'job-new', total: 12 });
    httpMock.verify();
  });

  it('getJobStatus(jobId) GETs the authoritative job snapshot', () => {
    const snapshot = {
      estado: 'processing',
      total: 10,
      procesadas: 7,
      errors: 1,
      progress: 80,
    };
    let received: typeof snapshot | undefined;

    repo.getJobStatus('job-7').subscribe((response) => {
      received = response;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/jobs/job-7`);
    expect(req.request.method).toBe('GET');
    req.flush(snapshot);

    expect(received).toEqual(snapshot);
    httpMock.verify();
  });

  it('retryErrors(jobId, req) POSTs fresh DIAN credentials and returns the retry job', () => {
    const request = {
      token_dian: 'fresh-dian-token',
      desde: '2026-07-01',
      hasta: '2026-07-23',
    };
    let received: { jobId: string; total: number } | undefined;

    repo.retryErrors('source-job', request).subscribe((response) => {
      received = response;
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/jobs/source-job/retry-errors`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({ jobId: 'retry-job', total: 2 });

    expect(received).toEqual({ jobId: 'retry-job', total: 2 });
    httpMock.verify();
  });

  it('maps backend 4xx/5xx envelopes to AppError with their code and message', () => {
    let receivedError: unknown;

    repo.createSyncJob({
      firma_id: 'firma-1',
      nit_cliente: '900123456',
      desde: '2026-07-23',
      hasta: '2026-07-01',
      token_dian: 'dian-token-value',
    }).subscribe({ error: (error: unknown) => { receivedError = error; } });

    const req = httpMock.expectOne(`${environment.apiUrl}/jobs/sync-dian`);
    req.flush(
      { error: { code: 'INVALID_DATE_RANGE', message: 'desde must be before hasta' } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(receivedError).toBeInstanceOf(AppError);
    expect(receivedError).toMatchObject({
      code: 'INVALID_DATE_RANGE',
      message: 'desde must be before hasta',
      statusCode: 422,
    });

    receivedError = undefined;
    repo.getJobStatus('job-500').subscribe({ error: (error: unknown) => { receivedError = error; } });
    const serverReq = httpMock.expectOne(`${environment.apiUrl}/jobs/job-500`);
    serverReq.flush(
      { code: 'SYNC_SERVICE_UNAVAILABLE', message: 'DIAN is temporarily unavailable' },
      { status: 503, statusText: 'Service Unavailable' },
    );

    expect(receivedError).toBeInstanceOf(AppError);
    expect(receivedError).toMatchObject({
      code: 'SYNC_SERVICE_UNAVAILABLE',
      message: 'DIAN is temporarily unavailable',
      statusCode: 503,
    });
    httpMock.verify();
  });
});
