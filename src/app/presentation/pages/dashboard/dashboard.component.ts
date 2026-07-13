import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TokenService } from '@core/token.service';
import { ClienteRepository } from '@data/repositories/cliente.repository';
import { FacturaRepository } from '@data/repositories/factura.repository';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent, StatCardComponent, LoadingStateComponent } from '@app/shared';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, PageHeaderComponent, StatCardComponent, LoadingStateComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly tokenService = inject(TokenService);
  private readonly clienteRepo = inject(ClienteRepository);
  private readonly facturaRepo = inject(FacturaRepository);

  readonly loading = signal(true);
  readonly clientes = signal<any[]>([]);
  readonly facturas = signal<any[]>([]);

  readonly facturasPendientes = computed(() =>
    this.facturas().filter(f => f.status === 'pendiente').length
  );

  readonly facturasCausadas = computed(() =>
    this.facturas().filter(f => f.status === 'causada').length
  );

  ngOnInit(): void {
    this.clienteRepo.getClientes().subscribe({
      next: (data) => {
        this.clientes.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}