import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ImpuestosRepository } from './impuestos.repository';
import { environment } from '../../../environments/environment';

describe('ImpuestosRepository', () => {
  let repo: ImpuestosRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ImpuestosRepository, provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(ImpuestosRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getImpuestosByNit hits /clientes-impuestos/:nit', (done) => {
    const mock = [{ id: '1', client_nit: 123, tax_id: 1, tipo: 'IVA', codigo: '01', description: 'IVA 19%', percentage: 19, type: 'IVA', purchase_account_code: '2408', purchase_account_name: 'IVA', active: true }];
    repo.getImpuestosByNit(123).subscribe((res) => {
      expect(res).toEqual(mock);
      done();
    });
    const req = httpMock.expectOne(`${environment.apiUrl}/clientes-impuestos/123`);
    expect(req.request.method).toBe('GET');
    req.flush(mock);
  });
});