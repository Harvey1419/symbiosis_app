import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenService);
  });

  it('isAuthenticated devuelve false cuando no hay token', () => {
    expect(service.isAuthenticated()).toBe(false);
  });

  it('setAuth persiste token y usuario en localStorage y signals', () => {
    service.setAuth({ token: 'abc', usuario: { id: 'u1', email: 'a@b.c', nombre: 'Alice' } });

    expect(service.token()).toBe('abc');
    expect(service.usuario()?.nombre).toBe('Alice');
    expect(localStorage.getItem('auth_token')).toBe('abc');
    expect(JSON.parse(localStorage.getItem('auth_usuario') ?? '{}')).toEqual({
      id: 'u1',
      email: 'a@b.c',
      nombre: 'Alice',
    });
  });

  it('clearAuth elimina token y usuario de localStorage y signals', () => {
    service.setAuth({ token: 'abc', usuario: { id: 'u1', email: 'a@b.c', nombre: 'Alice' } });
    service.clearAuth();

    expect(service.token()).toBeNull();
    expect(service.usuario()).toBeNull();
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_usuario')).toBeNull();
  });

  it('clearToken delega en clearAuth (limpia tambien el usuario)', () => {
    service.setAuth({ token: 'abc', usuario: { id: 'u1', email: 'a@b.c', nombre: 'Alice' } });
    service.clearToken();

    expect(service.token()).toBeNull();
    expect(service.usuario()).toBeNull();
  });

  it('setToken (backward compat) persiste solo el token sin tocar usuario', () => {
    service.setToken('xyz');

    expect(service.token()).toBe('xyz');
    expect(service.usuario()).toBeNull();
    expect(localStorage.getItem('auth_token')).toBe('xyz');
  });

  it('isAuthenticated devuelve true cuando hay token', () => {
    service.setAuth({ token: 'abc', usuario: { id: 'u1', email: 'a@b.c', nombre: 'Alice' } });

    expect(service.isAuthenticated()).toBe(true);
  });
});
