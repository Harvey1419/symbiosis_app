import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PucRepository } from './puc.repository';
import { CuentaPuc } from '@domain/models/puc.model';

describe('PucRepository', () => {
  let repo: PucRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(PucRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('getCuentaPuc(nit) hace GET /api/clientes-puc/:nit', () => {
    const nit = 900123456;
    const cuentas: CuentaPuc[] = [
      { account_code: '1105', account_name: 'Caja', account_group: '11', active: true },
      { account_code: '1110', account_name: 'Bancos', account_group: '11', active: true },
    ];
    repo.getCuentaPuc(nit).subscribe((res) => {
      expect(res.length).toBe(2);
      expect(res[0].account_code).toBe('1105');
    });
    const req = httpMock.expectOne(`/api/clientes-puc/${nit}`);
    expect(req.request.method).toBe('GET');
    req.flush(cuentas);
    httpMock.verify();
  });
});
