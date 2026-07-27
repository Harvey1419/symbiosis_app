import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { DomSanitizer, ɵDomSanitizerImpl } from '@angular/platform-browser';
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
       getPdf: vi.fn(),
     };


    await TestBed.configureTestingModule({
      imports: [FacturaDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
         provideAnimations(),
         { provide: DomSanitizer, useClass: ɵDomSanitizerImpl },

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

  describe('FacturaDetailComponent — lazy Ver PDF action', () => {
  async function configureForPdf(): Promise<void> {
    await configure({
      filas: [{ descripcion: 'Item A', debito: 100, confianza: 90 }],
    });
  }

  function verPdfButton(): HTMLButtonElement | null {
    return Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button: HTMLButtonElement) => button.textContent?.includes('Ver PDF'),
    ) ?? null;
  }

  it('does not request the PDF during detail loading', async () => {
    await configureForPdf();

    expect(mockFacturaRepo.getPdf).not.toHaveBeenCalled();
  });

  it('requests the PDF once after clicking Ver PDF and renders the iframe', async () => {
    await configureForPdf();
    mockFacturaRepo.getPdf.mockReturnValue(of({
      pdf_base64: 'JVBERi0xLjQK',
      content_type: 'application/pdf',
    }));

    const button = verPdfButton();
    expect(button).not.toBeNull();
    button?.click();
    fixture.detectChanges();

    expect(mockFacturaRepo.getPdf).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[data-testid="pdf-frame"]')).not.toBeNull();
  });

  it('opens the dialog without an iframe when the endpoint returns null PDF data', async () => {
    await configureForPdf();
    mockFacturaRepo.getPdf.mockReturnValue(of({
      pdf_base64: null,
      content_type: 'application/pdf',
    }));

    const button = verPdfButton();
    expect(button).not.toBeNull();
    button?.click();
    fixture.detectChanges();

    expect(mockFacturaRepo.getPdf).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('[data-testid="pdf-frame"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('PDF no disponible');
  });

  it('clears the PDF on close so the next open fetches again', async () => {
    await configureForPdf();
    mockFacturaRepo.getPdf.mockReturnValue(of({
      pdf_base64: 'JVBERi0xLjQK',
      content_type: 'application/pdf',
    }));

    verPdfButton()?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="pdf-frame"]')).not.toBeNull();

    component.closePdfDialog();
    fixture.detectChanges();

    expect(component.pdfBase64()).toBeNull();
    expect(component.pdfDialogOpen()).toBe(false);

    verPdfButton()?.click();
    fixture.detectChanges();
    expect(mockFacturaRepo.getPdf).toHaveBeenCalledTimes(2);
  });
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
         { provide: DomSanitizer, useClass: ɵDomSanitizerImpl },

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

/**
 * Acceptance criteria from spec rev 3 §7 (Capability 5 — payment row):
 *   - credit row (credito > 0) renders the payment p-select, hides impuestos,
 *     and shows the accessible "Cuenta de pago" marker
 *   - debit rows keep the expense presentation (groups=5, full impuestos)
 *   - no row is invented when no row has credito > 0
 *   - the existing item PATCH body is reused for cuenta changes on payment rows
 */
describe('FacturaDetailComponent — payment row differentiation (T5.8/T5.9)', () => {
  const EXPENSE_ACCOUNTS = [
    { account_code: '51050301', account_name: 'Salario integral', account_group: '51', active: true },
    { account_code: '51059901', account_name: 'Otros servicios', account_group: '51', active: true },
  ];
  const PAYMENT_ACCOUNTS = [
    { account_code: '11050501', account_name: 'Caja general', account_group: '11', active: true },
    { account_code: '22050501', account_name: 'Proveedores nacionales', account_group: '22', active: true },
  ];

  let component: FacturaDetailComponent;
  let fixture: ComponentFixture<FacturaDetailComponent>;
  let mockFacturaRepo: any;
  let mockPucRepo: any;

  async function configureForPaymentRow(options: {
    filas: FilaFactura[];
    saveResponse?: Factura;
  }): Promise<void> {
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
      getPdf: vi.fn(),
      updateItem: vi.fn().mockImplementation((_id: string, idx: number, _body: unknown) => {
        // Echo back the updated factura with whatever filas we received
        // plus a tiny tweak so callers can assert the PATCH fired.
        const updated = {
          id: 'fac-789',
          status: 'pendiente',
          factura_nro: 'SETT-101',
          filas: options.saveResponse?.filas ?? options.filas,
        };
        return of(updated);
      }),
    };

    // T5.3 contract: the repository exposes getCuentasByGroups. We mock
    // it to return different account lists per group set so we can
    // assert which groups the component requests.
    mockPucRepo = {
      getCuentasByGroups: vi.fn().mockImplementation((_nit: number, groups: number[]) => {
        if (groups.length === 1 && groups[0] === 5) return of(EXPENSE_ACCOUNTS);
        if (groups.length === 2 && groups[0] === 1 && groups[1] === 2) return of(PAYMENT_ACCOUNTS);
        return of([]);
      }),
      // Backward-compat: T5.3 keeps getCuentaPuc working; some legacy
      // callers (or tests) may still hit it.
      getCuentaPuc: vi.fn().mockReturnValue(of([...EXPENSE_ACCOUNTS, ...PAYMENT_ACCOUNTS])),
    };

    await TestBed.configureTestingModule({
      imports: [FacturaDetailComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideAnimations(),
        { provide: DomSanitizer, useClass: ɵDomSanitizerImpl },

        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: FacturaRepository, useValue: mockFacturaRepo },
        { provide: PucRepository, useValue: mockPucRepo },
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

  function paymentMarkers(): NodeListOf<HTMLElement> {
    return fixture.nativeElement.querySelectorAll('[data-testid="payment-row-marker"]');
  }

  it('requests PUC options once with groups=1,2 (payment) and once with groups=5 (expense)', async () => {
    await configureForPaymentRow({
      filas: [
        { descripcion: 'Gasto A', debito: 100, cuenta: '51050301' },
        { descripcion: 'Pago a proveedor', debito: 0, credito: 100, cuenta: '11050501' },
      ],
    });

    expect(mockPucRepo.getCuentasByGroups).toHaveBeenCalledTimes(2);
    const calls = mockPucRepo.getCuentasByGroups.mock.calls.map(
      (call: [number, number[]]) => call[1],
    );
    // Both call sites must be present, regardless of order.
    expect(calls).toContainEqual([5]);
    expect(calls).toContainEqual([1, 2]);
  });

  it('renders the accessible "Cuenta de pago" marker on the credit row only', async () => {
    await configureForPaymentRow({
      filas: [
        { descripcion: 'Gasto A', debito: 100, cuenta: '51050301' },
        { descripcion: 'Pago a proveedor', debito: 0, credito: 100, cuenta: '11050501' },
      ],
    });

    const markers = paymentMarkers();
    expect(markers.length).toBe(1);
    expect(markers[0].textContent ?? '').toContain('Cuenta de pago');
    // Accessible label must accompany the text.
    expect(markers[0].getAttribute('aria-label')).toBe('Cuenta de pago');
  });

  it('hides impuestos controls for the credit row (data-testid absent)', async () => {
    await configureForPaymentRow({
      filas: [
        { descripcion: 'Gasto A', debito: 100, cuenta: '51050301', iva_code: 'IVA-19' },
        { descripcion: 'Pago a proveedor', debito: 0, credito: 100, cuenta: '11050501' },
      ],
    });

    // The whole-table view has two rows; we identify the payment row
    // by its data-row-marker and confirm the matching TR has NO
    // impuestos cell.
    const rows = Array.from(fixture.nativeElement.querySelectorAll('tr'));
    const dataRows = rows.filter((tr) => tr.querySelector('.fila-desc'));
    expect(dataRows.length).toBe(2);

    const paymentRow = dataRows.find((tr) => tr.querySelector('[data-testid="payment-row-marker"]'));
    const expenseRow = dataRows.find((tr) => !tr.querySelector('[data-testid="payment-row-marker"]'));

    expect(paymentRow).toBeDefined();
    expect(expenseRow).toBeDefined();

    // The payment row must NOT contain an interactive impuestos cell.
    const paymentImpCell = paymentRow?.querySelector('.impuestos-cell-wrapper');
    expect(paymentImpCell).toBeNull();

    // The expense row MUST keep its impuestos cell.
    const expenseImpCell = expenseRow?.querySelector('.impuestos-cell-wrapper');
    expect(expenseImpCell).not.toBeNull();
  });

  it('uses the existing item PATCH body (cuenta only) when the payment row cuenta changes', async () => {
    await configureForPaymentRow({
      filas: [
        { descripcion: 'Gasto A', debito: 100, cuenta: '51050301' },
        { descripcion: 'Pago a proveedor', debito: 0, credito: 100, cuenta: '11050501' },
      ],
    });

    // The payment row is at index 1. Change its cuenta.
    component.onCuentaChanged(1, '22050501');
    component.saveRow(1);

    expect(mockFacturaRepo.updateItem).toHaveBeenCalledTimes(1);
    const [, , body] = mockFacturaRepo.updateItem.mock.calls[0];
    // The body must match the existing UpdateItemBody contract — no
    // retenciones split fields and no tipo_factura UI field.
    expect(Object.keys(body).sort()).toEqual(['cuenta', 'iva_code', 'rete_code'].sort());
    expect(body.cuenta).toBe('22050501');
    // iva_code / rete_code default to null because the payment row
    // never had impuestos assigned.
    expect(body.iva_code).toBeNull();
    expect(body.rete_code).toBeNull();
  });

  it('does not invent a payment row when no row has credito > 0', async () => {
    await configureForPaymentRow({
      filas: [
        { descripcion: 'Gasto A', debito: 100, cuenta: '51050301' },
        { descripcion: 'Gasto B', debito: 50, cuenta: '51059901' },
      ],
    });

    expect(paymentMarkers().length).toBe(0);
  });

  it('renders the same column count for both rows when there is a credit row (impuestos column stays for expense rows)', async () => {
    await configureForPaymentRow({
      filas: [
        { descripcion: 'Gasto A', debito: 100, cuenta: '51050301' },
        { descripcion: 'Pago a proveedor', debito: 0, credito: 100, cuenta: '11050501' },
      ],
    });

    const rows = Array.from(fixture.nativeElement.querySelectorAll('tr'));
    const dataRows = rows.filter((tr) => tr.querySelector('.fila-desc'));
    expect(dataRows.length).toBe(2);

    // The payment row has a hidden cell in the Impuestos column position
    // so the column count remains stable (PrimeNG row templates must
    // not desync). Asserting the testids and presence of placeholder
    // content (or absence of the impuestos wrapper) per row is enough.
    const paymentRow = dataRows.find((tr) => tr.querySelector('[data-testid="payment-row-marker"]'));
    const expenseRow = dataRows.find((tr) => !tr.querySelector('[data-testid="payment-row-marker"]'));
    expect(paymentRow?.cells.length).toBe(expenseRow?.cells.length);
  });
});