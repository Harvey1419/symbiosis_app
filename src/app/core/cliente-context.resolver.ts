import { ResolveFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ClienteRepository, ClienteBreadcrumbContext } from '@data/repositories/cliente.repository';

/**
 * Shape del state forward que las páginas "source" pasan al navegar
 * (vía `Router.navigate([...], { state })`). Cuando el resolver corre
 * como fast-path, lee estos campos para evitar la llamada al backend.
 */
interface NavigationState {
  clienteNombre?: string;
  firmaId?: string;
  firmaNombre?: string;
  tipoSiigo?: 'nube' | 'contador';
  tipo_siigo?: 'nube' | 'contador';
}

/**
 * clienteContextResolver — Angular Resolver que se ejecuta ANTES de que
 * `ClienteDetailComponent` o `FacturaDetailComponent` se activen.
 *
 * Garantiza que el breadcrumb tenga `clienteNombre`, `firmaId` y
 * `firmaNombre` poblados desde el primer frame, incluso en deep-links
 * / F5 donde `window.history.state` está vacío.
 *
 * Estrategia de 2 paths:
 *   1. **Fast-path** (state propagation): si el `state` de la navegación
 *      entrante tiene `clienteNombre`, los re-empaqueta como
 *      `ClienteBreadcrumbContext`. Sin request al backend — instantáneo.
 *
 *   2. **Slow-path** (API fetch): si el state está vacío o incompleto,
 *      llama `GET /api/empresas/:nit` que hace JOIN de `clientes_siigo`
 *      + `empresas` + `firmas` en una sola query a Supabase.
 *
 * En caso de error HTTP, devuelve `null` en vez de fallar la navegación
 * — el componente muestra el breadcrumb parcial y el usuario puede
 * navegar sin problemas (mejor UX que una pantalla de error).
 *
 * Wired en `app.routes.ts` a:
 *   - `clientes/:nit` (ClienteDetailComponent)
 *   - `clientes/:nit/factura/:id` (FacturaDetailComponent)
 */
export const clienteContextResolver: ResolveFn<ClienteBreadcrumbContext | null> = (
  route: ActivatedRouteSnapshot,
) => {
  const clienteRepo = inject(ClienteRepository);
  const router = inject(Router);
  const nit = Number(route.paramMap.get('nit'));

  // Guard: NIT inválido o ausente — retornar null para no romper la nav.
  if (!nit || Number.isNaN(nit)) {
    return of(null);
  }

  // Fast-path: leer de router.getCurrentNavigation()?.extras.state (para navegaciones SPA en curso)
  // o cae a window.history.state (para recargas F5).
  const currentNav = router.getCurrentNavigation();
  const navState = (currentNav?.extras.state ?? window.history.state ?? {}) as NavigationState;
  if (navState.clienteNombre) {
    const tipo_siigo = navState.tipoSiigo ?? navState.tipo_siigo;
    return of<ClienteBreadcrumbContext>({
      nit,
      nombre_empresa: navState.clienteNombre,
      firma_id: navState.firmaId ?? '',
      firma_nombre: navState.firmaNombre || navState.clienteNombre || 'Firma',
      tipo_siigo,
    });
  }

  // Slow-path: API fetch. El backend hace JOIN y retorna todo lo necesario.
  return clienteRepo.getBreadcrumbContext(nit).pipe(
    catchError(() => of(null)),
  );
};