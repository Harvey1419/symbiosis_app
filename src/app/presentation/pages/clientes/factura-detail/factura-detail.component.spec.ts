import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FacturaDetailComponent } from './factura-detail.component';
import { FacturaRepository } from '@data/repositories/factura.repository';
import { PucRepository } from '@data/repositories/puc.repository';
import { ImpuestosRepository } from '@data/repositories/impuestos.repository';
import { ConfirmService } from '@app/shared';
import { FilaFactura } from '@domain/models/factura.model';

interface SetupOptions {
  filas: FilaFactura[];
}

describe('FacturaDetailComponent — Confianza semáforo column', () => {
  let component: FacturaDetailComponent;
  let fixture: ComponentFixture<FacturaDetailComponent>;
  let mockFacturaRepo: any;

  async function configure(options: SetupOptions): Promise<void> {
    TestBed.resetTestingModule();
    const mockActivatedRoute = {
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
      getById: vi.fn().mockReturnValue(
        of({
          id: 'fac-789',
          status: 'pendiente',
          factura_nro: 'SETT-101',
          filas: options.filas,
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [FacturaDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideAnimations(),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: FacturaRepository, useValue: mockFacturaRepo },
        {
          provide: PucRepository,
          useValue: { getCuentaPuc: vi.fn().mockReturnValue(of([])) },
        },
        {
          provide: ImpuestosRepository,
          useValue: { getImpuestosByNit: vi.fn().mockReturnValue(of([])) },
        },
        {
          provide: ConfirmService,
          useValue: { confirm: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FacturaDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function indicators(): NodeListOf<HTMLElement> {
    return fixture.nativeElement.querySelectorAll('[data-testid="confianza-indicator"]');
  }

  it('renders the Confianza column header for the items table', async () => {
    await configure({
      filas: [
        { descripcion: 'Item A', debito: 100, confianza: 90 },
        { descripcion: 'Item B', debito: 50, confianza: 30 },
      ],
    });

    const headers = Array.from(fixture.nativeElement.querySelectorAll('th')).map(
      (th: HTMLElement) => th.textContent?.trim() ?? '',
    );
    expect(headers).toContain('Confianza');
  });

  it('renders the high level for confianza 90 with accessible label', async () => {
    await configure({
      filas: [{ descripcion: 'Item A', debito: 100, confianza: 90 }],
    });

    const cells = indicators();
    expect(cells.length).toBe(1);
    expect(cells[0].getAttribute('aria-level')).toBe('high');
    expect(cells[0].getAttribute('aria-label')).toBe('Confianza alta: 90');
    expect(cells[0].textContent?.trim()).toBe('90');
  });

  it('renders the medium level for confianza 70', async () => {
    await configure({
      filas: [{ descripcion: 'Item B', debito: 50, confianza: 70 }],
    });

    const cells = indicators();
    expect(cells.length).toBe(1);
    expect(cells[0].getAttribute('aria-level')).toBe('medium');
    expect(cells[0].getAttribute('aria-label')).toBe('Confianza media: 70');
  });

  it('renders the low level for confianza 50', async () => {
    await configure({
      filas: [{ descripcion: 'Item C', debito: 25, confianza: 50 }],
    });

    const cells = indicators();
    expect(cells.length).toBe(1);
    expect(cells[0].getAttribute('aria-level')).toBe('low');
    expect(cells[0].getAttribute('aria-label')).toBe('Confianza baja: 50');
  });

  it('renders nothing in the confianza cell when the row has no confianza', async () => {
    await configure({
      filas: [{ descripcion: 'Item D', debito: 25 /* confianza undefined */ }],
    });

    expect(indicators().length).toBe(0);
  });

  it('renders mixed confianza levels across rows (90, 70, 50, null) without regression', async () => {
    await configure({
      filas: [
        { descripcion: 'Item A', debito: 100, confianza: 90 },
        { descripcion: 'Item B', debito: 50, confianza: 70 },
        { descripcion: 'Item C', debito: 25, confianza: 50 },
        { descripcion: 'Item D', debito: 25 },
      ],
    });

    const cells = indicators();
    expect(cells.length).toBe(3);
    expect(cells[0].getAttribute('aria-level')).toBe('high');
    expect(cells[0].getAttribute('aria-label')).toBe('Confianza alta: 90');
    expect(cells[1].getAttribute('aria-level')).toBe('medium');
    expect(cells[1].getAttribute('aria-label')).toBe('Confianza media: 70');
    expect(cells[2].getAttribute('aria-level')).toBe('low');
    expect(cells[2].getAttribute('aria-label')).toBe('Confianza baja: 50');

    // The null-confidence row should still render its descripcion — regression guard.
    const descriptions = Array.from(fixture.nativeElement.querySelectorAll('.fila-desc')).map(
      (el: HTMLElement) => el.textContent?.trim() ?? '',
    );
    expect(descriptions).toEqual(['Item A', 'Item B', 'Item C', 'Item D']);
  });
});

describe('FacturaDetailComponent - Dual Hierarchy Breadcrumb (regression)', () => {
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
        provideHttpClient(),
        provideAnimations(),
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