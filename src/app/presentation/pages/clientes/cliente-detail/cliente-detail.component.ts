import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FacturaRepository } from '@data/repositories/factura.repository';
import { ClienteRepository } from '@data/repositories/cliente.repository';
import { Factura } from '@domain/models/factura.model';

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './cliente-detail.component.html',
  styleUrl: './cliente-detail.component.scss'
})
export class ClienteDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly facturaRepo = inject(FacturaRepository);
  private readonly clienteRepo = inject(ClienteRepository);

  nit = signal<number>(0);
  readonly loading = signal(true);
  readonly syncing = signal(false);
  readonly error = signal(false);
  readonly facturas = signal<Factura[]>([]);
  readonly clienteNombre = signal<string>('');

  ngOnInit(): void {
    const nitParam = this.route.snapshot.paramMap.get('nit');
    if (nitParam) {
      const nitNum = Number(nitParam);
      this.nit.set(nitNum);

      // Use passed state from navigation, no extra API call
      const nav = window.history.state;
      if (nav?.clienteNombre) {
        this.clienteNombre.set(nav.clienteNombre);
      }

      this.facturaRepo.getFacturas(nitNum).subscribe({
        next: (data: Factura[]) => { this.facturas.set(data); this.loading.set(false); },
        error: () => { this.error.set(true); this.loading.set(false); }
      });
    }
  }

  getConfianzaMin(factura: Factura): number {
    if (!factura.filas?.length) return 0;
    return Math.min(...factura.filas.map((f: any) => f.confianza || 0));
  }

  getSemaphoreClass(factura: Factura): string {
    const min = this.getConfianzaMin(factura);
    if (min >= 70) return 'green';
    if (min >= 50) return 'yellow';
    return 'red';
  }

  formatStatus(status: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      causada: 'Causada',
      error: 'Error',
      clasificando: 'Clasificando'
    };
    return map[status] || status;
  }

  goBack(): void {
    window.history.back();
  }

  syncSiigo(): void {
    if (this.syncing()) return;
    this.syncing.set(true);
    this.clienteRepo.sincronizarTrazabilidad(this.nit()).subscribe({
      next: () => {
        this.syncing.set(false);
        // Reload facturas after sync
        this.facturaRepo.getFacturas(this.nit()).subscribe({
          next: (data: Factura[]) => { this.facturas.set(data); this.loading.set(false); },
          error: () => { this.error.set(true); this.loading.set(false); }
        });
      },
      error: () => {
        this.syncing.set(false);
        this.error.set(true);
      }
    });
  }
}