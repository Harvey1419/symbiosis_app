import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import type { MenuItem } from 'primeng/api';
import { Firma, FirmaRepository } from '@data/repositories/firma.repository';
import { Cliente } from '@domain/models/cliente.model';
import { ClienteRepository } from '@data/repositories/cliente.repository';
import { ClienteConfigDialogComponent } from '@app/shared/cliente-config-dialog/cliente-config-dialog.component';
import { ClienteConfigDialogService } from '@app/core/cliente-config-dialog.service';
import { BackButtonComponent } from '@app/shared/back-button/back-button.component';
import { PageHeaderComponent } from '@app/shared/page-header/page-header.component';
import { AppBreadcrumbComponent } from '@app/shared/app-breadcrumb/app-breadcrumb.component';

@Component({
  selector: 'app-firma-clientes',
  standalone: true,
  imports: [CommonModule, TableModule, ToastModule, ButtonModule, ClienteConfigDialogComponent, BackButtonComponent, PageHeaderComponent, AppBreadcrumbComponent],
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
  /** Firma actualmente listada — incluye el NIT que necesita `sincronizarEmpresas`. */
  readonly firma = signal<Firma | null>(null);
  /** Nombre de la firma para mostrar en el breadcrumb. */
  readonly firmaNombre = signal<string>('');
  readonly syncLoading = signal(false);
  readonly lastSync = signal<Date | null>(null);

  /**
   * Items del p-breadcrumb. El primer segmento (home) es siempre "Firmas"
   * enlazando a /clientes; el segundo es el nombre de la firma actual.
   * El último segmento NO tiene URL (representa la página actual).
   */
  readonly breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: ['/clientes'] };
  readonly breadcrumbItems = computed<MenuItem[]>(() => {
    const items: MenuItem[] = [
      { label: 'Firmas', routerLink: ['/clientes'] },
    ];
    if (this.firmaNombre()) {
      items.push({ label: this.firmaNombre() });
    }
    return items;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.firmaId.set(id);
      this.loadClientes(id);
      this.loadFirmaNombre(id);
    }
  }

  /**
   * Resuelve la firma desde el listado cacheado de `getFirmas()`. La firma
   * puede no estar en el cache si el usuario llegó directo por URL (sin
   * pasar por /clientes); en ese caso los signals `firma` y `firmaNombre`
   * quedan vacíos y el breadcrumb muestra solo "Firmas". El sync Siigo
   * (`onSync`) NO se dispara sin firma porque necesita el NIT.
   */
  private loadFirmaNombre(id: string): void {
    this.firmaRepo.getFirmas().subscribe({
      next: (firmas) => {
        const firma = firmas.find((f) => f.id === id);
        if (firma) {
          this.firma.set(firma);
          this.firmaNombre.set(firma.nombre?.trim() || firma.firma_user || 'Firma');
        }
      },
      error: () => {
        // Sin firma → breadcrumb funciona solo con "Firmas".
      },
    });
  }

  loadClientes(firmaId: string) {
    this.loading.set(true);
    this.firmaRepo.getFirmaClientes(firmaId).subscribe({
      next: (data: Cliente[]) => {
        this.clientes.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  /**
   * Sync Siigo "empresas" para esta firma. Per la regla de scope del spec,
   * en `firma-clientes` SOLO se sincroniza la lista de empresas (clientes
   * Siigo de la firma) — NO se dispara trazabilidad, taxes, puc ni
   * proveedores aquí. Esos viven en `cliente-detail` y los dispara el
   * `SyncSiigoCompletoButtonComponent` por cliente.
   *
   * Requiere que la firma tenga NIT. Si la firma es legacy sin NIT
   * (`firmas.nit = null`), el endpoint `/api/sync/siigo/empresas` no puede
   * resolver nada — en ese caso logueamos y bailamos sin tocar loading.
   */
  onSync(): void {
    this.syncLoading.set(true);
    const firmaNit = this.firma()?.nit;
    if (!firmaNit) {
      // eslint-disable-next-line no-console -- feedback to operator for legacy firms
      console.warn('[firma-clientes] No se puede sincronizar empresas: la firma no tiene NIT asignado.');
      this.syncLoading.set(false);
      return;
    }
    this.clienteRepo.sincronizarEmpresas(firmaNit).subscribe({
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
      // Pasamos nombre + firmaId + firmaNombre por history state para que
      // cliente-detail pueda armar el breadcrumb sin tener que volver a
      // pedir /api/firmas (el listado ya está en cache del repo).
      state: {
        clienteNombre: nombre,
        firmaId: this.firmaId(),
        firmaNombre: this.firmaNombre(),
        tipoSiigo: 'contador',
      }
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