import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { FirmaRepository } from '@data/repositories/firma.repository';
import { Cliente } from '@domain/models/cliente.model';
import { ClienteRepository } from '@data/repositories/cliente.repository';
import { SyncStatusPillComponent } from '@app/shared/sync-status-pill/sync-status-pill.component';
import { ClienteConfigDialogComponent } from '@app/shared/cliente-config-dialog/cliente-config-dialog.component';
import { ClienteConfigDialogService } from '@app/core/cliente-config-dialog.service';

@Component({
  selector: 'app-firma-clientes',
  standalone: true,
  imports: [CommonModule, TableModule, ToastModule, SyncStatusPillComponent, ClienteConfigDialogComponent],
  templateUrl: './firma-clientes.component.html',
  styleUrl: './firma-clientes.component.scss'
})
export class FirmaClientesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly firmaRepo = inject(FirmaRepository);
  private readonly clienteRepo = inject(ClienteRepository);
  readonly clienteConfigDialog = inject(ClienteConfigDialogService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly clientes = signal<Cliente[]>([]);
  firmaId = signal<string>('');
  readonly syncLoading = signal(false);
  readonly lastSync = signal<Date | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.firmaId.set(id);
      this.loadClientes(id);
    }
  }

  loadClientes(firmaId: string) {
    this.loading.set(true);
    this.firmaRepo.getFirmaClientes(firmaId).subscribe({
      next: (data: any[]) => {
        this.clientes.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  /** Triggered by the SyncStatusPill "Sincronizar ahora" button. */
  onSync(): void {
    this.syncLoading.set(true);
    // Use the first cliente's NIT as the sync target (legacy endpoint
    // is per-NIT). Fallback: just reload after a delay.
    const firstNit = this.clientes()[0]?.nit;
    if (!firstNit) {
      setTimeout(() => {
        this.lastSync.set(new Date());
        this.syncLoading.set(false);
        this.loadClientes(this.firmaId());
      }, 500);
      return;
    }
    this.clienteRepo.sincronizarTrazabilidad(firstNit).subscribe({
      next: () => {
        this.lastSync.set(new Date());
        this.syncLoading.set(false);
        this.loadClientes(this.firmaId());
      },
      error: () => {
        this.syncLoading.set(false);
        // Could show toast in future
      }
    });
  }

  /**
   * Abre el modal de config del cliente pre-llenado con sus datos.
   * Disparado por el icono de engranaje en la celda "Acciones".
   */
  onConfigurarCliente(cliente: Cliente): void {
    this.clienteConfigDialog.openForEdit(cliente);
  }

  /** Refresca la lista después de un PATCH exitoso (sin esperar al sync). */
  onClienteActualizado(): void {
    this.clienteConfigDialog.close();
    this.loadClientes(this.firmaId());
  }

  goBack(): void {
    this.router.navigate(['/clientes']);
  }

  goToClienteDetail(nit: number, nombre: string): void {
    this.router.navigate(['/clientes', nit], {
      state: { clienteNombre: nombre }
    });
  }

  getClienteInitials(nombre: string): string {
    if (!nombre) return 'NA';
    const words = nombre.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  }
}