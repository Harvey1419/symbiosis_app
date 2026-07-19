import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ClienteListComponent } from './cliente-list.component';
import { FirmaRepository, Firma } from '@data/repositories/firma.repository';
import { CrearEmpresaDialogService } from '@core/crear-empresa-dialog.service';

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
  let dialogMock: {
    open: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    visible: ReturnType<typeof signal>;
  };

  const FIRMA_NUBE: Firma = {
    id: 'f-nube',
    firma_user: 'nube@empresa.com',
    tipo_siigo: 'nube',
    nit: 900123456,
    last_token: null,
  };

  beforeEach(() => {
    firmaMock = { getFirmas: vi.fn() };
    dialogMock = {
      open: vi.fn(),
      close: vi.fn(),
      visible: signal(false),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ClienteListComponent],
      providers: [
        provideRouter([]),
        { provide: FirmaRepository, useValue: firmaMock },
        { provide: CrearEmpresaDialogService, useValue: dialogMock },
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
 *   - nube firma → '/facturas/:nit' (facturas de la nube firma)
 *   - contador firma → '/clientes/firma/:id' (lista de clientes)
 *
 * Bug previo: ambas ramas redirigían mal. RED test verifica el contrato correcto.
 */
describe('ClienteListComponent — onIngresar() routing', () => {
  let fixture: ComponentFixture<ClienteListComponent>;
  let component: ClienteListComponent;
  let routerNavigateSpy: ReturnType<typeof vi.spyOn>;
  let router: Router;
  let firmaMock: { getFirmas: ReturnType<typeof vi.fn> };
  let dialogMock: {
    open: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    visible: ReturnType<typeof signal>;
  };

  const FIRMA_NUBE: Firma = {
    id: 'f-nube',
    firma_user: 'nube@empresa.com',
    tipo_siigo: 'nube',
    nit: 900123456,
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
    dialogMock = {
      open: vi.fn(),
      close: vi.fn(),
      visible: signal(false),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ClienteListComponent],
      providers: [
        provideRouter([]),
        { provide: FirmaRepository, useValue: firmaMock },
        { provide: CrearEmpresaDialogService, useValue: dialogMock },
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

  it('onIngresar() con firma contador navega a /clientes/firma/:id', () => {
    component.onIngresar(FIRMA_CONTADOR);
    expect(routerNavigateSpy).toHaveBeenCalledWith(['/clientes/firma', FIRMA_CONTADOR.id]);
  });
});