import { Component, input, signal } from '@angular/core';
import { inject } from '@angular/core';
import { ClienteRepository } from '@data/repositories/cliente.repository';

@Component({
  selector: 'app-sync-button',
  standalone: true,
  templateUrl: './sync-button.component.html',
  styleUrl: './sync-button.component.scss'
})
export class SyncButtonComponent {
  nit = input.required<number>();

  private readonly clienteRepo = inject(ClienteRepository);

  readonly loading = signal(false);
  readonly synced = signal(false);
  readonly hasError = signal(false);

  sync(): void {
    this.loading.set(true);
    this.hasError.set(false);
    this.synced.set(false);

    this.clienteRepo.sincronizarTrazabilidad(this.nit()).subscribe({
      next: () => {
        this.loading.set(false);
        this.synced.set(true);
        setTimeout(() => this.synced.set(false), 3000);
      },
      error: () => {
        this.loading.set(false);
        this.hasError.set(true);
        setTimeout(() => this.hasError.set(false), 4000);
      }
    });
  }
}