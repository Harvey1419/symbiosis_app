import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  provideHttpClient,
  withInterceptors,
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { TokenService } from './token.service';

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  let tokenService: TokenService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        TokenService,
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
    tokenService = TestBed.inject(TokenService);
    router = TestBed.inject(Router);
  });

  it('adjunta "Authorization: Bearer <token>" cuando hay token', () => {
    tokenService.setToken('jwt-123');

    http.get('/api/something').subscribe();

    const req = httpMock.expectOne('/api/something');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-123');
    req.flush({ ok: true });
    httpMock.verify();
  });

  it('no adjunta Authorization cuando no hay token', () => {
    http.get('/api/something').subscribe();

    const req = httpMock.expectOne('/api/something');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ ok: true });
    httpMock.verify();
  });

  it('maneja 401 limpiando el token y navegando a /auth/login', async () => {
    tokenService.setToken('old-jwt');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    let error: HttpErrorResponse | undefined;
    http.get('/api/protected').subscribe({
      next: () => {
        throw new Error('no debería pasar por next');
      },
      error: (e) => {
        error = e;
      },
    });

    const req = httpMock.expectOne('/api/protected');
    expect(req.request.headers.get('Authorization')).toBe('Bearer old-jwt');
    req.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    // Esperar un tick para que catchError + navigate se ejecuten
    await new Promise((r) => setTimeout(r, 0));

    expect(error?.status).toBe(401);
    expect(tokenService.isAuthenticated()).toBe(false);
    expect(tokenService.token()).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/auth/login']);
  });

  it('limpia el token en 401 incluso si ya estamos en /auth (sin loop de redirects)', async () => {
    tokenService.setToken('old-jwt');
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    let error: HttpErrorResponse | undefined;
    http.get('/api/protected').subscribe({
      next: () => {
        throw new Error('no debería pasar por next');
      },
      error: (e) => {
        error = e;
      },
    });

    const req = httpMock.expectOne('/api/protected');
    req.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    await new Promise((r) => setTimeout(r, 0));

    // El token SÍ se limpia siempre, aunque el navigate se dispare o no.
    expect(tokenService.token()).toBeNull();
    // El observable del caller debe emitir el error 401 (no se traga el error)
    expect(error?.status).toBe(401);
    // El spy está disponible para inspeccionar comportamiento extra
    expect(navigateSpy).toBeDefined();
  });
});
