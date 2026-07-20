import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthRepository } from '@data/repositories/auth.repository';
import { TokenService } from '@core/token.service';
import { FirmaRepository, Firma } from '@data/repositories/firma.repository';
import { CrearEmpresaDialogService } from '@core/crear-empresa-dialog.service';

/**
 * Verifica el contrato del flujo post-login del LoginComponent:
 *
 *   - 0 firmas                     → navega a /clientes + abre modal crear-empresa
 *   - ≥1 firma nube                → navega a /facturas
 *   - solo firmas contador         → navega a /clientes
 *   - mixto (nube + contador)      → navega a /facturas (nube tiene prioridad)
 *
 * La función pura `resolvePostLoginRoute` ya está cubierta en su propio
 * spec; aquí verificamos que el componente la invoca y orquesta los
 * side-effects (Router.navigateByUrl, CrearEmpresaDialogService.open).
 */
describe('LoginComponent post-login redirect', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let authMock: { login: ReturnType<typeof vi.fn> };
  let firmaMock: { getFirmas: ReturnType<typeof vi.fn> };
  let dialogMock: { open: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };
  let routerNavSpy: ReturnType<typeof vi.spyOn>;
  let tokenSetSpy: ReturnType<typeof vi.spyOn>;

  const AUTH_RESPONSE = {
    token: 'jwt.fake.token',
    usuario: { id: 'u-1', email: 'a@b.com', nombre: 'Ada Lovelace' },
  };

  const NUBE_FIRMA: Firma = {
    id: 'f-nube',
    firma_user: 'nube@empresa.com',
    tipo_siigo: 'nube',
    nit: 900123456,
    last_token: null,
  };
  const CONTADOR_FIRMA: Firma = {
    id: 'f-contador',
    firma_user: 'c@empresa.com',
    tipo_siigo: 'contador',
    nit: 800111222,
    last_token: null,
  };

  beforeEach(() => {
    authMock = { login: vi.fn() };
    firmaMock = { getFirmas: vi.fn() };
    dialogMock = { open: vi.fn(), close: vi.fn() };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthRepository, useValue: authMock },
        { provide: FirmaRepository, useValue: firmaMock },
        { provide: CrearEmpresaDialogService, useValue: dialogMock },
      ],
    });

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    routerNavSpy = vi.spyOn(component['router'], 'navigateByUrl');
    tokenSetSpy = vi.spyOn(TestBed.inject(TokenService), 'setAuth');
  });

  it('login OK con 0 firmas: navega a /clientes + abre modal crear-empresa', async () => {
    authMock.login.mockReturnValue(of(AUTH_RESPONSE));
    firmaMock.getFirmas.mockReturnValue(of([]));

    component.credentials = { email: 'a@b.com', password: 'pw' };
    component.onSubmit();

    // El login HTTP y el getFirmas se disparan dentro del subscribe chain.
    // Esperamos a que ambas microtasks se resuelvan.
    await new Promise((r) => setTimeout(r, 0));

    expect(authMock.login).toHaveBeenCalledTimes(1);
    expect(firmaMock.getFirmas).toHaveBeenCalledTimes(1);
    expect(tokenSetSpy).toHaveBeenCalledWith(AUTH_RESPONSE);
    expect(routerNavSpy).toHaveBeenCalledWith('/clientes');
    expect(dialogMock.open).toHaveBeenCalledTimes(1);
  });

  it('login OK con firma nube: navega a /facturas (no abre modal)', async () => {
    authMock.login.mockReturnValue(of(AUTH_RESPONSE));
    firmaMock.getFirmas.mockReturnValue(of([NUBE_FIRMA]));

    component.credentials = { email: 'a@b.com', password: 'pw' };
    component.onSubmit();

    await new Promise((r) => setTimeout(r, 0));

    expect(routerNavSpy).toHaveBeenCalledWith('/facturas');
    expect(dialogMock.open).not.toHaveBeenCalled();
  });

  it('login OK con firma contador: navega a /clientes (no abre modal)', async () => {
    authMock.login.mockReturnValue(of(AUTH_RESPONSE));
    firmaMock.getFirmas.mockReturnValue(of([CONTADOR_FIRMA]));

    component.credentials = { email: 'a@b.com', password: 'pw' };
    component.onSubmit();

    await new Promise((r) => setTimeout(r, 0));

    expect(routerNavSpy).toHaveBeenCalledWith('/clientes');
    expect(dialogMock.open).not.toHaveBeenCalled();
  });

  it('login OK con mixto nube+contador: navega a /facturas (nube prioridad)', async () => {
    authMock.login.mockReturnValue(of(AUTH_RESPONSE));
    firmaMock.getFirmas.mockReturnValue(of([CONTADOR_FIRMA, NUBE_FIRMA]));

    component.credentials = { email: 'a@b.com', password: 'pw' };
    component.onSubmit();

    await new Promise((r) => setTimeout(r, 0));

    expect(routerNavSpy).toHaveBeenCalledWith('/facturas');
    expect(dialogMock.open).not.toHaveBeenCalled();
  });

  it('login falla: setea errorMsg, no navega, no abre modal', async () => {
    authMock.login.mockReturnValue(
      throwError(() => ({ error: { error: 'Credenciales inválidas' } }))
    );

    component.credentials = { email: 'a@b.com', password: 'wrong' };
    component.onSubmit();

    await new Promise((r) => setTimeout(r, 0));

    expect(component.errorMsg()).toBe('Credenciales inválidas');
    expect(routerNavSpy).not.toHaveBeenCalled();
    expect(dialogMock.open).not.toHaveBeenCalled();
    expect(firmaMock.getFirmas).not.toHaveBeenCalled();
  });
});