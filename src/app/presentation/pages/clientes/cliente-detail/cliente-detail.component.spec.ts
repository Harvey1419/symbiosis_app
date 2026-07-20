import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { ClienteDetailComponent } from './cliente-detail.component';
import { FacturaRepository } from '@data/repositories/factura.repository';

import { provideRouter } from '@angular/router';

describe('ClienteDetailComponent - Dual Hierarchy Breadcrumb', () => {
  let component: ClienteDetailComponent;
  let fixture: ComponentFixture<ClienteDetailComponent>;
  let mockActivatedRoute: any;
  let mockFacturaRepo: any;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === 'nit' ? '900123456' : null),
        },
        data: {},
      },
    };

    mockFacturaRepo = {
      getFacturas: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [ClienteDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: FacturaRepository, useValue: mockFacturaRepo },
      ],
    }).compileComponents();
  });

  it('renders 3-level breadcrumb when tipo_siigo is contador', () => {
    mockActivatedRoute.snapshot.data = {
      clienteContext: {
        nombre_empresa: 'Cliente Beta',
        firma_id: 'firma-123',
        firma_nombre: 'Firma Alpha',
        tipo_siigo: 'contador',
      },
    };

    fixture = TestBed.createComponent(ClienteDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const items = component.breadcrumbItems();
    expect(items.length).toBe(3);
    expect(items[0].label).toBe('Firmas');
    expect(items[1].label).toBe('Firma Alpha');
    expect(items[1].routerLink).toEqual(['/clientes/firma', 'firma-123']);
    expect(items[2].label).toBe('Cliente Beta');
  });

  it('renders 2-level breadcrumb when tipo_siigo is nube', () => {
    mockActivatedRoute.snapshot.data = {
      clienteContext: {
        nombre_empresa: 'Empresa Nube Gamma',
        firma_id: 'firma-456',
        firma_nombre: 'Firma Nube',
        tipo_siigo: 'nube',
      },
    };

    fixture = TestBed.createComponent(ClienteDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const items = component.breadcrumbItems();
    expect(items.length).toBe(2);
    expect(items[0].label).toBe('Firmas');
    expect(items[1].label).toBe('Empresa Nube Gamma');
  });
});
