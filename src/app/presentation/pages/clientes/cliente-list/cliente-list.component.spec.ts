import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ClienteListComponent } from './cliente-list.component';
import { FirmaRepository, Firma } from '@data/repositories/firma.repository';
import { CrearEmpresaDialogService } from '@core/crear-empresa-dialog.service';

type DialogMock = {
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  openForEdit: ReturnType<typeof vi.fn>;
  visible: ReturnType<typeof signal>;
  editingFirma: ReturnType<typeof signal>;
};

function createDialogMock(): DialogMock {
  return {
    open: vi.fn(),
    close: vi.fn(),
    openForEdit: vi.fn(),
    visible: signal(false),
    editingFirma: signal<Firma | null>(null),
  };
}

/**
 * `CrearEmpresaDialogComponent` (imported transitively via `ClienteListComponent`'s
 * `imports: [CommonModule, TableModule, CrearEmpresaDialogComponent]`) injects
 * `MessageService` since WU-7. The dialog is never opened in these tests
 * (we mock `CrearEmpresaDialogService`), but Angular still has to be able to
 * construct the dialog component's DI graph when it scans the parent's
 * imports — hence the mock provider below. Mirrors the WU-8c pattern applied
 * to `crear-empresa-dialog.component.spec.ts`.
 */
function createMessageServiceMock() {
  return {
    add: vi.fn(),
    messageObserver: { subscribe: vi.fn(), next: vi.fn(), pipe: vi.fn().mockReturnValue({ subscribe: vi.fn() }) },
    clearObserver: { subscribe: vi.fn(), next: vi.fn(), pipe: vi.fn().mockReturnValue({ subscribe: vi.fn() }) },
  };
}

/**
 * Verifica la integración del botón "Agregar Empresa" del ClienteListComponent:
 *   - Al hacer click, llama `crearEmpresaDialog.open()`.
 *   - El botón está cableado en el template.
 *   - No navega (es modal, no ruta).
 */
