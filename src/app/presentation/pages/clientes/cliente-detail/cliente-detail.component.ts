import { Component, inject, signal, OnInit, viewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FacturaRepository } from '@data/repositories/factura.repository';
import { Factura } from '@domain/models/factura.model';
import { SyncButtonComponent } from '@presentation/components/sync-button.component';
import { SyncBannerComponent } from '@app/shared/sync-banner/sync-banner.component';

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, SyncButtonComponent, SyncBannerComponent],
  templateUrl: './cliente-detail.component.html',
  styleUrl: './cliente-detail.component.scss'
})
export class ClienteDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly facturaRepo = inject(FacturaRepository);

  /** Reference to the embedded sync button (kept for backwards compat). */
  private readonly syncButton = viewChild(SyncButtonComponent);

  nit = signal<number>(0);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly facturas = signal<Factura[]>([]);
  readonly clienteNombre = signal<string>('');
  readonly syncLoading = signal(false);
  readonly lastSync = signal<Date | null>(null);
  readonly catalogosSiigo = signal<readonly string[]>([
    'Facturas electrónicas',
    'Clientes / proveedores',
    'Cuentas contables',
    'Impuestos',
    'Centros de costo',
  ]);

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
    return Math.min(...factura.filas.map((f) => f.confianza || 0));
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
      finalizada: 'Finalizada',
      error: 'Error',
      clasificando: 'Clasificando'
    };
    return map[status] || status;
  }

  goBack(): void {
    window.history.back();
  }

  /** Called from the SyncBanner "Sincronizar" button. Triggers the underlying
   *  SyncButtonComponent (which does the actual HTTP call) and reloads the
   *  facturas list on completion. */
  onSync(): void {
    this.syncLoading.set(true);
    // Delegate to the existing SyncButtonComponent by triggering its sync().
    const btn = this.syncButton();
    if (btn) {
      btn.sync();
    } else {
      // Fallback: just reload after a delay
      setTimeout(() => {
        this.lastSync.set(new Date());
        this.syncLoading.set(false);
        this.onSynced();
      }, 500);
    }
  }

  /** Called when SyncButtonComponent emits `synced` — reloads the facturas list. */
  onSynced(): void {
    this.facturaRepo.getFacturas(this.nit()).subscribe({
      next: (data: Factura[]) => {
        this.facturas.set(data);
        this.lastSync.set(new Date());
        this.syncLoading.set(false);
      },
      error: () => { this.error.set(true); this.syncLoading.set(false); }
    });
  }
}
