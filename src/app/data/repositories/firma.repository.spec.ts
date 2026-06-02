import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FirmaRepository } from './firma.repository';
import type { Firma } from './firma.repository';

describe('FirmaRepository', () => {
  let repo: FirmaRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(FirmaRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('getFirmas() hace GET /api/firmas', () => {
    const mockFirmas: Firma[] = [
      {
        id: 'f-1',
        firma_user: 'a@b.com',
        tipo_siigo: 'contador',
        nit: 900123456,
        last_token: null,
      },
      {
        id: 'f-2',
        firma_user: 'c@d.com',
        tipo_siigo: 'nube',
        nit: 800987654,
        last_token: 'cached',
      },
    ];

    let received: Firma[] = [];
    repo.getFirmas().subscribe((firmas) => {
      received = firmas;
    });

    const req = httpMock.expectOne('/api/firmas');
    expect(req.request.method).toBe('GET');
    req.flush(mockFirmas);

    expect(received).toEqual(mockFirmas);
    expect(received).toHaveLength(2);
    httpMock.verify();
  });

  it('getFirmaClientes(id) hace GET /api/firmas/:id/clientes', () => {
    const firmaId = 'firma-uuid-1';
    const mockClientes = [
      { nit: 111, nombre_empresa: 'Cliente 1', tipo_siigo: 'nube' as const },
      { nit: 222, nombre_empresa: 'Cliente 2', tipo_siigo: 'nube' as const },
    ];

    let received: typeof mockClientes = [];
    repo.getFirmaClientes(firmaId).subscribe((clientes) => {
      received = clientes;
    });

    const req = httpMock.expectOne(`/api/firmas/${firmaId}/clientes`);
    expect(req.request.method).toBe('GET');
    expect(req.request.url).toBe(`/api/firmas/${firmaId}/clientes`);
    req.flush(mockClientes);

    expect(received).toEqual(mockClientes);
    httpMock.verify();
  });
});