describe('ClienteListComponent — botón Agregar Empresa', () => {
  let fixture: ComponentFixture<ClienteListComponent>;
  let component: ClienteListComponent;
  let firmaMock: { getFirmas: ReturnType<typeof vi.fn> };
  let dialogMock: DialogMock;

  const FIRMA_NUBE: Firma = {
    id: 'f-nube',
    firma_user: 'nube@empresa.com',
    tipo_siigo: 'nube',
    nit: 900123456,
    last_token: null,
  };

  beforeEach(() => {
    firmaMock = { getFirmas: vi.fn() };
    dialogMock = createDialogMock();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ClienteListComponent],
      providers: [
        provideRouter([]),
        { provide: FirmaRepository, useValue: firmaMock },
        { provide: CrearEmpresaDialogService, useValue: dialogMock },
        { provide: MessageService, useValue: createMessageServiceMock() },
      ],
    });

    firmaMock.getFirmas.mockReturnValue(of([FIRMA_NUBE]));

    fixture = TestBed.createComponent(ClienteListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('onAddEmpresa() llama a CrearEmpresaDialogService.open()', () => {
    component.onAddEmpresa();
    expect(dialogMock.open).toHaveBeenCalledTimes(1);
  });

  it('onAddEmpresa() puede ser invocado múltiples veces sin error', () => {
    component.onAddEmpresa();
    component.onAddEmpresa();
    expect(dialogMock.open).toHaveBeenCalledTimes(2);
  });

  it('renderiza el botón "Agregar Empresa" en el template', () => {
    const btn: HTMLButtonElement | null = fixture.nativeElement.querySelector('button.btn-add');
    expect(btn).toBeTruthy();
    expect(btn?.textContent).toContain('Agregar Empresa');
  });

  it('click en el botón "Agregar Empresa" dispara onAddEmpresa() → dialog.open()', () => {
    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('button.btn-add');
    btn.click();

    expect(dialogMock.open).toHaveBeenCalledTimes(1);
  });

  it('onEmpresaCreada() cierra el dialog y recarga la lista', () => {
    const refreshSpy = vi.spyOn(component, 'loadFirmas');
    component.onEmpresaCreada();
    expect(dialogMock.close).toHaveBeenCalledTimes(1);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});

/**
 * onIngresar() routing — onboarding-empresa AC-1:
 *   - nube firma con nit → '/facturas/:nit' (facturas de la nube firma)
 *   - nube firma con nit=null → NO navega (botón "Terminar registro" en su lugar)
 *   - contador firma → '/clientes/firma/:id' (lista de clientes)
 */
describe('ClienteListComponent — onIngresar() routing', () => {
  let fixture: ComponentFixture<ClienteListComponent>;
  let component: ClienteListComponent;
  let routerNavigateSpy: ReturnType<typeof vi.spyOn>;
  let router: Router;
  let firmaMock: { getFirmas: ReturnType<typeof vi.fn> };
  let dialogMock: DialogMock;

  const FIRMA_NUBE: Firma = {
    id: 'f-nube',
    firma_user: 'nube@empresa.com',
    tipo_siigo: 'nube',
    nit: 900123456,
    last_token: null,
  };

  const FIRMA_NUBE_PENDING: Firma = {
    id: 'f-nube-pending',
    firma_user: 'pending@nube.com',
    tipo_siigo: 'nube',
    nit: null,
    last_token: null,
  };

  const FIRMA_CONTADOR: Firma = {
    id: 'f-contador',
    firma_user: 'contador@despacho.com',
    tipo_siigo: 'contador',
    nit: 800111222,
    last_token: null,
  };

  beforeEach(() => {
    firmaMock = { getFirmas: vi.fn() };
    dialogMock = createDialogMock();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ClienteListComponent],
      providers: [
        provideRouter([]),
        { provide: FirmaRepository, useValue: firmaMock },
        { provide: CrearEmpresaDialogService, useValue: dialogMock },
        { provide: MessageService, useValue: createMessageServiceMock() },
      ],
    });

    router = TestBed.inject(Router);
    routerNavigateSpy = vi.spyOn(router, 'navigate');

    firmaMock.getFirmas.mockReturnValue(of([FIRMA_NUBE, FIRMA_CONTADOR]));

    fixture = TestBed.createComponent(ClienteListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('onIngresar() con firma nube navega a /facturas/:nit (AC-1)', () => {
    component.onIngresar(FIRMA_NUBE);
    expect(routerNavigateSpy).toHaveBeenCalledWith(['/facturas', FIRMA_NUBE.nit]);
  });

  it('onIngresar() con firma nube sin NIT abre dialog "Terminar registro" (no navega)', () => {
    component.onIngresar(FIRMA_NUBE_PENDING);
    expect(dialogMock.openForEdit).toHaveBeenCalledWith(FIRMA_NUBE_PENDING);
    expect(routerNavigateSpy).not.toHaveBeenCalled();
  });

  it('onIngresar() con firma contador navega a /clientes/firma/:id', () => {
    component.onIngresar(FIRMA_CONTADOR);
    expect(routerNavigateSpy).toHaveBeenCalledWith(['/clientes/firma', FIRMA_CONTADOR.id]);
  });
});

/**
 * Terminar Registro flow — onboarding-empresa:
 *   - needsCompletion() detecta nube + nit=null
 *   - onTerminarRegistro() abre el dialog con la firma precargada
 */
describe('ClienteListComponent — Terminar Registro flow', () => {
  let component: ClienteListComponent;
  let dialogMock: DialogMock;

  const FIRMA_NUBE_PENDING: Firma = {
    id: 'f-nube-pending',
    firma_user: 'pending@nube.com',
    tipo_siigo: 'nube',
    nit: null,
    last_token: null,
  };

  const FIRMA_NUBE_OK: Firma = {
    id: 'f-nube-ok',
    firma_user: 'ok@nube.com',
    tipo_siigo: 'nube',
    nit: 900111222,
    last_token: null,
  };

  const FIRMA_CONTADOR: Firma = {
    id: 'f-contador',
    firma_user: 'a@b.com',
    tipo_siigo: 'contador',
    nit: 800111222,
    last_token: null,
  };

  beforeEach(() => {
    dialogMock = createDialogMock();
  });

  it('needsCompletion() retorna true para nube + nit=null', () => {
    component = { needsCompletion: ClienteListComponent.prototype.needsCompletion.bind(null) } as any;
    expect(component.needsCompletion(FIRMA_NUBE_PENDING)).toBe(true);
  });

  it('needsCompletion() retorna false para nube con nit', () => {
    expect(ClienteListComponent.prototype.needsCompletion.call(null, FIRMA_NUBE_OK)).toBe(false);
  });

  it('needsCompletion() retorna false para contador', () => {
    expect(ClienteListComponent.prototype.needsCompletion.call(null, FIRMA_CONTADOR)).toBe(false);
  });

  it('onTerminarRegistro() abre el dialog con la firma precargada', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ClienteListComponent],
      providers: [
        provideRouter([]),
        { provide: FirmaRepository, useValue: { getFirmas: vi.fn().mockReturnValue(of([])) } },
        { provide: CrearEmpresaDialogService, useValue: dialogMock },
        { provide: MessageService, useValue: createMessageServiceMock() },
      ],
    });

    const fixture = TestBed.createComponent(ClienteListComponent);
    fixture.componentInstance.onTerminarRegistro(FIRMA_NUBE_PENDING);
    expect(dialogMock.openForEdit).toHaveBeenCalledWith(FIRMA_NUBE_PENDING);
    expect(dialogMock.open).not.toHaveBeenCalled();
  });
});

