import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { CrearEmpresaDialogComponent } from './crear-empresa-dialog.component';
import { UpdateEmpresaSchema } from './crear-empresa.schema';
import { FirmaRepository, Firma } from '@data/repositories/firma.repository';
import { ConfirmService } from '@app/shared/confirm-dialog/confirm.service';

describe('CrearEmpresaDialogComponent', () => {
  let fixture: ComponentFixture<CrearEmpresaDialogComponent>;
  let component: CrearEmpresaDialogComponent;
  let repoMock: {
    create: ReturnType<typeof vi.fn>;
    updateEmpresa: ReturnType<typeof vi.fn>;
    deleteEmpresa: ReturnType<typeof vi.fn>;
  };
  let confirmMock: { confirm: ReturnType<typeof vi.fn> };

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
    repoMock = { create: vi.fn(), updateEmpresa: vi.fn(), deleteEmpresa: vi.fn() };
    confirmMock = { confirm: vi.fn() };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CrearEmpresaDialogComponent],
      providers: [
        provideAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FirmaRepository, useValue: repoMock },
        { provide: ConfirmService, useValue: confirmMock },
        // El componente inyecta `MessageService` desde WU-7 y monta `<p-toast>`
        // desde WU-8b. Toast.ngOnInit se suscribe a `messageObserver` y
        // `clearObserver`, así que el mock debe exponerlos — un mock con solo
        // `add` revienta al instanciar el componente.
        {
          provide: MessageService,
          useValue: {
            add: vi.fn(),
            messageObserver: {
              subscribe: vi.fn(),
              next: vi.fn(),
              pipe: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
            },
            clearObserver: {
              subscribe: vi.fn(),
              next: vi.fn(),
              pipe: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
            },
          },
        },
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

  /**
   * RED para el bug real: `<input type="number">` con pInputText devuelve
   * STRING al FormControl (no Number como con NumberValueAccessor puro).
   * Sin coerción, Zod.safeParse falla por tipos → user ve "guardar no hace nada".
   */
  it('onSubmit() coerce STRING numbers del form (simula type="number" con pInputText) a number antes de validar', () => {
    repoMock.create.mockReturnValue(of(CREATED_FIRMA));

    // Simula el DOM: type="number" devuelve STRING al FormControl.
    component.form.setValue({
      tipo_persona: 'juridica',
      nombre: 'Empresa Demo SAC',
      nit: '900123456', // ← STRING del DOM
      tipo_id_rep_legal: 'cedula',
      id_rep_legal: '12345678', // ← STRING del DOM
      tipo_siigo: 'nube',
      firma_user: 'demo@empresa.com',
      firma_pass: 'secreto-123',
    });

    // Debug: revisar cada control si hay errores
    const controlErrors = Object.entries(component.form.controls).map(([k, c]) => ({
      name: k,
      value: c.value,
      errors: c.errors,
      valid: c.valid,
    }));
    if (component.form.invalid) {
      // eslint-disable-next-line no-console
      console.error('Form still invalid. Controls:', controlErrors);
    }

    expect(component.form.valid).toBe(true);
    component.onSubmit();

    expect(repoMock.create).toHaveBeenCalledTimes(1);

    const arg = repoMock.create.mock.calls[0][0];
    expect(typeof arg.nit).toBe('number');
    expect(arg.nit).toBe(900123456);
    expect(typeof arg.id_rep_legal).toBe('number');
    expect(arg.id_rep_legal).toBe(12345678);
  });

  it('onSubmit() extrae mensaje real del error HttpClientResponse y lo guarda en errorMessage', () => {
    const httpError = {
      status: 400,
      statusText: 'Bad Request',
      error: { error: 'validation', details: 'nit must be positive' },
    };
    repoMock.create.mockReturnValue(throwError(() => httpError));

    component.form.setValue(VALID_FORM_VALUE);
    component.onSubmit();

    expect(component.error()).toBe(true);
    expect(component.errorMessage()).toContain('400');
    expect(component.errorMessage()).toContain('validation');
  });

  it('onCancel() resetea el formulario y emite closed', () => {
    let wasClosed = false;
    component.closed.subscribe(() => {
      wasClosed = true;
    });

    component.form.setValue(VALID_FORM_VALUE);
    component.onCancel();

    expect(wasClosed).toBe(true);
  });
});

