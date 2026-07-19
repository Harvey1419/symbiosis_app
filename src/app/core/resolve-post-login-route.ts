import type { Firma } from '@data/repositories/firma.repository';

/**
 * Tipo del retorno de `resolvePostLoginRoute`.
 *
 *   - string: navegar directo a esa ruta (`/facturas` o `/dashboard`)
 *   - object: NO navegar, abrir el modal indicado (sin firmas → primera vez)
 */
export type PostLoginRoute = '/facturas' | '/dashboard' | { modal: 'crear-empresa' };

/**
 * Función PURA que decide la ruta post-login según las firmas del usuario.
 *
 * Contrato (per spec `onboarding-redirect`):
 *   - 0 firmas (primera vez)            → { modal: 'crear-empresa' }
 *   - ≥1 firma con `tipo_siigo='nube'`  → '/facturas'   (nube tiene prioridad)
 *   - solo firmas con `tipo_siigo='contador'` → '/dashboard'
 *
 * Es pura y libre de DI para que sea trivialmente testeable con Vitest —
 * sin TestBed, sin Router mock, sin async. El llamador (LoginComponent)
 * recibe la decisión y orquesta `Router.navigateByUrl(...)` +
 * `CrearEmpresaDialogService.open()` según corresponda.
 *
 * Si en el futuro hace falta más lógica (e.g. tipo_siigo por usuario, no por
 * firma), el contrato se mantiene: misma firma `(firmas: Firma[]) => PostLoginRoute`.
 */
export function resolvePostLoginRoute(firmas: Firma[]): PostLoginRoute {
  if (firmas.length === 0) {
    return { modal: 'crear-empresa' };
  }

  const hasNube = firmas.some((f) => f.tipo_siigo === 'nube');
  return hasNube ? '/facturas' : '/dashboard';
}