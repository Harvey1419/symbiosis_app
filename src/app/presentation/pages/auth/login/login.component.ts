import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthRepository, LoginRequest } from '@data/repositories/auth.repository';
import { FirmaRepository } from '@data/repositories/firma.repository';
import { TokenService } from '@core/token.service';
import { CrearEmpresaDialogService } from '@core/crear-empresa-dialog.service';
import { resolvePostLoginRoute } from '@core/resolve-post-login-route';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly authRepo = inject(AuthRepository);
  private readonly firmaRepo = inject(FirmaRepository);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  private readonly crearEmpresaDialog = inject(CrearEmpresaDialogService);

  credentials: LoginRequest = { email: '', password: '' };
  readonly loading = signal(false);
  readonly errorMsg = signal('');

  onSubmit(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.authRepo.login(this.credentials).subscribe({
      next: (res) => {
        this.tokenService.setAuth({ token: res.token, usuario: res.usuario });
        // Cargar firmas post-login y decidir ruta via resolvePostLoginRoute.
        // Si el usuario no tiene firmas (primera vez), abrir el modal
        // "Crear Empresa" además de navegar a /dashboard.
        this.firmaRepo.getFirmas().subscribe({
          next: (firmas) => {
            const route = resolvePostLoginRoute(firmas);
            if (typeof route === 'string') {
              this.router.navigateByUrl(route);
            } else {
              this.router.navigateByUrl('/dashboard');
              this.crearEmpresaDialog.open();
            }
          },
          error: () => {
            // Si falla el GET firmas, caer al comportamiento legacy
            // (siempre /dashboard) en vez de dejar al usuario atascado.
            this.router.navigateByUrl('/dashboard');
          },
        });
      },
      error: (err: { error?: { error?: string } }) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.error || 'Error al iniciar sesión');
      }
    });
  }
}