/**
 * Engranaje de "Actualizar empresa" — abre el dialog de edición para
 * cualquier firma (no solo pendientes). El modal hace PATCH
 * /api/empresas/:nit.
 */
describe('ClienteListComponent — onActualizarEmpresa (engranaje)', () => {
  let dialogMock: DialogMock;

  const FIRMA_NUBE_OK: Firma = {
    id: 'f-nube-ok',
    firma_user: 'ok@nube.com',
    tipo_siigo: 'nube',
    nit: 900111222,
    last_token: null,
    nombre: 'Empresa Demo S.A.',
  };

  const FIRMA_CONTADOR: Firma = {
    id: 'f-contador',
    firma_user: 'a@b.com',
    tipo_siigo: 'contador',
    nit: 800111222,
    last_token: null,
  };

  beforeEach(() => {
    dialogMock = createDialogMock();
  });

  it('abre el dialog en modo edición con la firma nube registrada', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ClienteListComponent],
      providers: [
        provideRouter([]),
        { provide: FirmaRepository, useValue: { getFirmas: vi.fn().mockReturnValue(of([])) } },
        { provide: CrearEmpresaDialogService, useValue: dialogMock },
        { provide: MessageService, useValue: createMessageServiceMock() },
      ],
    });
    const fixture = TestBed.createComponent(ClienteListComponent);
    fixture.componentInstance.onActualizarEmpresa(FIRMA_NUBE_OK);
    expect(dialogMock.openForEdit).toHaveBeenCalledWith(FIRMA_NUBE_OK);
    expect(dialogMock.open).not.toHaveBeenCalled();
  });

  it('abre el dialog en modo edición con una firma contador', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ClienteListComponent],
      providers: [
        provideRouter([]),
        { provide: FirmaRepository, useValue: { getFirmas: vi.fn().mockReturnValue(of([])) } },
        { provide: CrearEmpresaDialogService, useValue: dialogMock },
        { provide: MessageService, useValue: createMessageServiceMock() },
      ],
    });
    const fixture = TestBed.createComponent(ClienteListComponent);
    fixture.componentInstance.onActualizarEmpresa(FIRMA_CONTADOR);
    expect(dialogMock.openForEdit).toHaveBeenCalledWith(FIRMA_CONTADOR);
  });
});