/**
 * WU-7 / REQ-TOAST-001 + REQ-TOAST-002 — MessageService injection + emission.
 *
 * Hasta este WU el dialog solo tenía feedback inline (`<p-message>`) y
 * cerraba el modal via `firmaCreated`/`firmaUpdated`. El feedback global
 * (PrimeNG toast) lo gestiona el componente: al POST/PATCH exitoso emite
 * severity='success', al HTTP error emite severity='error' — sin quitar el
 * `error` signal para que el fallback `<p-message>` siga visible para
 * accesibilidad.
 *
 * El `MessageService` está globalmente provisto en `app.config.ts`; aquí
 * lo mockeamos via `useValue` para poder espiar `add(...)`.
 */
describe('CrearEmpresaDialogComponent — toast (WU-7)', () => {
  let fixture: ComponentFixture<CrearEmpresaDialogComponent>;
  let component: CrearEmpresaDialogComponent;
  let repoMock: {
    create: ReturnType<typeof vi.fn>;
    updateEmpresa: ReturnType<typeof vi.fn>;
  };
  let messageMock: {
    add: ReturnType<typeof vi.fn>;
    messageObserver: {
      subscribe: ReturnType<typeof vi.fn>;
      next: ReturnType<typeof vi.fn>;
      pipe: ReturnType<typeof vi.fn>;
    };
    clearObserver: {
      subscribe: ReturnType<typeof vi.fn>;
      next: ReturnType<typeof vi.fn>;
      pipe: ReturnType<typeof vi.fn>;
    };
  };

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
    repoMock = { create: vi.fn(), updateEmpresa: vi.fn(), deleteEmpresa: vi.fn() };
    messageMock = {
      add: vi.fn(),
      messageObserver: {
        subscribe: vi.fn(),
        next: vi.fn(),
        pipe: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
      },
      clearObserver: {
        subscribe: vi.fn(),
        next: vi.fn(),
        pipe: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
      },
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CrearEmpresaDialogComponent],
      providers: [
        provideAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FirmaRepository, useValue: repoMock },
        { provide: ConfirmService, useValue: { confirm: vi.fn() } },
        { provide: MessageService, useValue: messageMock },
      ],
    });
    fixture = TestBed.createComponent(CrearEmpresaDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('POST exitoso → message.add con severity success y summary "Empresa creada"', () => {
    repoMock.create.mockReturnValue(of(CREATED_FIRMA));

    component.form.setValue(VALID_FORM_VALUE);
    component.onSubmit();

    expect(messageMock.add).toHaveBeenCalledTimes(1);
    const arg = messageMock.add.mock.calls[0][0];
    expect(arg.severity).toBe('success');
    expect(arg.summary).toBe('Empresa creada');
  });

  it('POST fallido (HTTP error) → message.add con severity error Y preserva el error signal inline', () => {
    const httpError = {
      status: 500,
      statusText: 'Internal Server Error',
      error: { error: 'CREATE_FIRMA_FAILED', message: 'DB blew up' },
    };
    repoMock.create.mockReturnValue(throwError(() => httpError));

    component.form.setValue(VALID_FORM_VALUE);
    component.onSubmit();

    expect(messageMock.add).toHaveBeenCalledTimes(1);
    const arg = messageMock.add.mock.calls[0][0];
    expect(arg.severity).toBe('error');

    // El signal inline NO se reemplaza — sigue siendo fallback accesible.
    expect(component.error()).toBe(true);
    expect(component.errorMessage()).toContain('500');
  });

  it('PATCH exitoso (modo edición) → message.add con severity success y summary "Empresa actualizada"', () => {
    const updatedFirma: Firma = { ...CREATED_FIRMA, nombre: 'Empresa Demo SAC (edit)' };
    repoMock.updateEmpresa.mockReturnValue(of(updatedFirma));

    // Re-crear el component en modo edición seteando `editingFirma`.
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('editingFirma', {
      ...CREATED_FIRMA,
      tipo_id_rep_legal: 'cedula',
      id_rep_legal: 12345678,
    } as Firma);
    fixture.detectChanges();

    // El FormGroup conserva los 8 controles aunque el dialog renderice solo
    // 5 en modo edición; `setValue` exige los 8 para no lanzar NG01002 y
    // para que `form.invalid` no frene el submit antes de llegar al repo.
    component.form.setValue({
      tipo_persona: 'juridica',
      nombre: 'Empresa Demo SAC (edit)',
      nit: 900123456,
      tipo_id_rep_legal: 'cedula',
      id_rep_legal: 12345678,
      tipo_siigo: 'nube',
      firma_user: 'demo@empresa.com',
      firma_pass: 'secreto-123',
    });
    component.onSubmit();

    expect(repoMock.updateEmpresa).toHaveBeenCalledWith(900123456, {
      tipo_persona: 'juridica',
      nombre: 'Empresa Demo SAC (edit)',
      tipo_id_rep_legal: 'cedula',
      id_rep_legal: 12345678,
      firmaId: 'firma-new',
    });
    expect(messageMock.add).toHaveBeenCalledTimes(1);
    const arg = messageMock.add.mock.calls[0][0];
    expect(arg.severity).toBe('success');
    expect(arg.summary).toBe('Empresa actualizada');
  });

  it('modo edición permite el submit cuando editingFirma.nit es null utilizando el nit ingresado en el form', () => {
    repoMock.updateEmpresa.mockReturnValue(of({ ...CREATED_FIRMA, nit: 900123456 }));
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('editingFirma', { ...CREATED_FIRMA, nit: null });
    fixture.detectChanges();

    component.form.setValue(VALID_FORM_VALUE);
    component.onSubmit();

    expect(repoMock.updateEmpresa).toHaveBeenCalledWith(900123456, {
      tipo_persona: 'juridica',
      nombre: 'Empresa Demo SAC',
      tipo_id_rep_legal: 'cedula',
      id_rep_legal: 12345678,
      firmaId: 'firma-new',
    });
  });

  it('onCancel() → NO emite toast (ni success ni error)', () => {
    component.form.setValue(VALID_FORM_VALUE);
    component.onCancel();

    expect(messageMock.add).not.toHaveBeenCalled();
  });

  /**
   * F-2 / REQ-PREFILL-001 — Regression lock on edit-mode prefill.
   *
   * Hasta este fix, `ngOnInit` hardcodeaba `tipo_id_rep_legal: ''` y
   * `id_rep_legal: null` en lugar de leerlos del input `editingFirma()`.
   * Resultado: el modal "Terminar Registro" se abría con los 2 campos
   * del representante legal VACÍOS aunque la API ya los devolvía.
   *
   * Este test fija la valla: en modo edición, los 4 campos de negocio
   * (`tipo_persona`, `nombre`, `tipo_id_rep_legal`, `id_rep_legal`) deben
   * quedar pre-rellenados en el FormGroup directamente desde `editingFirma`.
   *
   * NOTA: usa `as Firma` porque el interface aún no declara los 2 campos
   * nuevos — esto es intencional, el test actúa como RED lock.
   *
   * Implementación: como `ngOnInit` solo corre UNA vez en el ciclo de vida
   * del componente (durante el primer `detectChanges` del `beforeEach`,
   * cuando `editingFirma()` aún es `null`), re-invocamos `ngOnInit()`
   * manualmente después de `setInput` para validar el bloque de prefill.
   */
  it('ngOnInit modo edición: pre-rellena los 4 campos de negocio desde editingFirma', () => {
    const editingFirma: Firma = {
      ...CREATED_FIRMA,
      tipo_persona: 'natural',
      nombre: 'Empresa Editada SAS',
      tipo_id_rep_legal: 'pasaporte',
      id_rep_legal: 98765432,
    };

    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('editingFirma', editingFirma);
    fixture.detectChanges(); // re-disparar prefill con editingFirma presente

    expect(component.isEditMode()).toBe(true);
    expect(component.form.get('tipo_persona')?.value).toBe('natural');
    expect(component.form.get('nombre')?.value).toBe('Empresa Editada SAS');
    expect(component.form.get('tipo_id_rep_legal')?.value).toBe('pasaporte');
    expect(component.form.get('id_rep_legal')?.value).toBe(98765432);
  });

  /**
   * Regression lock para el bug reportado en 2026-07-19:
   * "Le doy Guardar y no me hace la petición de actualización".
   *
   * Causa raíz: en edit mode los inputs visuales de credenciales están
   * ocultos via `@if (!isEditMode())`, pero los FormControls siguen
   * existiendo en el FormGroup con `Validators.required` / `Validators.email`.
   * Sus valores son `''` → `form.invalid === true` → `onSubmit()` retorna
   * early en la línea 127 ANTES de hacer la HTTP request.
   *
   * Fix: en `ngOnInit` modo edición, limpiar los validadores + deshabilitar
   * los 3 controles de credenciales. El form debe ser VÁLIDO con solo los
   * 5 campos de negocio llenos (que es el contrato de UpdateEmpresaSchema).
   *
   * Si alguien revierte el cleanup, este test falla RED.
   */
  it('modo edición: el form es VÁLIDO con solo los 5 campos de negocio (credenciales disabled)', () => {
    const editingFirma: Firma = {
      ...CREATED_FIRMA,
      nit: 900123456,
      tipo_persona: 'juridica',
      nombre: 'Empresa Editada SAS',
      tipo_id_rep_legal: 'cedula',
      id_rep_legal: 12345678,
    };

    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('editingFirma', editingFirma);
    fixture.detectChanges();

    // El form debe estar válido sin tocar las credenciales — ese era el
    // síntoma del bug: form.invalid === true bloqueaba onSubmit antes de
    // cualquier HTTP request.
    expect(component.form.valid).toBe(true);

    // Las credenciales deben estar deshabilitadas (excluidas de validación)
    expect(component.form.get('tipo_siigo')?.disabled).toBe(true);
    expect(component.form.get('firma_user')?.disabled).toBe(true);
    expect(component.form.get('firma_pass')?.disabled).toBe(true);
  });

  /**
   * En edit mode los campos de negocio EXCEPTO `nombre` están bloqueados.
   * `nombre` es el único dato modificable desde este flow (corrección de
   * razón social). El NIT, tipo_persona, tipo_id_rep_legal e id_rep_legal
   * NO son modificables por PATCH /api/empresas/:nit — ver el contrato
   * backend en `api/src/presentation/schemas/firma.schema.ts`.
   */
  it('modo edición: `nombre` queda HABILITADO y el resto de campos de negocio DESHABILITADOS', () => {
    const editingFirma: Firma = {
      ...CREATED_FIRMA,
      nit: 900123456,
      tipo_persona: 'juridica',
      nombre: 'Empresa Original',
      tipo_id_rep_legal: 'cedula',
      id_rep_legal: 12345678,
    };

    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('editingFirma', editingFirma);
    fixture.detectChanges();

    // Campos de negocio bloqueados
    expect(component.form.get('tipo_persona')?.disabled).toBe(true);
    expect(component.form.get('nit')?.disabled).toBe(true);
    expect(component.form.get('tipo_id_rep_legal')?.disabled).toBe(true);
    expect(component.form.get('id_rep_legal')?.disabled).toBe(true);

    // Único campo editable
    expect(component.form.get('nombre')?.disabled).toBe(false);
    expect(component.form.get('nombre')?.value).toBe('Empresa Original');
  });

  it('modo edición: el form sigue siendo válido aunque los 4 campos bloqueados estén "vacíos" (no cuentan en validación)', () => {
    const editingFirma: Firma = {
      ...CREATED_FIRMA,
      nit: null, // firma legacy
      tipo_persona: null,
      nombre: 'Empresa Legacy',
      tipo_id_rep_legal: null,
      id_rep_legal: null,
    };

    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('editingFirma', editingFirma);
    fixture.detectChanges();

    // Como están disabled, el form puede ser válido solo con `nombre` lleno.
    expect(component.form.get('nombre')?.value).toBe('Empresa Legacy');
    expect(component.form.valid).toBe(true);
  });

  /**
   * Regression lock: en edit mode, el botón Guardar DEBE disparar la
   * HTTP request al backend. Antes del fix, `onSubmit` retornaba early
   * por form.invalid (credenciales vacías con Validators.required).
   */
  it('modo edición REACTIVO (sin ngOnInit manual): setInput editingFirma → effect dispara cleanup → form válido', () => {
    // El padre (cliente-list) usa `CrearEmpresaDialogService` que setea
    // editingFirma DESPUÉS del mount del modal. Sin el effect reactivo
    // que añadimos en el constructor, ngOnInit (que corre una sola vez)
    // no podría capturar este cambio.
    //
    // El flow de producción: el modal se monta con editingFirma=null →
    // usuario click "Terminar Registro" → service.set(firma) →
    // el signal input cambia → el effect dispara → cleanup de credenciales
    // → form válido.
    //
    // Para reproducir en test: NO llamar ngOnInit manualmente.
    // Solo setInput + detectChanges. El effect debe hacer todo.
    const editingFirma: Firma = {
      ...CREATED_FIRMA,
      nit: 900123456,
      tipo_persona: 'juridica',
      nombre: 'Empresa Demo SAC',
      tipo_id_rep_legal: 'cedula',
      id_rep_legal: 12345678,
    };

    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('editingFirma', editingFirma);
    fixture.detectChanges(); // trigger signal effect

    // Si llegamos aquí sin llamar ngOnInit manualmente y el form es válido,
    // significa que el effect reactivo funcionó.
    expect(component.form.valid).toBe(true);
    expect(component.form.get('tipo_siigo')?.disabled).toBe(true);
  });

  it('modo edición con form válido → onSubmit llama firmaRepo.updateEmpresa() y emite firmaUpdated', () => {
    const editingFirma: Firma = {
      ...CREATED_FIRMA,
      nit: 900123456,
      tipo_persona: 'juridica',
      nombre: 'Empresa Demo SAC',
      tipo_id_rep_legal: 'cedula',
      id_rep_legal: 12345678,
    };

    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('editingFirma', editingFirma);
    fixture.detectChanges();

    const repoMock = TestBed.inject(FirmaRepository) as unknown as {
      updateEmpresa: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    const updated: Firma = { ...editingFirma, nombre: 'Empresa Demo SAC (updated)' };
    repoMock.updateEmpresa = vi.fn().mockReturnValue(of(updated));
    const messageMock = TestBed.inject(MessageService) as unknown as {
      add: ReturnType<typeof vi.fn>;
    };
    const messageSpy = vi.spyOn(messageMock, 'add');

    const emitted: Firma[] = [];
    component.firmaUpdated.subscribe((f) => emitted.push(f));

    component.onSubmit();

    // Bug fix: la HTTP request SÍ se dispara (era el síntoma reportado).
    expect(repoMock.updateEmpresa).toHaveBeenCalledTimes(1);
    expect(repoMock.updateEmpresa).toHaveBeenCalledWith(
      900123456,
      expect.objectContaining({
        tipo_persona: 'juridica',
        nombre: 'Empresa Demo SAC',
        tipo_id_rep_legal: 'cedula',
        id_rep_legal: 12345678,
        firmaId: 'firma-new',
      }),
    );
    expect(emitted).toEqual([updated]);
    expect(messageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Empresa actualizada' }),
    );
  });
});

