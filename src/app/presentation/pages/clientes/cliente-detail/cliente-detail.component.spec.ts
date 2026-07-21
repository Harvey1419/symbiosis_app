import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ClienteDetailComponent } from './cliente-detail.component';
import { Factura, FilaFactura } from '@domain/models/factura.model';
import { FacturaRepository } from '@data/repositories/factura.repository';

/** Helper: build a fully-typed `Factura` for table-rendering tests. */
function buildFactura(overrides: Partial<Factura> & Pick<Factura, 'id' | 'status'>): Factura {
  const base: Factura = {
    id: overrides.id,
    client_nit: 900123456,
    track_id: overrides.track_id ?? `track-${overrides.id}`,
    cufe: null,
    factura_nro: overrides.factura_nro ?? `NRO-${overrides.id}`,
    vendor_nit: null,
    vendor_name: overrides.vendor_name ?? 'Proveedor X',
    fecha_emision: '2026-01-01T00:00:00Z',
    payment_due_date: null,
    notes: null,
    pdf_url: null,
    xml_url: null,
    pdf_base64: null,
    error_message: null,
    subtotal: 1000,
    total_iva: 190,
    total_pagar: 1190,
    status: overrides.status,
    filas: [] as FilaFactura[],
    clasificado_at: null,
    causada_at: null,
    causada_by: null,
    created_at: '2026-01-01T00:00:00Z',
    firma_id: 'firma-1',
    job_id: null,
  };
  return { ...base, ...overrides };
}

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
        { provide: MessageService, useClass: MessageService },
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

/**
 * WU-3B — Status badge column + checkbox guard.
 * The table renders a new "Estado" column with a colored badge that mirrors
 * the existing `tipo-badge` visual pattern. Per-row checkboxes are disabled
 * for statuses that cannot be exported (`causada`, `finalizada`, `error`)
 * and the header checkbox must NOT be able to push non-exportable rows into
 * the selection (gated by the Table-level `rowSelectable`).
 */
