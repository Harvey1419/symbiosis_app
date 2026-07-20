import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { FacturaDetailComponent } from './factura-detail.component';
import { FacturaRepository } from '@data/repositories/factura.repository';
import { PucRepository } from '@data/repositories/puc.repository';
import { ImpuestosRepository } from '@data/repositories/impuestos.repository';
import { ConfirmService } from '@app/shared';

import { provideRouter } from '@angular/router';

describe('FacturaDetailComponent - Dual Hierarchy Breadcrumb', () => {
  let component: FacturaDetailComponent;
  let fixture: ComponentFixture<FacturaDetailComponent>;
  let mockActivatedRoute: any;
  let mockFacturaRepo: any;
  let mockPucRepo: any;
  let mockImpuestosRepo: any;
  let mockConfirmService: any;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: (key: string) => {
            if (key === 'nit') return '900123456';
            if (key === 'id') return 'fac-789';
            return null;
          },
        },
        data: {},
      },
    };

    mockFacturaRepo = {
      getById: vi.fn().mockReturnValue(of({ id: 'fac-789', status: 'pendiente', factura_nro: 'SETT-101', filas: [] })),
    };

    mockPucRepo = {
      getCuentaPuc: vi.fn().mockReturnValue(of([])),
    };

    mockImpuestosRepo = {
      getImpuestosByNit: vi.fn().mockReturnValue(of([])),
    };

    mockConfirmService = {
      confirm: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [FacturaDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: FacturaRepository, useValue: mockFacturaRepo },
        { provide: PucRepository, useValue: mockPucRepo },
        { provide: ImpuestosRepository, useValue: mockImpuestosRepo },
        { provide: ConfirmService, useValue: mockConfirmService },
      ],
    }).compileComponents();
  });

  it('renders 4 segments (3-level + invoice) when tipo_siigo is contador', () => {
    mockActivatedRoute.snapshot.data = {
      clienteContext: {
        nombre_empresa: 'Cliente Beta',
        firma_id: 'firma-123',
        firma_nombre: 'Firma Alpha',
        tipo_siigo: 'contador',
      },
    };

    fixture = TestBed.createComponent(FacturaDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const items = component.breadcrumbItems();
    expect(items.length).toBe(4);
    expect(items[0].label).toBe('Firmas');
    expect(items[1].label).toBe('Firma Alpha');
    expect(items[2].label).toBe('Cliente Beta');
    expect(items[3].label).toBe('SETT-101');
  });

  it('renders 3 segments (2-level + invoice) when tipo_siigo is nube', () => {
    mockActivatedRoute.snapshot.data = {
      clienteContext: {
        nombre_empresa: 'Empresa Nube Gamma',
        firma_id: 'firma-456',
        firma_nombre: 'Firma Nube',
        tipo_siigo: 'nube',
      },
    };

    fixture = TestBed.createComponent(FacturaDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const items = component.breadcrumbItems();
    expect(items.length).toBe(3);
    expect(items[0].label).toBe('Firmas');
    expect(items[1].label).toBe('Empresa Nube Gamma');
    expect(items[2].label).toBe('SETT-101');
  });
});
