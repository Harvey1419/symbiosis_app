import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { NEVER, of, throwError } from 'rxjs';
import { SyncSiigoCompletoButtonComponent, type SiigoSyncResult } from './sync-siigo-completo-button.component';
import { ClienteRepository } from '@data/repositories/cliente.repository';

describe('SyncSiigoCompletoButtonComponent', () => {
  let fixture: ComponentFixture<SyncSiigoCompletoButtonComponent>;
  let component: SyncSiigoCompletoButtonComponent;
  let mockRepo: {
    sincronizarProveedores: ReturnType<typeof vi.fn>;
    sincronizarEmpresas: ReturnType<typeof vi.fn>;
    sincronizarPuc: ReturnType<typeof vi.fn>;
    sincronizarTaxes: ReturnType<typeof vi.fn>;
    sincronizarTrazabilidad: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    TestBed.resetTestingModule();
    mockRepo = {
      sincronizarProveedores: vi.fn(),
      sincronizarEmpresas: vi.fn(),
      sincronizarPuc: vi.fn(),
      sincronizarTaxes: vi.fn(),
      sincronizarTrazabilidad: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [SyncSiigoCompletoButtonComponent],
      providers: [
        provideAnimations(),
        { provide: ClienteRepository, useValue: mockRepo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SyncSiigoCompletoButtonComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('nit', 900123456);
    fixture.detectChanges();
  });

  function allSucceed(): void {
    mockRepo.sincronizarProveedores.mockReturnValue(of({ success: true, registros: 5 }));
    mockRepo.sincronizarPuc.mockReturnValue(of({ success: true, registros: 220 }));
    mockRepo.sincronizarTaxes.mockReturnValue(of({ success: true, registros: 7 }));
    mockRepo.sincronizarTrazabilidad.mockReturnValue(of({ success: true, registros: 42 }));
  }

  it('al hacer click llama los 4 métodos del repository con el nit del input (NO incluye empresas)', () => {
    allSucceed();
    const synced = vi.fn();
    component.synced.subscribe(synced);

    component.sync();

    expect(mockRepo.sincronizarProveedores).toHaveBeenCalledWith(900123456);
    expect(mockRepo.sincronizarPuc).toHaveBeenCalledWith(900123456);
    expect(mockRepo.sincronizarTaxes).toHaveBeenCalledWith(900123456);
    expect(mockRepo.sincronizarTrazabilidad).toHaveBeenCalledWith(900123456);
  });

  it('NO llama sincronizarEmpresas — el sync de empresas es per-firma, no per-cliente', () => {
    allSucceed();

    component.sync();

    expect(mockRepo.sincronizarEmpresas).not.toHaveBeenCalled();
  });

  it('cuando TODOS los 4 sync succeed → synced.emit(results) fires AND justSynced signal becomes true', () => {
    allSucceed();
    const synced = vi.fn();
    const partialSuccess = vi.fn();
    component.synced.subscribe(synced);
    component.partialSuccess.subscribe(partialSuccess);

    component.sync();
    fixture.detectChanges();

    expect(synced).toHaveBeenCalledTimes(1);
    expect(partialSuccess).not.toHaveBeenCalled();
    const results = synced.mock.calls[0][0] as SiigoSyncResult[];
    expect(results).toHaveLength(4);
    expect(results.map((r) => r.source).sort()).toEqual(['proveedores', 'puc', 'taxes', 'trazabilidad']);
    expect(results.every((r) => r.success)).toBe(true);
    expect(component.justSynced()).toBe(true);
    expect(component.partialFailed()).toBe(false);
    expect(component.hasError()).toBe(false);
  });

  it('cuando ALGUNOS succeed y ALGUNOS fallan → partialSuccess.emit(results) fires AND partialFailed signal becomes true', () => {
    mockRepo.sincronizarProveedores.mockReturnValue(of({ success: true, registros: 5 }));
    mockRepo.sincronizarPuc.mockReturnValue(throwError(() => new Error('puc failed')));
    mockRepo.sincronizarTaxes.mockReturnValue(of({ success: true, registros: 7 }));
    mockRepo.sincronizarTrazabilidad.mockReturnValue(throwError(() => new Error('trazabilidad failed')));

    const synced = vi.fn();
    const partialSuccess = vi.fn();
    component.synced.subscribe(synced);
    component.partialSuccess.subscribe(partialSuccess);

    component.sync();
    fixture.detectChanges();

    expect(partialSuccess).toHaveBeenCalledTimes(1);
    expect(synced).not.toHaveBeenCalled();
    const results = partialSuccess.mock.calls[0][0] as SiigoSyncResult[];
    expect(results).toHaveLength(4);
    expect(results.find((r) => r.source === 'proveedores')?.success).toBe(true);
    expect(results.find((r) => r.source === 'puc')?.success).toBe(false);
    expect(component.partialFailed()).toBe(true);
    expect(component.justSynced()).toBe(false);
    expect(component.hasError()).toBe(false);
  });

  it('cuando TODOS los 4 fallan → ni synced ni partialSuccess emiten AND hasError signal becomes true', () => {
    mockRepo.sincronizarProveedores.mockReturnValue(throwError(() => new Error('fail 1')));
    mockRepo.sincronizarPuc.mockReturnValue(throwError(() => new Error('fail 2')));
    mockRepo.sincronizarTaxes.mockReturnValue(throwError(() => new Error('fail 3')));
    mockRepo.sincronizarTrazabilidad.mockReturnValue(throwError(() => new Error('fail 4')));

    const synced = vi.fn();
    const partialSuccess = vi.fn();
    component.synced.subscribe(synced);
    component.partialSuccess.subscribe(partialSuccess);

    component.sync();
    fixture.detectChanges();

    expect(synced).not.toHaveBeenCalled();
    expect(partialSuccess).not.toHaveBeenCalled();
    expect(component.hasError()).toBe(true);
    expect(component.justSynced()).toBe(false);
    expect(component.partialFailed()).toBe(false);
  });

  it('mientras loading() es true, el button tiene el atributo [disabled]', () => {
    // NEVER no emite ni completa → forkJoin espera indefinidamente → loading queda true.
    mockRepo.sincronizarProveedores.mockReturnValue(NEVER);
    mockRepo.sincronizarPuc.mockReturnValue(NEVER);
    mockRepo.sincronizarTaxes.mockReturnValue(NEVER);
    mockRepo.sincronizarTrazabilidad.mockReturnValue(NEVER);

    component.sync();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);
  });
});