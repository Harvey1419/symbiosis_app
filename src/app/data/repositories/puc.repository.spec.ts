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

  /**
   * Acceptance criteria from spec rev 3 §3 (Capability 1) and design §2:
   *   - HttpParams contains `5` or `1,2` exactly
   *   - Existing unfiltered repository behavior remains compatible
   *   - One request per call
   */
  describe('getCuentasByGroups (T5.3)', () => {
    it('sends ?groups=5 for expense (single group) options', () => {
      const nit = 900123456;
      const cuentas: CuentaPuc[] = [
        { account_code: '51050301', account_name: 'Salario integral', account_group: '51', active: true },
      ];

      repo.getCuentasByGroups(nit, [5]).subscribe((res) => {
        expect(res.length).toBe(1);
        expect(res[0].account_code).toBe('51050301');
      });

      const req = httpMock.expectOne(`/api/clientes-puc/${nit}?groups=5`);
      expect(req.request.method).toBe('GET');
      req.flush(cuentas);
      httpMock.verify();
    });

    it('sends ?groups=1,2 for payment options (literal comma, single param)', () => {
      const nit = 900123456;
      const cuentas: CuentaPuc[] = [
        { account_code: '11050501', account_name: 'Caja general', account_group: '11', active: true },
        { account_code: '22050501', account_name: 'Proveedores nacionales', account_group: '22', active: true },
      ];

      repo.getCuentasByGroups(nit, [1, 2]).subscribe((res) => {
        expect(res.length).toBe(2);
      });

      // Angular's HttpParams in v21 does NOT percent-encode the comma, so
      // the wire URL keeps the literal `,2` suffix. The backend's
      // PucQuerySchema accepts both raw `,` and `%2C`, so the test pins
      // the actual format Angular emits.
      const req = httpMock.expectOne(`/api/clientes-puc/${nit}?groups=1,2`);
      expect(req.request.method).toBe('GET');
      // Belt-and-suspenders: also check the param object directly.
      expect(req.request.params.get('groups')).toBe('1,2');
      expect(req.request.params.getAll('groups')?.length).toBe(1);
      req.flush(cuentas);
      httpMock.verify();
    });

    it('emits exactly one HTTP request per call (no duplicate fan-out)', () => {
      const nit = 900123456;

      repo.getCuentasByGroups(nit, [1, 2]).subscribe();
      repo.getCuentasByGroups(nit, [5]).subscribe();

      // match() does a full URL match by default, so we use a function
      // matcher that captures both call sites.
      const requests = httpMock.match((req) =>
        req.url === `/api/clientes-puc/${nit}` && req.params.has('groups'),
      );
      expect(requests.length).toBe(2);
      const groupsValues = requests.map((r) => r.request.params.get('groups')).sort();
      expect(groupsValues).toEqual(['1,2', '5']);

      requests.forEach((r) => r.flush([]));
      httpMock.verify();
    });

    it('preserves the unfiltered repository path (getCuentaPuc) — no regression', () => {
      const nit = 900123456;
      const cuentas: CuentaPuc[] = [
        { account_code: '1105', account_name: 'Caja', account_group: '11', active: true },
      ];

      repo.getCuentaPuc(nit).subscribe();
      const req = httpMock.expectOne(`/api/clientes-puc/${nit}`);
      // No `groups` param on the unfiltered path — backward-compat.
      expect(req.request.params.has('groups')).toBe(false);
      req.flush(cuentas);
      httpMock.verify();
    });
  });
});
