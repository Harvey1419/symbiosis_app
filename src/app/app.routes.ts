import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'auth/login',
    loadComponent: () => import('./presentation/pages/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'auth/register',
    loadComponent: () => import('./presentation/pages/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./presentation/pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
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
    path: 'clientes/:nit',
    loadComponent: () => import('./presentation/pages/clientes/cliente-detail/cliente-detail.component').then(m => m.ClienteDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'cuenta',
    loadComponent: () => import('./presentation/pages/cuenta/cuenta.component').then(m => m.CuentaComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'dashboard' }
];