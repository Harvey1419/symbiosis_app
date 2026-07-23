import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { FirmaClientesComponent } from './firma-clientes.component';
import { FirmaRepository, type Firma } from '@data/repositories/firma.repository';
import { ClienteRepository } from '@data/repositories/cliente.repository';
import type { Cliente } from '@domain/models/cliente.model';
import { ClienteConfigDialogService } from '@app/core/cliente-config-dialog.service';

type DialogMock = {
  openForEdit: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  visible: () => boolean;
  editingCliente: () => Cliente | null;
};

describe('FirmaClientesComponent', () => {
  let component: FirmaClientesComponent;
  let firmaMock: {
    getFirmas: ReturnType<typeof vi.fn>;
    getFirmaClientes: ReturnType<typeof vi.fn>;
  };
  let clienteMock: {
    sincronizarTrazabilidad: ReturnType<typeof vi.fn>;
    sincronizarEmpresas: ReturnType<typeof vi.fn>;
    updateCliente: ReturnType<typeof vi.fn>;
  };
  let dialogMock: DialogMock;
  let routerMock: {
    navigate: ReturnType<typeof vi.fn>;
    events: ReturnType<typeof of>;
  };

  const firma: Firma = {
    id: 'firma-123',
    firma_user: 'firma@example.com',
    tipo_siigo: 'contador',
    nit: 900123456,
    last_token: null,
    nombre: 'Firma Alpha',
  };
  const clientes: Cliente[] = [
    {
      nit: 900123456,
      firma_id: 'firma-123',
      empresas: {
        nit: 900123456,
        nombre_empresa: 'Cliente Beta',
        tipo_persona: 'juridica',
      },
    },
  ];

  beforeEach(() => {
    firmaMock = {
      getFirmas: vi.fn().mockReturnValue(of([])),
      getFirmaClientes: vi.fn().mockReturnValue(of([])),
    };
    clienteMock = {
      sincronizarTrazabilidad: vi.fn().mockReturnValue(of(undefined)),
      sincronizarEmpresas: vi.fn().mockReturnValue(of({ success: true, registros: 1 })),
      updateCliente: vi.fn().mockReturnValue(of(undefined)),
    };
    dialogMock = {
      openForEdit: vi.fn(),
      close: vi.fn(),
      visible: signal(false),
      editingCliente: signal<Cliente | null>(null),
    };
    routerMock = { navigate: vi.fn(), events: of() };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [FirmaClientesComponent],
      providers: [
        provideAnimations(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'firma-123' : null),
              },
            },
          },
        },
        { provide: FirmaRepository, useValue: firmaMock },
        { provide: ClienteRepository, useValue: clienteMock },
        { provide: ClienteConfigDialogService, useValue: dialogMock },
        { provide: Router, useValue: routerMock },
        MessageService,
      ],
    });
    component = TestBed.createComponent(FirmaClientesComponent).componentInstance;
  });

  it('ngOnInit reads the id param and triggers loadClientes and loadFirmaNombre', () => {
    firmaMock.getFirmas.mockReturnValue(of([firma]));

    component.ngOnInit();

    expect(component.firmaId()).toBe('firma-123');
    expect(firmaMock.getFirmaClientes).toHaveBeenCalledWith('firma-123');
    expect(firmaMock.getFirmas).toHaveBeenCalledTimes(1);
  });

  it('loadClientes populates clientes and sets loading to false', () => {
    firmaMock.getFirmaClientes.mockReturnValue(of(clientes));

    component.loadClientes('firma-123');

    expect(component.clientes()).toEqual(clientes);
    expect(component.loading()).toBe(false);
  });

  it('loadClientes sets error to true when the repository fails', () => {
    firmaMock.getFirmaClientes.mockReturnValue(throwError(() => new Error('Request failed')));

    component.loadClientes('firma-123');

    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('loadFirmaNombre resolves the firma name from FirmaRepository.getFirmas', () => {
    firmaMock.getFirmas.mockReturnValue(of([firma]));

    component.ngOnInit();

    expect(component.firmaNombre()).toBe('Firma Alpha');
  });

  it('breadcrumbItems contains one item without a firma name and two with a firma name', () => {
    expect(component.breadcrumbItems()).toHaveLength(1);

    component.firmaNombre.set('Firma Alpha');

    expect(component.breadcrumbItems()).toHaveLength(2);
    expect(component.breadcrumbItems()[1].label).toBe('Firma Alpha');
  });

  it('goToClienteDetail navigates with the client and firma context in state', () => {
    component.firmaId.set('firma-123');
    component.firmaNombre.set('Firma Alpha');

    component.goToClienteDetail(900123456, 'Cliente Beta');

    expect(routerMock.navigate).toHaveBeenCalledWith(['/clientes', 900123456], {
      state: {
        clienteNombre: 'Cliente Beta',
        firmaId: 'firma-123',
        firmaNombre: 'Firma Alpha',
        tipoSiigo: 'contador',
      },
    });
  });

  it('onConfigurarCliente opens the dialog for the selected client', () => {
    component.onConfigurarCliente(clientes[0]);

    expect(dialogMock.openForEdit).toHaveBeenCalledWith(clientes[0]);
  });

  describe('onSync (Siigo empresa sync per UI level)', () => {
    it('ngOnInit loads the firma so its NIT is available to onSync', () => {
      firmaMock.getFirmas.mockReturnValue(of([firma]));

      component.ngOnInit();

      expect(component.firma()).toEqual(firma);
      expect(component.firma()?.nit).toBe(900123456);
    });

    it('onSync calls clienteRepo.sincronizarEmpresas with the firma NIT (NOT trazabilidad)', () => {
      firmaMock.getFirmas.mockReturnValue(of([firma]));
      component.ngOnInit();

      component.onSync();

      expect(clienteMock.sincronizarEmpresas).toHaveBeenCalledOnce();
      expect(clienteMock.sincronizarEmpresas).toHaveBeenCalledWith(900123456);
      expect(clienteMock.sincronizarTrazabilidad).not.toHaveBeenCalled();
    });

    it('onSync sets syncLoading false and lastSync after a successful empresa sync, then reloads the clientes', () => {
      firmaMock.getFirmas.mockReturnValue(of([firma]));
      firmaMock.getFirmaClientes.mockReturnValue(of(clientes));
      component.ngOnInit();

      component.onSync();

      expect(component.syncLoading()).toBe(false);
      expect(component.lastSync()).toBeInstanceOf(Date);
      expect(firmaMock.getFirmaClientes).toHaveBeenCalledTimes(2); // ngOnInit + post-sync reload
    });

    it('onSync bails without calling the repository when the firma has no NIT', () => {
      const firmaSinNit: Firma = { ...firma, nit: null };
      firmaMock.getFirmas.mockReturnValue(of([firmaSinNit]));
      component.ngOnInit();

      component.onSync();

      expect(clienteMock.sincronizarEmpresas).not.toHaveBeenCalled();
      expect(clienteMock.sincronizarTrazabilidad).not.toHaveBeenCalled();
      expect(component.syncLoading()).toBe(false);
      expect(component.lastSync()).toBeNull();
    });

    it('onSync clears syncLoading when the repository fails', () => {
      firmaMock.getFirmas.mockReturnValue(of([firma]));
      clienteMock.sincronizarEmpresas.mockReturnValue(throwError(() => new Error('boom')));
      component.ngOnInit();

      component.onSync();

      expect(component.syncLoading()).toBe(false);
      expect(component.lastSync()).toBeNull();
    });
  });
});

