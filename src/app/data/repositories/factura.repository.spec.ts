import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
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
});
