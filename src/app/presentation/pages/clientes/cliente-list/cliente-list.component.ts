import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TableModule } from 'primeng/table';
import { FirmaRepository, Firma } from '@data/repositories/firma.repository';
import { CrearEmpresaDialogService } from '@core/crear-empresa-dialog.service';

@Component({
  selector: 'app-cliente-list',
  standalone: true,
  imports: [CommonModule, TableModule],
  templateUrl: './cliente-list.component.html',
  styleUrl: './cliente-list.component.scss'
})
export class ClienteListComponent implements OnInit {
  private readonly firmaRepo = inject(FirmaRepository);
  private readonly router = inject(Router);
  private readonly crearEmpresaDialog = inject(CrearEmpresaDialogService);

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
      this.router.navigate(['/clientes', firma.nit]);
    } else {
      this.router.navigate(['/clientes/firma', firma.id]);
    }
  }

  onAddEmpresa(): void {
    this.crearEmpresaDialog.open();
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
    if (firma.tipo_siigo === 'nube') return 'Nube';
    return firma.nit ? 'Activo' : 'Inactivo';
  }

  isNitMuted(nit: number | string | null | undefined): boolean {
    if (!nit) return true;
    const nitStr = String(nit).trim();
    return nitStr === '' || nitStr === 'N/A' || nitStr === 'NA';
  }

  getStatusClass(firma: Firma): string {
    if (firma.tipo_siigo === 'nube') return 'nube';
    if (firma.nit) return 'active';
    return 'inactive';
  }
}