/**
 * getDisplayName() — devuelve `nombre` si existe, sino `firma_user`
 * (correo). Es la fuente de verdad de la celda "Cliente".
 */
describe('ClienteListComponent — getDisplayName', () => {
  const FIRMA_CON_NOMBRE: Firma = {
    id: 'f-1',
    firma_user: 'admin@empresa.com',
    tipo_siigo: 'nube',
    nit: 900123456,
    last_token: null,
    nombre: 'Empresa ACME S.A.S.',
  };
  const FIRMA_SIN_NOMBRE: Firma = {
    id: 'f-2',
    firma_user: 'admin@empresa.com',
    tipo_siigo: 'nube',
    nit: 900123456,
    last_token: null,
    nombre: null,
  };
  const FIRMA_NOMBRE_VACIO: Firma = {
    id: 'f-3',
    firma_user: 'admin@empresa.com',
    tipo_siigo: 'nube',
    nit: 900123456,
    last_token: null,
    nombre: '   ',
  };

  it('devuelve el nombre cuando está presente', () => {
    expect(
      ClienteListComponent.prototype.getDisplayName.call(null, FIRMA_CON_NOMBRE),
    ).toBe('Empresa ACME S.A.S.');
  });

  it('cae al correo cuando nombre es null', () => {
    expect(
      ClienteListComponent.prototype.getDisplayName.call(null, FIRMA_SIN_NOMBRE),
    ).toBe('admin@empresa.com');
  });

  it('cae al correo cuando nombre es solo espacios', () => {
    expect(
      ClienteListComponent.prototype.getDisplayName.call(null, FIRMA_NOMBRE_VACIO),
    ).toBe('admin@empresa.com');
  });
});

/**
 * Click en la row entera debe disparar el mismo handler que el botón
 * "Terminar registro" para firmas pendientes — UX consistente.
 */
describe('ClienteListComponent — row click dispatch', () => {
  let component: ClienteListComponent;
  let routerNavigateSpy: ReturnType<typeof vi.spyOn>;
  let dialogMock: DialogMock;

  const FIRMA_NUBE_PENDING: Firma = {
    id: 'f-nube-pending',
    firma_user: 'pending@nube.com',
    tipo_siigo: 'nube',
    nit: null,
    last_token: null,
  };

  const FIRMA_NUBE_OK: Firma = {
    id: 'f-nube-ok',
    firma_user: 'ok@nube.com',
    tipo_siigo: 'nube',
    nit: 900111222,
    last_token: null,
  };

  beforeEach(() => {
    dialogMock = createDialogMock();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ClienteListComponent],
      providers: [
        provideRouter([]),
        { provide: FirmaRepository, useValue: { getFirmas: vi.fn().mockReturnValue(of([])) } },
        { provide: CrearEmpresaDialogService, useValue: dialogMock },
        { provide: MessageService, useValue: createMessageServiceMock() },
      ],
    });

    const fixture = TestBed.createComponent(ClienteListComponent);
    component = fixture.componentInstance;
    routerNavigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate');
  });

  it('row click en firma nube sin NIT abre dialog "Terminar registro" (no navega)', () => {
    component.onIngresar(FIRMA_NUBE_PENDING);
    expect(dialogMock.openForEdit).toHaveBeenCalledWith(FIRMA_NUBE_PENDING);
    expect(routerNavigateSpy).not.toHaveBeenCalled();
  });

  it('row click en firma nube con NIT navega a /facturas/:nit (no abre dialog)', () => {
    component.onIngresar(FIRMA_NUBE_OK);
    expect(routerNavigateSpy).toHaveBeenCalledWith(['/facturas', FIRMA_NUBE_OK.nit]);
    expect(dialogMock.openForEdit).not.toHaveBeenCalled();
  });
});