import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
  let dialogMock: { open: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };

  const FIRMA_NUBE: Firma = {
    id: 'f-nube',
    firma_user: 'nube@empresa.com',
    tipo_siigo: 'nube',
    nit: 900123456,
    last_token: null,
  };

  beforeEach(() => {
    firmaMock = { getFirmas: vi.fn() };
    dialogMock = { open: vi.fn(), close: vi.fn() };

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
});