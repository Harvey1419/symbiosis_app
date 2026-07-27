import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
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
    sincronizarEmpresasByUser: ReturnType<typeof vi.fn>;
  };
  let clienteMock: {
    sincronizarTrazabilidad: ReturnType<typeof vi.fn>;
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
      sincronizarEmpresasByUser: vi
        .fn()
        .mockReturnValue(of({ success: true, count: 1, newCount: 0, newItems: [] })),
    };
    clienteMock = {
      sincronizarTrazabilidad: vi.fn().mockReturnValue(of(undefined)),
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

  it('goToClienteDetail navigates with the client and firma context in state (incluye firmaUser para deep-link)', () => {
    component.firmaId.set('firma-123');
    component.firmaNombre.set('Firma Alpha');
    component.firma.set(firma);

    component.goToClienteDetail(900123456, 'Cliente Beta');

    expect(routerMock.navigate).toHaveBeenCalledWith(['/clientes', 900123456], {
      state: {
        clienteNombre: 'Cliente Beta',
        firmaId: 'firma-123',
        firmaNombre: 'Firma Alpha',
        firmaUser: 'firma@example.com',
        tipoSiigo: 'contador',
      },
    });
  });

  it('goToClienteDetail sin firmaUser en state cuando no hay firma cargada (no rompe navegación)', () => {
    component.firmaId.set('firma-123');
    component.firmaNombre.set('Firma Alpha');
    component.firma.set(null);

    component.goToClienteDetail(900123456, 'Cliente Beta');

    const state = (routerMock.navigate.mock.calls[0]?.[1] as { state?: Record<string, unknown> })?.state;
    expect(state).toBeDefined();
    expect(state?.['firmaUser']).toBe('');
  });

  it('onConfigurarCliente opens the dialog for the selected client', () => {
    component.onConfigurarCliente(clientes[0]);

    expect(dialogMock.openForEdit).toHaveBeenCalledWith(clientes[0]);
  });

  it('onSyncCompleted recarga la lista de clientes', () => {
    component.firmaId.set('firma-123');

    component.onSyncCompleted();

    expect(firmaMock.getFirmaClientes).toHaveBeenCalledWith('firma-123');
  });
});

describe('FirmaClientesComponent — SincronizarSiigoCard integration (PR-B fix)', () => {
  let fixture: ComponentFixture<FirmaClientesComponent>;
  let component: FirmaClientesComponent;
  let firmaMock: {
    getFirmas: ReturnType<typeof vi.fn>;
    getFirmaClientes: ReturnType<typeof vi.fn>;
    sincronizarEmpresasByUser: ReturnType<typeof vi.fn>;
  };
  let clienteMock: {
    sincronizarTrazabilidad: ReturnType<typeof vi.fn>;
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
      sincronizarEmpresasByUser: vi
        .fn()
        .mockReturnValue(of({ success: true, count: 2, newCount: 1, newItems: [{ nit: 800111 }] })),
    };
    clienteMock = {
      sincronizarTrazabilidad: vi.fn().mockReturnValue(of(undefined)),
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

  it('renders the shared SincronizarSiigoCardComponent', () => {
    const card = fixture.nativeElement.querySelector('app-sincronizar-siigo-card');
    expect(card).not.toBeNull();
  });

  it('la clase .sync-card.sync-card-siigo está dentro del subcomponente, no inline en el template', () => {
    // El card viejo estaba escrito literal en este template (sync-card
    // como hijo directo de content-card). Ahora es un subcomponente, así
    // que cualquier `.sync-card` debe estar DENTRO de
    // `<app-sincronizar-siigo-card>` y no en el template directo.
    const directCard = fixture.nativeElement.querySelector(
      '.content-card > .sync-card.sync-card-siigo',
    );
    expect(directCard).toBeNull();

    // El subcomponente sí tiene la clase internamente.
    const wrappedCard = fixture.nativeElement.querySelector(
      'app-sincronizar-siigo-card .sync-card.sync-card-siigo',
    );
    expect(wrappedCard).not.toBeNull();
  });

  it('clicking the card button calls FirmaRepository.sincronizarEmpresasByUser (NO clienteRepo.sincronizarEmpresas)', () => {
    const btn = fixture.nativeElement.querySelector(
      'app-sincronizar-siigo-card [data-testid="sincronizar-siigo-card-btn"] button',
    ) as HTMLButtonElement | null;
    expect(btn).not.toBeNull();

    btn?.click();
    fixture.detectChanges();

    expect(firmaMock.sincronizarEmpresasByUser).toHaveBeenCalledWith('firma@example.com');
  });
});
