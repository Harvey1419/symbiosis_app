# angular-app

Frontend de Symbiosis Lab: dashboard Angular 21 + PrimeNG 21 (standalone components, signals, lazy loading). Se conecta al API Express (repo separado `symbiosis-api`).

## Estructura

```
src/
  app/
    core/           # singletons: auth guard, interceptors, token, sidebar
    data/           # repositories HTTP (cliente, firma, factura, auth)
    domain/         # modelos y tipos puros
    presentation/   # páginas y componentes de UI
      pages/        # rutas lazy-loaded
      components/   # piezas reutilizables
    app.config.ts   # providers globales (router, http, interceptors)
    app.routes.ts   # tabla de rutas con lazy loading
    app.ts          # componente raíz
  assets/brand/     # logos e isotypes de Symbiosis Lab
  environments/     # environment.ts (prod) y environment.development.ts
  styles.scss       # design tokens (Symbiosis Lab brand)
  test-setup.ts     # init de TestBed para Vitest
  index.html        # carga Poppins + Inter desde Google Fonts
```

Alias de import (resueltos en `tsconfig.json` y replicados en `vitest.config.ts`):

| Alias | Apunta a |
| --- | --- |
| `@app/*` | `src/app/*` |
| `@core/*` | `src/app/core/*` |
| `@data/*` | `src/app/data/*` |
| `@domain/*` | `src/app/domain/*` |
| `@presentation/*` | `src/app/presentation/*` |
| `@environments/*` | `src/environments/*` |

## Scripts

```bash
pnpm install              # una sola vez
pnpm start                # dev server en http://localhost:4200
pnpm build                # build producción → dist/
pnpm test                 # vitest (smoke)
pnpm test:coverage        # vitest con cobertura v8
pnpm lint                 # eslint
pnpm lint:fix             # eslint con --fix
pnpm format               # prettier --write
pnpm format:check         # prettier --check
```

## Backend

Por defecto, este proyecto se conecta al API en `/api` (proxy de `proxy.conf.json` → `http://localhost:3001`).

Para apuntar a otro backend, edita `src/environments/environment.ts` o `src/environments/environment.development.ts`.

## Design system

Ver `DESIGN.md` para el resumen ejecutivo. La spec autoritativa (manual de marca Symbiosis Lab) se mantiene en un repositorio de branding separado; coordinar con el equipo de marca para acceder al PDF de referencia.

## Repos relacionados

- API: `symbiosis-api` (repo separado, este frontend lo consume).
