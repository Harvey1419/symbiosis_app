import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly _token = signal<string | null>(localStorage.getItem('auth_token'));
  readonly token = this._token.asReadonly();

  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
    this._token.set(token);
  }

  clearToken(): void {
    localStorage.removeItem('auth_token');
    this._token.set(null);
  }

  isAuthenticated(): boolean {
    return !!this._token();
  }
}