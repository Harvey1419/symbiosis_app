import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { TokenService } from '@core/token.service';
import { FirmaRepository } from '@data/repositories/firma.repository';
import { FacturaRepository } from '@data/repositories/factura.repository';
import { Factura } from '@domain/models/factura.model';
import {
  PageHeaderComponent,
  StatCardComponent,
  LoadingStateComponent,
  ErrorBannerComponent,
  EmptyStateComponent,
} from '@app/shared';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    PageHeaderComponent,
    StatCardComponent,
    LoadingStateComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly tokenService = inject(TokenService);
  private readonly firmaRepo = inject(FirmaRepository);
  private readonly facturaRepo = inject(FacturaRepository);

  readonly usuario = this.tokenService.usuario;

  readonly facturas = signal<Factura[]>([]);
  readonly totalClientes = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly facturasPendientes = computed(
    () =>
      this.facturas().filter((f) => f.status === 'pendiente' || f.status === 'clasificando')
        .length,
  );

  readonly facturasCausadas = computed(
    () =>
      this.facturas().filter((f) => f.status === 'causada' || f.status === 'finalizada')
        .length,
  );

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);

    this.firmaRepo.getFirmas().subscribe({
      next: (firmas) => {
        if (firmas.length === 0) {
          this.totalClientes.set(0);
          this.facturas.set([]);
          this.loading.set(false);
          return;
        }
        forkJoin(firmas.map((f) => this.firmaRepo.getFirmaClientes(f.id))).subscribe({
          next: (clientesPorFirma) => {
            const clientes = clientesPorFirma.flat();
            this.totalClientes.set(clientes.length);
            if (clientes.length === 0) {
              this.facturas.set([]);
              this.loading.set(false);
              return;
            }
            forkJoin(clientes.map((c) => this.facturaRepo.getFacturas(c.nit))).subscribe({
              next: (facturasPorCliente) => {
                this.facturas.set(facturasPorCliente.flat());
                this.loading.set(false);
              },
              error: (err: { message?: string }) => {
                this.error.set(err?.message ?? 'Error al cargar facturas');
                this.loading.set(false);
              },
            });
          },
          error: (err: { message?: string }) => {
            this.error.set(err?.message ?? 'Error al cargar clientes');
            this.loading.set(false);
          },
        });
      },
      error: (err: { message?: string }) => {
        this.error.set(err?.message ?? 'Error al cargar firmas');
        this.loading.set(false);
      },
    });
  }
}
