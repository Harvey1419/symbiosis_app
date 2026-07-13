import { Injectable, signal } from '@angular/core';
import { Usuario } from '@domain/models/usuario.model';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly _token = signal<string | null>(localStorage.getItem('auth_token'));
  private readonly _usuario = signal<Usuario | null>(
    JSON.parse(localStorage.getItem('auth_usuario') ?? 'null') as Usuario | null,
  );
  readonly token = this._token.asReadonly();
  readonly usuario = this._usuario.asReadonly();

  isAuthenticated(): boolean {
    return !!this._token();
  }

  /** Persiste token + usuario tras login. Limpia el estado previo primero. */
  setAuth({ token, usuario }: { token: string; usuario: Usuario }): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_usuario', JSON.stringify(usuario));
    this._token.set(token);
    this._usuario.set(usuario);
  }

  /** Backward compat: persiste solo el token (p. ej. fixtures de test). */
  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
    this._token.set(token);
  }

  /** Limpia token + usuario de localStorage y de los signals. */
  clearAuth(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_usuario');
    this._token.set(null);
    this._usuario.set(null);
  }

  /** Backward compat: delega en clearAuth() para limpiar todo el estado de auth. */
  clearToken(): void {
    this.clearAuth();
  }
}