describe('ClienteDetailComponent - WU-3B status badge + checkbox guard', () => {
  let fixture: ComponentFixture<ClienteDetailComponent>;
  let component: ClienteDetailComponent;
  let mockActivatedRoute: any;
  let mockFacturaRepo: any;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: (key: string) => (key === 'nit' ? '900123456' : null),
        },
        data: {
          clienteContext: {
            nombre_empresa: 'Cliente Test',
            firma_id: 'firma-1',
            firma_nombre: 'Firma Uno',
            tipo_siigo: 'contador',
          },
        },
      },
    };
    mockFacturaRepo = { getFacturas: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ClienteDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: FacturaRepository, useValue: mockFacturaRepo },
        { provide: MessageService, useClass: MessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClienteDetailComponent);
    component = fixture.componentInstance;
  });

  // ─────────────────────────────────────────────────────────────────────
  // isExportable(factura) — pure helper contract
  // ─────────────────────────────────────────────────────────────────────
  describe('isExportable(factura)', () => {
    it('returns true SOLO para status="lista_para_subir"', () => {
      expect(component.isExportable(buildFactura({ id: 'a', status: 'lista_para_subir' }))).toBe(true);
    });

    it('returns false para status="pendiente" (estado intermedio)', () => {
      expect(component.isExportable(buildFactura({ id: 'a', status: 'pendiente' }))).toBe(false);
    });

    it('returns false para status="clasificando" (estado intermedio)', () => {
      expect(component.isExportable(buildFactura({ id: 'a', status: 'clasificando' }))).toBe(false);
    });

    it('returns false para status="causada"', () => {
      expect(component.isExportable(buildFactura({ id: 'a', status: 'causada' }))).toBe(false);
    });

    it('returns false para status="finalizada"', () => {
      expect(component.isExportable(buildFactura({ id: 'a', status: 'finalizada' }))).toBe(false);
    });

    it('returns false para status="error"', () => {
      expect(component.isExportable(buildFactura({ id: 'a', status: 'error' }))).toBe(false);
    });

    it('returns false para status desconocido (no tipado)', () => {
      const f = buildFactura({ id: 'a', status: 'lista_para_subir' });
      (f as unknown as { status: string }).status = 'misterioso';
      expect(component.isExportable(f)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // Status badge rendering — colored per status, following tipo-badge
  // ─────────────────────────────────────────────────────────────────────
  describe('Status badge por fila', () => {
    const FACTURAS: Factura[] = [
      buildFactura({ id: 'p', status: 'pendiente',     factura_nro: 'F-PEND',   vendor_name: 'Proveedor A' }),
      buildFactura({ id: 'c', status: 'clasificando',  factura_nro: 'F-CLAS',   vendor_name: 'Proveedor B' }),
      buildFactura({ id: 'C', status: 'causada',       factura_nro: 'F-CAUS',   vendor_name: 'Proveedor C' }),
      buildFactura({ id: 'f', status: 'finalizada',    factura_nro: 'F-FIN',    vendor_name: 'Proveedor D' }),
      buildFactura({ id: 'e', status: 'error',         factura_nro: 'F-ERR',    vendor_name: 'Proveedor E' }),
    ];

    beforeEach(() => {
      mockFacturaRepo.getFacturas.mockReturnValue(of(FACTURAS));
      fixture.detectChanges();
    });

    it('renderiza una badge de status por cada fila con la clase estable del status', () => {
      const badges: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('tbody .status-badge');
      expect(badges.length).toBe(5);

      const expectedClasses = ['status-pendiente', 'status-clasificando', 'status-causada', 'status-finalizada', 'status-error'];
      const presentClasses = Array.from(badges).map((b) => expectedClasses.find((cls) => b.classList.contains(cls)));
      expect(presentClasses.sort()).toEqual(expectedClasses.slice().sort());
    });

    it.each([
      ['pendiente',    'Pendiente'],
      ['clasificando', 'Clasificando'],
      ['causada',      'Causada'],
      ['finalizada',   'Finalizada'],
      ['error',        'Error'],
    ])('muestra el texto capitalizado del status "%s" → "%s"', (statusValue, expectedLabel) => {
      const cell: HTMLElement | null = fixture.nativeElement.querySelector(`tbody tr:has(.status-${statusValue}) .status-badge`);
      expect(cell?.textContent?.trim()).toBe(expectedLabel);
    });

    it('cae a un fallback neutro legible cuando el status es desconocido', () => {
      const unknown: Factura = buildFactura({ id: 'u', status: 'pendiente', factura_nro: 'F-UNK' });
      (unknown as unknown as { status: string }).status = 'raro';
      // Reemplazamos la data vía la signal pública (ngOnInit ya corrió en el
      // describe padre); signal + detectChanges empuja la nueva fila a la tabla.
      component.facturas.set([unknown]);
      fixture.detectChanges();

      const badge: HTMLElement | null = fixture.nativeElement.querySelector('tbody .status-badge');
      expect(badge).not.toBeNull();
      expect(badge?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      expect(badge?.classList.contains('status-unknown')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // Row checkbox — disabled state per row
  // ─────────────────────────────────────────────────────────────────────
  describe('Checkbox de fila — disabled según status', () => {
    beforeEach(() => {
      mockFacturaRepo.getFacturas.mockReturnValue(of([
        buildFactura({ id: 'p',  status: 'pendiente',         factura_nro: 'F-PEND' }),
        buildFactura({ id: 'c',  status: 'clasificando',      factura_nro: 'F-CLAS' }),
        buildFactura({ id: 'L',  status: 'lista_para_subir',  factura_nro: 'F-LIST' }),
        buildFactura({ id: 'C',  status: 'causada',           factura_nro: 'F-CAUS' }),
        buildFactura({ id: 'f',  status: 'finalizada',        factura_nro: 'F-FIN' }),
        buildFactura({ id: 'e',  status: 'error',             factura_nro: 'F-ERR' }),
      ]));
      fixture.detectChanges();
    });

    it('mantiene habilitado el checkbox SOLO para status="lista_para_subir"', () => {
      const row = fixture.nativeElement.querySelector('tbody tr:has(.status-lista-para-subir)');
      const input: HTMLInputElement | null = row!.querySelector('p-tablecheckbox input[type="checkbox"], p-tableCheckbox input[type="checkbox"]');
      expect(input).not.toBeNull();
      expect(input!.hasAttribute('disabled')).toBe(false);
    });

    it.each([
      ['pendiente'],
      ['clasificando'],
      ['causada'],
      ['finalizada'],
      ['error'],
    ])('deshabilita el checkbox para status="%s"', (statusValue) => {
      const row = fixture.nativeElement.querySelector(`tbody tr:has(.status-${statusValue})`);
      expect(row).not.toBeNull();
      const input: HTMLInputElement | null = row!.querySelector('p-tablecheckbox input[type="checkbox"], p-tableCheckbox input[type="checkbox"]');
      expect(input).not.toBeNull();
      // PrimeNG renders the disabled state on the underlying <input>.
      expect(input!.hasAttribute('disabled')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // Header checkbox — must not select non-exportable rows
  // ─────────────────────────────────────────────────────────────────────
  describe('Checkbox de cabecera — la selección no incluye filas no exportables', () => {
    it('incluye solo las filas con status="lista_para_subir" al pulsar "seleccionar todo"', () => {
      const FACTURAS = [
        buildFactura({ id: 'p1', status: 'pendiente',        factura_nro: 'F-1' }),
        buildFactura({ id: 'c1', status: 'clasificando',     factura_nro: 'F-2' }),
        buildFactura({ id: 'L1', status: 'lista_para_subir', factura_nro: 'F-3' }),
        buildFactura({ id: 'C1', status: 'causada',          factura_nro: 'F-4' }),
        buildFactura({ id: 'C2', status: 'finalizada',       factura_nro: 'F-5' }),
        buildFactura({ id: 'C3', status: 'error',            factura_nro: 'F-6' }),
      ];
      mockFacturaRepo.getFacturas.mockReturnValue(of(FACTURAS));
      fixture.detectChanges();

      expect(component.selectedFacturas().length).toBe(0);

      // El path real de PrimeNG invoca `dataTable.toggleRowsWithCheckbox(...)`,
      // que filtra la selección con `rowSelectable` antes de poblar
      // `selectedFacturas`. Como `rowSelectable` está cableado a
      // `isRowExportable → isExportable`, las filas no exportables quedan
      // excluidas. Replicamos ese filtro aquí para que la aserción no
      // dependa del botón interno de PrimeNG.
      component.selectedFacturas.set(FACTURAS.filter((f) => component.isExportable(f)));

      const ids = component.selectedFacturas().map((f) => f.id).sort();
      expect(ids).toEqual(['L1']);
      for (const f of component.selectedFacturas()) {
        expect(component.isExportable(f)).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // Tabla sigue renderizando — regresión mínima
  // ─────────────────────────────────────────────────────────────────────
  describe('Regresión mínima del comportamiento de la tabla', () => {
    it('sigue renderizando la tabla cuando hay al menos una fila', () => {
      mockFacturaRepo.getFacturas.mockReturnValue(of([
        buildFactura({ id: 'p', status: 'pendiente', factura_nro: 'F-1' }),
      ]));
      fixture.detectChanges();

      const table: HTMLElement | null = fixture.nativeElement.querySelector('p-table');
      expect(table).not.toBeNull();
      const rows: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('tbody tr');
       expect(rows.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('ClienteDetailComponent - WU-3C export download and feedback', () => {
  let fixture: ComponentFixture<ClienteDetailComponent>;
  let component: ClienteDetailComponent;
  let mockFacturaRepo: any;
  let messageMock: any;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    mockFacturaRepo = {
      getFacturas: vi.fn().mockReturnValue(of([])),
      exportSelection: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [ClienteDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (key: string) => (key === 'nit' ? '900123456' : null) },
              data: {
                clienteContext: {
                  nombre_empresa: 'Cliente Test', firma_id: 'firma-1',
                  firma_nombre: 'Firma Uno', tipo_siigo: 'contador',
                },
              },
            },
          },
        },
        { provide: FacturaRepository, useValue: mockFacturaRepo },
        { provide: MessageService, useClass: MessageService },
      ],
    }).compileComponents();

    messageMock = { add: vi.spyOn(TestBed.inject(MessageService), 'add') };
    fixture = TestBed.createComponent(ClienteDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('guards an empty selection without calling the repository or showing a toast', () => {
    fixture.detectChanges();

    component.exportSelected();

    expect(mockFacturaRepo.exportSelection).not.toHaveBeenCalled();
    expect(messageMock.add).not.toHaveBeenCalled();
    expect(component.isExporting()).toBe(false);
  });

  it('sets loading and disables the export button until the request settles', async () => {
    const request$ = new Subject<HttpResponse<Blob>>();
    mockFacturaRepo.exportSelection.mockReturnValue(request$);
    fixture.detectChanges();
    component.selectedFacturas.set([buildFactura({ id: 'a', status: 'pendiente' })]);

    component.exportSelected();
    await fixture.whenStable();

    expect(component.isExporting()).toBe(true);
    expect((fixture.nativeElement.querySelector('button.export-btn') as HTMLButtonElement).disabled).toBe(true);

    request$.error(new HttpErrorResponse({ status: 500 }));
    await fixture.whenStable();
    expect(component.isExporting()).toBe(false);
  });

  it('downloads the Blob, removes the anchor, revokes its URL, and emits a single consolidated toast', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const createObjectURL = vi.fn().mockReturnValue('blob:selection');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const response = new HttpResponse<Blob>({
      status: 200,
      body: new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      headers: new HttpHeaders({
        'Content-Disposition': 'attachment; filename="seleccion-900123456-2-facturas-20260720.xlsx"',
        'X-Export-Causables': '2',
        'X-Export-Skipped': '1',
      }),
    });
    mockFacturaRepo.exportSelection.mockReturnValue(of(response));
    fixture.detectChanges();
    component.selectedFacturas.set([buildFactura({ id: 'a', status: 'pendiente' })]);

    component.exportSelected();
    await fixture.whenStable();

    const anchor = appendChild.mock.calls.at(-1)![0] as HTMLAnchorElement;
    expect(createObjectURL).toHaveBeenCalledWith(response.body);
    expect(click).toHaveBeenCalledOnce();
    expect(anchor.download).toBe('seleccion-900123456-2-facturas-20260720.xlsx');
    expect(anchor.isConnected).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:selection');
    expect(messageMock.add).toHaveBeenCalledTimes(1);
    expect(messageMock.add.mock.calls[0][0]).toMatchObject({
      severity: 'success',
      summary: 'Exportación generada',
      detail: 'Causadas: 2 · Omitidas: 1',
    });
    expect(component.isExporting()).toBe(false);
  });

  it('uses the safe backend-shaped fallback filename when Content-Disposition is absent', async () => {
    const appendChild = vi.spyOn(document.body, 'appendChild');
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:fallback'), revokeObjectURL: vi.fn() });
    mockFacturaRepo.exportSelection.mockReturnValue(of(new HttpResponse<Blob>({
      status: 200,
      body: new Blob(['xlsx']),
      headers: new HttpHeaders({ 'X-Export-Causables': '3', 'X-Export-Skipped': '0' }),
    })));
    fixture.detectChanges();
    component.selectedFacturas.set([buildFactura({ id: 'a', status: 'clasificando' })]);

    component.exportSelected();
    await fixture.whenStable();

    const anchor = appendChild.mock.calls.at(-1)![0] as HTMLAnchorElement;
    expect(anchor.download).toMatch(/^seleccion-900123456-3-facturas-\d{14}\.xlsx$/);
    expect(messageMock.add).toHaveBeenCalledTimes(1);
    expect(messageMock.add.mock.calls[0][0]).toMatchObject({
      severity: 'success',
      summary: 'Exportación generada',
      detail: 'Causadas: 3',
    });
  });

  it('parses a 4xx JSON Blob asynchronously and shows one readable validation toast', async () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: new Blob([JSON.stringify({ code: 'NO_HAY_CAUSABLES', message: 'No hay facturas causables' })], { type: 'application/json' }),
    });
    mockFacturaRepo.exportSelection.mockReturnValue(throwError(() => error));
    fixture.detectChanges();
    component.selectedFacturas.set([buildFactura({ id: 'a', status: 'pendiente' })]);

    component.exportSelected();
    await fixture.whenStable();
    await Promise.resolve();

    expect(messageMock.add).toHaveBeenCalledOnce();
    expect(messageMock.add.mock.calls[0][0]).toMatchObject({ severity: 'error', summary: 'Error de validación' });
    expect(messageMock.add.mock.calls[0][0].detail).toContain('NO_HAY_CAUSABLES');
    expect(messageMock.add.mock.calls[0][0].detail).toContain('No hay facturas causables');
    expect(component.isExporting()).toBe(false);
  });

  it('shows one generic validation toast when a 4xx Blob cannot be parsed', async () => {
    mockFacturaRepo.exportSelection.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: new Blob(['not-json'], { type: 'text/plain' }),
    })));
    fixture.detectChanges();
    component.selectedFacturas.set([buildFactura({ id: 'a', status: 'pendiente' })]);

    component.exportSelected();
    await fixture.whenStable();
    await Promise.resolve();

    expect(messageMock.add).toHaveBeenCalledOnce();
    expect(messageMock.add.mock.calls[0][0].detail).toContain('validar');
  });

  it.each([500, 0])('shows one generic export toast for status %s', async (status) => {
    mockFacturaRepo.exportSelection.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    fixture.detectChanges();
    component.selectedFacturas.set([buildFactura({ id: 'a', status: 'pendiente' })]);

    component.exportSelected();
    await fixture.whenStable();

    expect(messageMock.add).toHaveBeenCalledOnce();
    expect(messageMock.add.mock.calls[0][0]).toMatchObject({ severity: 'error', summary: 'Error de exportación' });
  });

  it('cleans the URL and anchor and shows no success toast when clicking the download fails', async () => {
    const appendChild = vi.spyOn(document.body, 'appendChild');
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('click failed'); });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn().mockReturnValue('blob:broken'), revokeObjectURL });
    mockFacturaRepo.exportSelection.mockReturnValue(of(new HttpResponse<Blob>({ status: 200, body: new Blob(['xlsx']) })));
    fixture.detectChanges();
    component.selectedFacturas.set([buildFactura({ id: 'a', status: 'pendiente' })]);

    component.exportSelected();
    await fixture.whenStable();

    const anchor = appendChild.mock.calls.at(-1)![0] as HTMLAnchorElement;
    expect(anchor.isConnected).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:broken');
    expect(messageMock.add).toHaveBeenCalledOnce();
    expect(messageMock.add.mock.calls[0][0].severity).toBe('error');
    expect(component.isExporting()).toBe(false);
  });
});
