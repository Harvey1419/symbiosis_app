import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthRepository, LoginRequest } from '@data/repositories/auth.repository';
import { TokenService } from '@core/token.service';
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
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  credentials: LoginRequest = { email: '', password: '' };
  readonly loading = signal(false);
  readonly errorMsg = signal('');

  onSubmit(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.authRepo.login(this.credentials).subscribe({
      next: (res) => {
        this.tokenService.setAuth({ token: res.token, usuario: res.usuario });
        this.router.navigate(['/dashboard']);
      },
      error: (err: { error?: { error?: string } }) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.error || 'Error al iniciar sesión');
      }
    });
  }
}