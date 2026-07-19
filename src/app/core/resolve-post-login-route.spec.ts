import { describe, it, expect } from 'vitest';
import { resolvePostLoginRoute } from './resolve-post-login-route';
import type { Firma } from '@data/repositories/firma.repository';

/**
 * resolvePostLoginRoute es una función PURA — sin DI, sin Router, sin
 * TestBed. Recibe las firmas del usuario y devuelve la ruta post-login.
 *
 * Contrato (per spec `onboarding-redirect`):
 *   - 0 firmas (primera vez)     -> { modal: 'crear-empresa' }
 *   - ≥1 firma tipo_siigo='nube' -> '/facturas'  (prioriza nube sobre contador)
 *   - solo firmas 'contador'     -> '/dashboard'
 *
 * El orden del array no importa — se evalúa por `some()` y `every()`.
 */

function makeFirma(tipo_siigo: 'nube' | 'contador', nit = 900123456): Firma {
  return {
    id: `f-${tipo_siigo}-${nit}`,
    firma_user: `${tipo_siigo}@empresa.com`,
    tipo_siigo,
    nit,
    last_token: null,
  };
}

describe('resolvePostLoginRoute (pure function)', () => {
  it('array vacío (primera vez) → { modal: "crear-empresa" }', () => {
    const route = resolvePostLoginRoute([]);
    expect(route).toEqual({ modal: 'crear-empresa' });
  });

  it('una firma nube → "/facturas"', () => {
    const route = resolvePostLoginRoute([makeFirma('nube')]);
    expect(route).toBe('/facturas');
  });

  it('una firma contador → "/dashboard"', () => {
    const route = resolvePostLoginRoute([makeFirma('contador')]);
    expect(route).toBe('/dashboard');
  });

  it('mixto nube + contador → "/facturas" (nube tiene prioridad)', () => {
    const route = resolvePostLoginRoute([
      makeFirma('contador', 111),
      makeFirma('nube', 222),
    ]);
    expect(route).toBe('/facturas');
  });

  it('mixto con nube primero en el array → "/facturas"', () => {
    const route = resolvePostLoginRoute([
      makeFirma('nube', 111),
      makeFirma('contador', 222),
    ]);
    expect(route).toBe('/facturas');
  });

  it('múltiples firmas contador → "/dashboard"', () => {
    const route = resolvePostLoginRoute([
      makeFirma('contador', 111),
      makeFirma('contador', 222),
      makeFirma('contador', 333),
    ]);
    expect(route).toBe('/dashboard');
  });

  it('múltiples firmas nube → "/facturas"', () => {
    const route = resolvePostLoginRoute([
      makeFirma('nube', 111),
      makeFirma('nube', 222),
    ]);
    expect(route).toBe('/facturas');
  });

  it('devuelve una ruta por referencia de tipo PostLoginRoute', () => {
    // Type-narrowing test: la función discrimina correctamente entre los
    // tres miembros del union (string route | modal object).
    const modalRoute = resolvePostLoginRoute([]);
    const stringRoute = resolvePostLoginRoute([makeFirma('nube')]);

    expect(typeof modalRoute).toBe('object');
    expect(typeof stringRoute).toBe('string');
  });
});