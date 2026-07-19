import { describe, it, expect, beforeEach, fail } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FirmaRepository } from './firma.repository';
import type { Firma } from './firma.repository';
import type { CrearEmpresaInput } from '@app/shared/crear-empresa-dialog/crear-empresa.schema';

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

  describe('create() — POST /api/firmas', () => {
    const validInput: CrearEmpresaInput = {
      tipo_persona: 'juridica',
      nombre: 'Empresa Demo SAC',
      nit: 900123456,
      tipo_id_rep_legal: 'cedula',
      id_rep_legal: 12345678,
      tipo_siigo: 'nube',
      firma_user: 'demo@empresa.com',
      firma_pass: 'secreto-123',
    };

    it('hace POST /api/firmas con el body del formulario', () => {
      const mockCreated: Firma = {
        id: 'firma-new',
        firma_user: 'demo@empresa.com',
        tipo_siigo: 'nube',
        nit: 900123456,
        last_token: null,
        tipo_persona: 'juridica',
        nombre: 'Empresa Demo SAC',
        activo: true,
        usuario_id: 'user-1',
        created_at: '2026-07-18T00:00:00Z',
      };

      let received: Firma | null = null;
      repo.create(validInput).subscribe((firma) => {
        received = firma;
      });

      const req = httpMock.expectOne('/api/firmas');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(validInput);
      req.flush(mockCreated);

      expect(received).toEqual(mockCreated);
      // firma_pass NUNCA en la respuesta
      expect(received?.firma_pass).toBeUndefined();
      httpMock.verify();
    });

    it('propaga errores HTTP (ej. 400 validation)', () => {
      let errorCaught = false;
      repo.create(validInput).subscribe({
        next: () => fail('se esperaba error'),
        error: () => { errorCaught = true; },
      });

      const req = httpMock.expectOne('/api/firmas');
      expect(req.request.method).toBe('POST');
      req.flush(
        { error: 'VALIDATION_FAILED', message: 'Invalid request body' },
        { status: 400, statusText: 'Bad Request' }
      );

      expect(errorCaught).toBe(true);
      httpMock.verify();
    });
  });
});
