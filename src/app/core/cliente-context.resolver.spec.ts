import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot } from '@angular/router';
import { of, firstValueFrom } from 'rxjs';
import { clienteContextResolver } from './cliente-context.resolver';
import { ClienteRepository, ClienteBreadcrumbContext } from '@data/repositories/cliente.repository';

import { provideRouter } from '@angular/router';

describe('clienteContextResolver', () => {
  let mockClienteRepo: { getBreadcrumbContext: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    TestBed.resetTestingModule();
    mockClienteRepo = {
      getBreadcrumbContext: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ClienteRepository, useValue: mockClienteRepo },
      ],
    });

    history.replaceState({}, '');
  });

  it('retorna null si el param nit no es numérico', async () => {
    const route = {
      paramMap: { get: () => 'invalid' },
    } as unknown as ActivatedRouteSnapshot;

    const result$ = TestBed.runInInjectionContext(() => clienteContextResolver(route, {} as never));
    const res = await firstValueFrom(result$ as any);
    expect(res).toBeNull();
    expect(mockClienteRepo.getBreadcrumbContext).not.toHaveBeenCalled();
  });

  it('fast-path: usa history.state si clienteNombre, firmaId y firmaNombre existen', async () => {
    history.replaceState({
      clienteNombre: 'Cliente Fast',
      firmaId: 'firma-123',
      firmaNombre: 'Firma Fast',
      tipoSiigo: 'contador',
    }, '');

    const route = {
      paramMap: { get: () => '900123456' },
    } as unknown as ActivatedRouteSnapshot;

    const result$ = TestBed.runInInjectionContext(() => clienteContextResolver(route, {} as never));
    const res = await firstValueFrom(result$ as any);
    expect(res).toEqual({
      nit: 900123456,
      nombre_empresa: 'Cliente Fast',
      firma_id: 'firma-123',
      firma_nombre: 'Firma Fast',
      tipo_siigo: 'contador',
    });
    expect(mockClienteRepo.getBreadcrumbContext).not.toHaveBeenCalled();
  });

  it('fast-path: se activa con clienteNombre aunque falte firmaNombre (map fallbacks)', async () => {
    history.replaceState({
      clienteNombre: 'Cliente Solo Nombre',
    }, '');

    const route = {
      paramMap: { get: () => '900123456' },
    } as unknown as ActivatedRouteSnapshot;

    const result$ = TestBed.runInInjectionContext(() => clienteContextResolver(route, {} as never));
    const res = await firstValueFrom(result$ as any);
    expect(res).toEqual({
      nit: 900123456,
      nombre_empresa: 'Cliente Solo Nombre',
      firma_id: '',
      firma_nombre: 'Cliente Solo Nombre',
      tipo_siigo: undefined,
    });
    expect(mockClienteRepo.getBreadcrumbContext).not.toHaveBeenCalled();
  });

  it('slow-path: consulta el repositorio si history.state está vacío (falta clienteNombre)', async () => {
    history.replaceState({}, '');
    const mockContext: ClienteBreadcrumbContext = {
      nit: 900123456,
      nombre_empresa: 'Cliente Slow',
      firma_id: 'firma-456',
      firma_nombre: 'Firma Nube',
      tipo_siigo: 'nube',
    };
    mockClienteRepo.getBreadcrumbContext.mockReturnValue(of(mockContext));

    const route = {
      paramMap: { get: () => '900123456' },
    } as unknown as ActivatedRouteSnapshot;

    const result$ = TestBed.runInInjectionContext(() => clienteContextResolver(route, {} as never));
    const res = await firstValueFrom(result$ as any);
    expect(res).toEqual(mockContext);
    expect(mockClienteRepo.getBreadcrumbContext).toHaveBeenCalledWith(900123456);
  });
});
