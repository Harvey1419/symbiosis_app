import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { JobRepository } from './job.repository';
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
});