/**
 * onEliminarEmpresa() — soft-delete de empresa desde el dialog.
 *
 * Confirmación obligatoria vía ConfirmService; si el usuario cancela, NO
 * se hace HTTP request. Si confirma, llama firmaRepo.deleteEmpresa(nit),
 * emite firmaDeleted(firma) y muestra un toast de éxito.
 */
describe('CrearEmpresaDialogComponent — onEliminarEmpresa (soft-delete)', () => {
  let fixture: ComponentFixture<CrearEmpresaDialogComponent>;
  let component: CrearEmpresaDialogComponent;
  let repoMock: {
    create: ReturnType<typeof vi.fn>;
    updateEmpresa: ReturnType<typeof vi.fn>;
    deleteEmpresa: ReturnType<typeof vi.fn>;
  };
  let confirmMock: { confirm: ReturnType<typeof vi.fn> };

  const EDITING_FIRMA: Firma = {
    id: 'firma-1',
    firma_user: 'demo@empresa.com',
    tipo_siigo: 'nube',
    nit: 900123456,
    last_token: null,
    tipo_persona: 'juridica',
    nombre: 'Empresa Demo SAC',
  };

  beforeEach(() => {
    repoMock = { create: vi.fn(), updateEmpresa: vi.fn(), deleteEmpresa: vi.fn() };
    confirmMock = { confirm: vi.fn() };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CrearEmpresaDialogComponent],
      providers: [
        provideAnimations(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FirmaRepository, useValue: repoMock },
        { provide: ConfirmService, useValue: confirmMock },
        {
          provide: MessageService,
          useValue: {
            add: vi.fn(),
            messageObserver: {
              subscribe: vi.fn(),
              next: vi.fn(),
              pipe: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
            },
            clearObserver: {
              subscribe: vi.fn(),
              next: vi.fn(),
              pipe: vi.fn().mockReturnValue({ subscribe: vi.fn() }),
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(CrearEmpresaDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('editingFirma', EDITING_FIRMA);
    fixture.detectChanges();
  });

  it('pide confirmación antes de llamar al repo', async () => {
    confirmMock.confirm.mockResolvedValue(false);
    await component.onEliminarEmpresa();
    expect(confirmMock.confirm).toHaveBeenCalledTimes(1);
    expect(repoMock.deleteEmpresa).not.toHaveBeenCalled();
  });

  it('si el usuario cancela, NO llama al repo y NO emite firmaDeleted', async () => {
    confirmMock.confirm.mockResolvedValue(false);
    const emitted: Firma[] = [];
    component.firmaDeleted.subscribe((f) => emitted.push(f));

    await component.onEliminarEmpresa();

    expect(repoMock.deleteEmpresa).not.toHaveBeenCalled();
    expect(emitted).toEqual([]);
  });

  it('si el usuario confirma, llama firmaRepo.deleteEmpresa con el NIT de la firma', async () => {
    confirmMock.confirm.mockResolvedValue(true);
    repoMock.deleteEmpresa.mockReturnValue(of(undefined));

    await component.onEliminarEmpresa();

    expect(repoMock.deleteEmpresa).toHaveBeenCalledWith(900123456);
  });

  it('en éxito emite firmaDeleted(firma) y muestra toast de éxito', async () => {
    confirmMock.confirm.mockResolvedValue(true);
    repoMock.deleteEmpresa.mockReturnValue(of(undefined));

    const emitted: Firma[] = [];
    component.firmaDeleted.subscribe((f) => emitted.push(f));
    const messageMock = TestBed.inject(MessageService) as unknown as {
      add: ReturnType<typeof vi.fn>;
    };
    const messageSpy = vi.spyOn(messageMock, 'add');

    await component.onEliminarEmpresa();
    // Resolver el subscribe
    await new Promise((r) => setTimeout(r, 0));

    expect(emitted).toEqual([EDITING_FIRMA]);
    expect(messageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Empresa eliminada' }),
    );
  });

  it('en error NO emite firmaDeleted pero sí muestra toast de error', async () => {
    confirmMock.confirm.mockResolvedValue(true);
    const httpError = {
      status: 500,
      statusText: 'Internal Server Error',
      error: { error: 'DELETE_FAILED', message: 'DB error' },
    };
    repoMock.deleteEmpresa.mockReturnValue(throwError(() => httpError));

    const emitted: Firma[] = [];
    component.firmaDeleted.subscribe((f) => emitted.push(f));
    const messageMock = TestBed.inject(MessageService) as unknown as {
      add: ReturnType<typeof vi.fn>;
    };
    const messageSpy = vi.spyOn(messageMock, 'add');

    await component.onEliminarEmpresa();
    await new Promise((r) => setTimeout(r, 0));

    expect(emitted).toEqual([]);
    expect(messageSpy).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
    );
    expect(component.deleting()).toBe(false);
  });

  it('no hace nada si NO hay firma en edición (modo create)', async () => {
    fixture.componentRef.setInput('editingFirma', null);
    fixture.detectChanges();

    await component.onEliminarEmpresa();

    expect(confirmMock.confirm).not.toHaveBeenCalled();
    expect(repoMock.deleteEmpresa).not.toHaveBeenCalled();
  });

  it('no hace nada si la firma en edición NO tiene NIT (legacy sin terminar)', async () => {
    fixture.componentRef.setInput('editingFirma', { ...EDITING_FIRMA, nit: null });
    fixture.detectChanges();

    await component.onEliminarEmpresa();

    expect(confirmMock.confirm).not.toHaveBeenCalled();
    expect(repoMock.deleteEmpresa).not.toHaveBeenCalled();
  });
});

/**
 * WU-8 / REQ-UPDATE-SCHEMA-001 — Regression lock on `UpdateEmpresaSchema`.
 *
 * El schema se usa para validar payloads de PATCH /api/empresas/:nit
 * (modo edición del dialog). Si alguien debilita el schema por accidente
 * (ej: haciendo campos `.optional()` o quitando `.positive()`), el dialog
 * enviaría payloads corruptos al backend. Este test fija la valla:
 * un objeto VACÍO debe ser rechazado, con errores específicos para
 * `id_rep_legal`. `nit` NO está en el schema porque el NIT viene del
 * route parameter (ver comentario en `crear-empresa.schema.ts`).
 */
describe('UpdateEmpresaSchema (WU-8 regression)', () => {
  it('rechaza payload vacío con errores en id_rep_legal', () => {
    const result = UpdateEmpresaSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const flat = result.error.flatten();
      expect(flat.fieldErrors.id_rep_legal).toBeDefined();
      expect(flat.fieldErrors.nit).toBeUndefined();
    }
  });
});

// --- Helpers rxjs (importados al final para no interferir con los mocks) ---
import { of, throwError } from 'rxjs';
