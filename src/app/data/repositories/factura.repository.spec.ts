import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FacturaRepository } from './factura.repository';
import { Factura, HistoricoRow } from '@domain/models/factura.model';

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

  it('getHistorico(id) hace GET /api/facturas/:id/historico y retorna HistoricoRow[]', () => {
    const rows: HistoricoRow[] = [
      {
        id: 'h1', client_nit: '900', vendor_nit: 'v1', vendor_name: 'Vendor 1',
        fecha: '2026-06-01', item_text: 'Compra', item_value: 1000,
        account_code: '2205', account_name: 'Proveedores',
        iva_code: null, iva_pct: null, rete_code: null, rete_pct: null,
        has_tax: false, created_at: '2026-06-01T00:00:00Z',
      },
      {
        id: 'h2', client_nit: '900', vendor_nit: 'v1', vendor_name: 'Vendor 1',
        fecha: '2026-06-02', item_text: 'Otra', item_value: 2000,
        account_code: '1105', account_name: 'Caja',
        iva_code: '01', iva_pct: 19, rete_code: null, rete_pct: null,
        has_tax: true, created_at: '2026-06-02T00:00:00Z',
      },
    ];
    repo.getHistorico('abc-123').subscribe((res) => {
      expect(res.length).toBe(2);
      expect(res[0].account_code).toBe('2205');
    });
    const req = httpMock.expectOne('/api/facturas/abc-123/historico');
    expect(req.request.method).toBe('GET');
    req.flush(rows);
    httpMock.verify();
  });
});
