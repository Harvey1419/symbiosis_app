import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { clienteContextResolver } from './core/cliente-context.resolver';

export const routes: Routes = [
  { path: '', redirectTo: 'clientes', pathMatch: 'full' },
  {
    path: 'auth/login',
    loadComponent: () => import('./presentation/pages/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./presentation/pages/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'clientes',
    loadComponent: () => import('./presentation/pages/clientes/cliente-list/cliente-list.component').then(m => m.ClienteListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'clientes/firma/:id',
    loadComponent: () => import('./presentation/pages/clientes/firma-clientes/firma-clientes.component').then(m => m.FirmaClientesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'clientes/:nit/factura/:id',
    loadComponent: () => import('./presentation/pages/clientes/factura-detail/factura-detail.component').then(m => m.FacturaDetailComponent),
    canActivate: [authGuard],
    resolve: { clienteContext: clienteContextResolver }
  },
  {
    path: 'facturas/:nit',
    loadComponent: () => import('./presentation/pages/clientes/cliente-detail/cliente-detail.component').then(m => m.ClienteDetailComponent),
    canActivate: [authGuard],
    resolve: { clienteContext: clienteContextResolver }
  },
  {
    path: 'clientes/:nit',
    loadComponent: () => import('./presentation/pages/clientes/cliente-detail/cliente-detail.component').then(m => m.ClienteDetailComponent),
    canActivate: [authGuard],
    resolve: { clienteContext: clienteContextResolver }
  },
  {
    path: 'cuenta',
    loadComponent: () => import('./presentation/pages/cuenta/cuenta.component').then(m => m.CuentaComponent),
    canActivate: [authGuard]
  },
  {
    path: 'jobs/:jobId',
    loadComponent: () => import('./presentation/pages/jobs/job-detail/job-detail.component').then(m => m.JobDetailComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'clientes' }
];