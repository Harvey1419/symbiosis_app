import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ClienteRepository } from './cliente.repository';

describe('ClienteRepository', () => {
  let repo: ClienteRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(ClienteRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('sincronizarTrazabilidad(nit) hace POST /api/sync/siigo/trazabilidad con body { nit_cliente: nit }', () => {
    const nit = 900123456;

    let actualBody: unknown;
    let actualUrl = '';
    repo.sincronizarTrazabilidad(nit).subscribe((res) => {
      expect(res.success).toBe(true);
      expect(res.registros).toBe(42);
    });

    const req = httpMock.expectOne((r) => {
      actualUrl = r.url;
      actualBody = r.body;
      return true;
    });

    expect(req.request.method).toBe('POST');
    expect(actualUrl).toBe('/api/sync/siigo/trazabilidad');
    expect(actualBody).toEqual({ nit_cliente: nit });
    expect(req.request.body).toEqual({ nit_cliente: 900123456 });

    req.flush({ success: true, registros: 42 });
    httpMock.verify();
  });

  it('sincronizarTrazabilidad propaga el body como número, no string', () => {
    repo.sincronizarTrazabilidad(123).subscribe();
    const req = httpMock.expectOne('/api/sync/siigo/trazabilidad');
    expect(req.request.body).toEqual({ nit_cliente: 123 });
    req.flush({ success: true, registros: 0 });
  });

  it('getBreadcrumbContext(nit) hace GET /api/empresas/:nit y retorna ClienteBreadcrumbContext con tipo_siigo', () => {
    const mockContext = {
      nit: 900123456,
      nombre_empresa: 'Empresa Demo SAS',
      firma_id: '11111111-1111-1111-1111-111111111111',
      firma_nombre: 'Firma Contable',
      tipo_siigo: 'contador' as const,
    };

    repo.getBreadcrumbContext(900123456).subscribe((res) => {
      expect(res).toEqual(mockContext);
      expect(res.tipo_siigo).toBe('contador');
    });

    const req = httpMock.expectOne('/api/empresas/900123456');
    expect(req.request.method).toBe('GET');
    req.flush(mockContext);
    httpMock.verify();
  });
});
