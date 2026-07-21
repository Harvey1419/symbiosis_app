import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, HttpResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FacturaRepository } from './factura.repository';
import { Factura } from '@domain/models/factura.model';

const mockFactura: Factura = {
  id: 'abc-123',
  client_nit: 900123456,
  track_id: 'track-1',
  filas: [],
  status: 'pendiente',
  created_at: '2026-01-01T00:00:00Z',
};

describe('FacturaRepository', () => {
  let repo: FacturaRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(FacturaRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('getById(id) hace GET /api/facturas/item/:id', () => {
    repo.getById('abc-123').subscribe((res) => {
      expect(res.id).toBe('abc-123');
    });
    const req = httpMock.expectOne('/api/facturas/item/abc-123');
    expect(req.request.method).toBe('GET');
    req.flush(mockFactura);
    httpMock.verify();
  });

  it('updateItem(id, idx, body) hace PATCH /api/facturas/:id/items/:idx con el body', () => {
    const body = { cuenta: '11050501', iva_code: null, rete_code: null };
    repo.updateItem('abc-123', 2, body).subscribe((res) => {
      expect(res.status).toBe('pendiente');
    });
    const req = httpMock.expectOne('/api/facturas/abc-123/items/2');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(body);
    req.flush(mockFactura);
    httpMock.verify();
  });

  it('causar(id) hace POST /api/facturas/:id/causar con body vacio', () => {
    repo.causar('abc-123').subscribe((res) => {
      expect(res.status).toBe('causada');
    });
    const req = httpMock.expectOne('/api/facturas/abc-123/causar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ ...mockFactura, status: 'causada' });
    httpMock.verify();
  });

  it('finalizar(id) hace POST /api/facturas/:id/finalizar con body vacio', () => {
    repo.finalizar('abc-123').subscribe((res) => {
      expect(res.status).toBe('finalizada');
    });
    const req = httpMock.expectOne('/api/facturas/abc-123/finalizar');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ ...mockFactura, status: 'finalizada' });
    httpMock.verify();
  });

  it('reabrir(id, target) hace POST /api/facturas/:id/reabrir con { target }', () => {
    repo.reabrir('abc-123', 'pendiente').subscribe((res) => {
      expect(res.status).toBe('pendiente');
    });
    const req = httpMock.expectOne('/api/facturas/abc-123/reabrir');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ target: 'pendiente' });
    req.flush({ ...mockFactura, status: 'pendiente' });
    httpMock.verify();
  });

  describe('exportSelection(nit, facturaIds)', () => {
    it('hace POST a /api/excel/export-selection con NIT convertido a string y conserva el orden de los ids', () => {
      const ids = ['f-3', 'f-1', 'f-2'];
      repo.exportSelection(900123456, ids).subscribe();

      const req = httpMock.expectOne('/api/excel/export-selection');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ nit: '900123456', facturaIds: ['f-3', 'f-1', 'f-2'] });
      req.flush(new Blob(['xlsx-bytes'], { type: 'application/octet-stream' }));
      httpMock.verify();
    });

    it('pide observe=response y responseType=blob para que llegue el HttpResponse<Blob> completo', () => {
      repo.exportSelection(900123456, ['f-1']).subscribe();

      const req = httpMock.expectOne('/api/excel/export-selection');
      expect(req.request.responseType).toBe('blob');

      // Para confirmar observe=response, el subscriber debe recibir un HttpResponse
      // con headers/body/status, no un Blob pelado.
      let received: HttpResponse<Blob> | undefined;
      repo.exportSelection(900123456, ['f-1']).subscribe((res) => {
        received = res;
      });

      const secondReq = httpMock.expectOne('/api/excel/export-selection');
      const body = new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      secondReq.flush(body, {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Disposition': 'attachment; filename="seleccion-900123456-1-facturas-1700000000.xlsx"',
          'X-Export-Causables': '1',
          'X-Export-Skipped': '0',
        },
      });

      expect(received).toBeInstanceOf(HttpResponse);
      expect(received!.status).toBe(200);
      expect(received!.body).toBeInstanceOf(Blob);
      expect(received!.headers.get('Content-Disposition')).toContain('seleccion-900123456');
      expect(received!.headers.get('X-Export-Causables')).toBe('1');
      expect(received!.headers.get('X-Export-Skipped')).toBe('0');

      req.flush(new Blob());
      httpMock.verify();
    });

    it('preserva exactamente el array facturaIds que recibió (incluyendo duplicados y vacíos)', () => {
      // La validación de duplicados la hace el backend (Zod refine). El repo
      // solo transporta lo que recibe — el caller es responsable del shape.
      const ids: string[] = ['f-a', 'f-b', 'f-a'];
      repo.exportSelection(1, ids).subscribe();

      const req = httpMock.expectOne('/api/excel/export-selection');
      expect(req.request.body).toEqual({ nit: '1', facturaIds: ['f-a', 'f-b', 'f-a'] });
      req.flush(new Blob());
      httpMock.verify();
    });

    it('omite el campo nit del body cuando se pasa undefined (caso contador)', () => {
      repo.exportSelection(undefined, ['f-1', 'f-2']).subscribe();

      const req = httpMock.expectOne('/api/excel/export-selection');
      expect(req.request.body).toEqual({ facturaIds: ['f-1', 'f-2'] });
      expect((req.request.body as Record<string, unknown>).nit).toBeUndefined();
      req.flush(new Blob());
      httpMock.verify();
    });

    it('propaga el Blob de error 4xx al subscriber como HttpErrorResponse sin transformar el cuerpo', () => {
      let error: HttpErrorResponse | undefined;
      repo.exportSelection(900123456, ['f-1']).subscribe({
        next: () => {
          throw new Error('no debería pasar por next en un 422');
        },
        error: (e) => {
          error = e;
        },
      });

      const req = httpMock.expectOne('/api/excel/export-selection');
      // El backend responde 422 con un Blob (application/json) en .error —
      // el repository NO debe parsearlo: el caller decide qué hacer.
      const errorBlob = new Blob(['{"code":"NO_HAY_CAUSABLES"}'], { type: 'application/json' });
      req.flush(errorBlob, {
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: { 'X-Export-Causables': '0', 'X-Export-Skipped': '0' },
      });

      expect(error).toBeInstanceOf(HttpErrorResponse);
      expect(error!.status).toBe(422);
      expect(error!.error).toBeInstanceOf(Blob);
      httpMock.verify();
    });

    it('no emite ninguna request inesperada', () => {
      repo.exportSelection(900123456, ['f-1']).subscribe();
      // Solo debe haber UNA request hacia /api/excel/export-selection.
      const req = httpMock.expectOne('/api/excel/export-selection');
      req.flush(new Blob());
      // verify() lanza si hay requests pendientes o inesperadas.
      httpMock.verify();
    });
  });
});
