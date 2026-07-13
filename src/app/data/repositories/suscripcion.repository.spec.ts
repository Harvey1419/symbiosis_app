import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SuscripcionRepository } from './suscripcion.repository';
import type { SuscripcionMe, UsageRow, Plan } from '@domain/models/suscripcion.model';

describe('SuscripcionRepository', () => {
  let repo: SuscripcionRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(SuscripcionRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('getMe() hace GET /api/suscripciones/me', () => {
    const mock: SuscripcionMe = {
      plan: { codigo: 'trial', nombre: 'Trial', limite_facturas_mes: 200 },
      estado: 'trialing',
      periodo_actual: '2026-07-01',
      used: 50,
      limite: 200,
      fecha_inicio: '',
      fecha_fin: '',
    };

    let received: SuscripcionMe | undefined;
    repo.getMe().subscribe((res) => {
      received = res;
    });

    const req = httpMock.expectOne('/api/suscripciones/me');
    expect(req.request.method).toBe('GET');
    req.flush(mock);

    expect(received).toEqual(mock);
    httpMock.verify();
  });

  it('getUsage() hace GET /api/suscripciones/usage con param months', () => {
    const mock: UsageRow[] = [{ periodo: '2026-07-01', used: 50, limite: 200 }];

    let received: UsageRow[] = [];
    repo.getUsage(3).subscribe((res) => {
      received = res;
    });

    const req = httpMock.expectOne(
      (r) => r.url === '/api/suscripciones/usage' && r.params.get('months') === '3',
    );
    expect(req.request.method).toBe('GET');
    req.flush(mock);

    expect(received).toEqual(mock);
    httpMock.verify();
  });

  it('getUsage() usa months=6 por defecto', () => {
    repo.getUsage().subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === '/api/suscripciones/usage' && r.params.get('months') === '6',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
    httpMock.verify();
  });

  it('getPlanes() hace GET /api/planes (publico, sin auth)', () => {
    const mock: Plan[] = [
      {
        codigo: 'inicio',
        nombre: 'Inicio',
        limite_facturas_mes: 400,
        precio_mensual_cop: 380000,
        soporte_nivel: 'basico_48h',
      },
    ];

    let received: Plan[] = [];
    repo.getPlanes().subscribe((res) => {
      received = res;
    });

    const req = httpMock.expectOne('/api/planes');
    expect(req.request.method).toBe('GET');
    req.flush(mock);

    expect(received).toEqual(mock);
    httpMock.verify();
  });
});