describe('FirmaClientesComponent - Sync Card (descriptive UI)', () => {
  let component: FirmaClientesComponent;
  let fixture: import('@angular/core/testing').ComponentFixture<FirmaClientesComponent>;
  let firmaMock: { getFirmas: ReturnType<typeof vi.fn>; getFirmaClientes: ReturnType<typeof vi.fn> };
  let clienteMock: {
    sincronizarTrazabilidad: ReturnType<typeof vi.fn>;
    sincronizarEmpresas: ReturnType<typeof vi.fn>;
    updateCliente: ReturnType<typeof vi.fn>;
  };
  let dialogMock: DialogMock;

  const firma: Firma = {
    id: 'firma-123',
    firma_user: 'firma@example.com',
    tipo_siigo: 'contador',
    nit: 900123456,
    last_token: null,
    nombre: 'Firma Alpha',
  };

  beforeEach(async () => {
    firmaMock = {
      getFirmas: vi.fn().mockReturnValue(of([firma])),
      getFirmaClientes: vi.fn().mockReturnValue(of([])),
    };
    clienteMock = {
      sincronizarTrazabilidad: vi.fn().mockReturnValue(of(undefined)),
      sincronizarEmpresas: vi.fn().mockReturnValue(of({ success: true, registros: 1 })),
      updateCliente: vi.fn().mockReturnValue(of(undefined)),
    };
    dialogMock = {
      openForEdit: vi.fn(),
      close: vi.fn(),
      visible: signal(false),
      editingCliente: signal<Cliente | null>(null),
    };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [FirmaClientesComponent],
      providers: [
        provideAnimations(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: (key: string) => (key === 'id' ? 'firma-123' : null) } },
          },
        },
        { provide: FirmaRepository, useValue: firmaMock },
        { provide: ClienteRepository, useValue: clienteMock },
        { provide: ClienteConfigDialogService, useValue: dialogMock },
        { provide: Router, useValue: { navigate: vi.fn(), events: of() } },
        MessageService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FirmaClientesComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('renders a sync card with the Siigo variant, NOT the compact pill', () => {
    const card = fixture.nativeElement.querySelector('.sync-card.sync-card-siigo') as HTMLElement | null;
    expect(card).not.toBeNull();

    const pillEl = fixture.nativeElement.querySelector('app-sync-status-pill');
    expect(pillEl).toBeNull();
  });

  it('does NOT render SyncStatusPillComponent at all (replaced by the card)', () => {
    // Real assertion: there should be no <app-sync-status-pill> in the DOM.
    expect(fixture.nativeElement.querySelector('app-sync-status-pill')).toBeNull();
  });

  it('sync card includes the title and description that explain what it does', () => {
    const card = fixture.nativeElement.querySelector('.sync-card.sync-card-siigo') as HTMLElement;
    const title = card.querySelector('.card-title')?.textContent ?? '';
    const description = card.querySelector('.card-description')?.textContent ?? '';

    expect(title).toContain('Siigo');
    expect(description.toLowerCase()).toContain('empresas');
  });

  it('sync card has a button labeled "Sincronizar" that is enabled when not loading', () => {
    const button = fixture.nativeElement.querySelector('.sync-card button') as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    expect(button?.textContent ?? '').toContain('Sincronizar');
    expect(button?.disabled).toBe(false);
  });

  it('sync card button is disabled while loading', () => {
    // Drive the loading state directly via the public signal — we test the
    // template binding, not the internal subscribe lifecycle.
    component.syncLoading.set(true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.sync-card button') as HTMLButtonElement | null;
    expect(button).not.toBeNull();
    expect(button?.disabled).toBe(true);
  });

  it('shows the last-sync timestamp after a successful sync', () => {
    component.lastSync.set(new Date('2026-07-23T10:00:00Z'));
    fixture.detectChanges();

    const lastSync = fixture.nativeElement.querySelector('.last-sync') as HTMLElement | null;
    expect(lastSync).not.toBeNull();
    expect(lastSync?.textContent ?? '').toMatch(/Última sincronización/);
  });
});
