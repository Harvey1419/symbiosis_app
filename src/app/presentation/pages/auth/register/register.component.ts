import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthRepository, RegisterRequest } from '@data/repositories/auth.repository';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  private readonly authRepo = inject(AuthRepository);
  private readonly router = inject(Router);

  data: RegisterRequest = { nombre: '', email: '', password: '' };
  readonly loading = signal(false);
  readonly errorMsg = signal('');

  onSubmit(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.authRepo.register(this.data).subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: (err: { error?: { error?: string } }) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.error || 'Error al registrar');
      }
    });
  }
}