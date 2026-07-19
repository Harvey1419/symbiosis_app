import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { FirmaRepository, Firma } from '@data/repositories/firma.repository';
import { CrearEmpresaDialogService } from '@core/crear-empresa-dialog.service';
import { CrearEmpresaDialogComponent } from '@app/shared';

@Component({
  selector: 'app-cliente-list',
  standalone: true,
  imports: [CommonModule, TableModule, ToastModule, CrearEmpresaDialogComponent],
  templateUrl: './cliente-list.component.html',
  styleUrl: './cliente-list.component.scss'
})
export class ClienteListComponent implements OnInit {
  private readonly firmaRepo = inject(FirmaRepository);
  private readonly router = inject(Router);
  readonly crearEmpresaDialog = inject(CrearEmpresaDialogService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly firmas = signal<Firma[]>([]);

  ngOnInit(): void {
    this.loadFirmas();
  }

  loadFirmas() {
    this.loading.set(true);
    this.firmaRepo.getFirmas().subscribe({
      next: (data: Firma[]) => { this.firmas.set(data); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); }
    });
  }

  onIngresar(firma: Firma) {
    if (firma.tipo_siigo === 'nube') {
      if (firma.nit == null) {
        // Firma nube sin NIT (legacy). Disparar el mismo flow que el
        // botón "Terminar registro" — UX consistente: click en row o
        // en el botón, ambos abren el dialog de edición.
        this.crearEmpresaDialog.openForEdit(firma);
        return;
      }
      this.router.navigate(['/facturas', firma.nit]);
    } else {
      this.router.navigate(['/clientes/firma', firma.id]);
    }
  }

  /**
   * Handler explícito del botón "Terminar registro". Delega al mismo
   * dispatch que `onIngresar()` — mantenido separado solo para claridad
   * semántica en el template (mismo efecto que click en la row).
   */
  onTerminarRegistro(firma: Firma): void {
    this.crearEmpresaDialog.openForEdit(firma);
  }

  /**
   * Abre el modal de edición de empresa para la firma indicada.
   * Usado por el icono de engranaje en la columna "Acciones" — disponible
   * para TODAS las firmas (no solo las pendientes), porque PATCH
   * /api/empresas/:nit acepta firmas ya registradas para actualizar sus
   * datos de negocio.
   */
  onActualizarEmpresa(firma: Firma): void {
    this.crearEmpresaDialog.openForEdit(firma);
  }

  /**
   * Nombre a mostrar en la lista. Prioriza `nombre` (razón social) y
   * cae al correo si la firma no tiene nombre capturado todavía.
   */
  getDisplayName(firma: Firma): string {
    return firma.nombre?.trim() || firma.firma_user;
  }

  onAddEmpresa(): void {
    this.crearEmpresaDialog.open();
  }

  onEmpresaCreada(): void {
    this.crearEmpresaDialog.close();
    this.loadFirmas();
  }

  onEmpresaActualizada(): void {
    this.crearEmpresaDialog.close();
    this.loadFirmas();
  }

  onEmpresaEliminada(): void {
    this.crearEmpresaDialog.close();
    this.loadFirmas();
  }

  getInitials(nombre: string): string {
    if (!nombre) return 'NA';
    const words = nombre.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  }

  getAvatarColor(initials: string): string {
    if (!initials || initials.length === 0) return 'color-0';
    return 'color-' + (initials.charCodeAt(0) % 4);
  }

  getClienteInitials(nombre: string): string {
    return this.getInitials(nombre || 'Sin nombre');
  }

  getAvatarColorCliente(nombre: string): string {
    return this.getAvatarColor(this.getInitials(nombre || 'NA'));
  }

  getTipoLabel(tipo: string): string {
    return tipo === 'nube' ? 'Siigo Nube' : 'Contador';
  }

  getStatusLabel(firma: Firma): string {
    if (firma.tipo_siigo === 'nube') return firma.nit ? 'Activo' : 'Pendiente';
    return firma.nit ? 'Activo' : 'Inactivo';
  }

  /**
   * Firma nube sin NIT requiere completar registro (legacy data).
   * El botón "Ingresar" se reemplaza por "Terminar Registro".
   */
  needsCompletion(firma: Firma): boolean {
    return firma.tipo_siigo === 'nube' && firma.nit == null;
  }

  isNitMuted(nit: number | string | null | undefined): boolean {
    if (!nit) return true;
    const nitStr = String(nit).trim();
    return nitStr === '' || nitStr === 'N/A' || nitStr === 'NA';
  }

  getStatusClass(firma: Firma): string {
    if (firma.tipo_siigo === 'nube') {
      return firma.nit ? 'active' : 'pending';
    }
    if (firma.nit) return 'active';
    return 'inactive';
  }
}