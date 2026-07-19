import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CrearEmpresaDialogComponent } from './crear-empresa-dialog.component';
import { FirmaRepository, Firma } from '@data/repositories/firma.repository';

describe('CrearEmpresaDialogComponent', () => {
  let fixture: ComponentFixture<CrearEmpresaDialogComponent>;
  let component: CrearEmpresaDialogComponent;
  let repoMock: { create: ReturnType<typeof vi.fn> };

  const VALID_FORM_VALUE = {
    tipo_persona: 'juridica',
    nombre: 'Empresa Demo SAC',
    nit: 900123456,
    tipo_id_rep_legal: 'cedula',
    id_rep_legal: 12345678,
    tipo_siigo: 'nube',
    firma_user: 'demo@empresa.com',
    firma_pass: 'secreto-123',
  };

  const CREATED_FIRMA: Firma = {
    id: 'firma-new',
    firma_user: 'demo@empresa.com',
    tipo_siigo: 'nube',
    nit: 900123456,
    last_token: null,
    tipo_persona: 'juridica',
    nombre: 'Empresa Demo SAC',
    activo: true,
    usuario_id: 'user-1',
    created_at: '2026-07-18T00:00:00Z',
  };

  beforeEach(() => {
    repoMock = { create: vi.fn() };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CrearEmpresaDialogComponent],
      providers: [
        provideAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FirmaRepository, useValue: repoMock },
      ],
    });
    fixture = TestBed.createComponent(CrearEmpresaDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('crea el componente', () => {
    expect(component).toBeTruthy();
  });

  it('el formulario inicia inválido (campos requeridos vacíos)', () => {
    expect(component.form.valid).toBe(false);
  });

  it('el formulario es válido cuando todos los campos están llenados', () => {
    component.form.setValue(VALID_FORM_VALUE);
    expect(component.form.valid).toBe(true);
  });

  it('onSubmit() con formulario válido llama repo.create() y emite firmaCreated', () => {
    repoMock.create.mockReturnValue(of(CREATED_FIRMA));
    const emitted: Firma[] = [];
    component.firmaCreated.subscribe((f) => emitted.push(f));

    component.form.setValue(VALID_FORM_VALUE);
    component.onSubmit();

    expect(repoMock.create).toHaveBeenCalledTimes(1);
    expect(repoMock.create).toHaveBeenCalledWith(VALID_FORM_VALUE);
    expect(emitted).toEqual([CREATED_FIRMA]);
    expect(component.loading()).toBe(false);
  });

  it('onSubmit() con formulario inválido NO llama repo.create()', () => {
    component.onSubmit();
    expect(repoMock.create).not.toHaveBeenCalled();
  });

  it('onSubmit() con error del repo setea error signal y NO emite firmaCreated', () => {
    repoMock.create.mockReturnValue(throwError(() => new Error('500')));
    const emitted: Firma[] = [];
    component.firmaCreated.subscribe((f) => emitted.push(f));

    component.form.setValue(VALID_FORM_VALUE);
    component.onSubmit();

    expect(repoMock.create).toHaveBeenCalledTimes(1);
    expect(emitted).toHaveLength(0);
    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('onCancel() resetea el formulario y emite closed', () => {
    let wasClosed = false;
    component.closed.subscribe(() => { wasClosed = true; });

    component.form.setValue(VALID_FORM_VALUE);
    component.onCancel();

    expect(wasClosed).toBe(true);
  });
});

// --- Helpers rxjs (importados al final para no interferir con los mocks) ---
import { of, throwError } from 'rxjs';
