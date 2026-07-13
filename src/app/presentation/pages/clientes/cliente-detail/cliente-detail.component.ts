import { Component, inject, signal, computed, OnInit, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule, Table } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { FacturaRepository } from '@data/repositories/factura.repository';
import { Factura } from '@domain/models/factura.model';
import { SyncStatusPillComponent } from '@app/shared/sync-status-pill/sync-status-pill.component';

interface ProveedorOption {
  label: string;
  value: string | null;
}

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    SyncStatusPillComponent,
    TableModule, ButtonModule, SelectModule, DatePickerModule, InputTextModule, ToggleSwitchModule, TooltipModule,
  ],
  templateUrl: './cliente-detail.component.html',
  styleUrl: './cliente-detail.component.scss'
})
export class ClienteDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facturaRepo = inject(FacturaRepository);

  // ── Core data ──
  nit = signal<number>(0);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly facturas = signal<Factura[]>([]);
  readonly clienteNombre = signal<string>('');
  readonly syncLoading = signal(false);
  readonly lastSync = signal<Date | null>(null);

  // ── Filter signals (canonical state) ──
  readonly searchText = signal<string>('');
  readonly proveedorFilter = signal<string | null>(null);
  readonly estadoFilter = signal<string | null>(null);
  readonly tipoFilter = signal<string | null>(null);
  readonly fechaRange = signal<Date[] | null>(null);
  readonly soloRevisadas = signal<boolean>(false);
  readonly selectedFacturas = signal<Factura[]>([]);

  // ── ngModel two-way bindings (read-only setters) ──
  get searchTextModel(): string { return this.searchText(); }
  set searchTextModel(v: string) { this.searchText.set(v); }
  get proveedorFilterModel(): string | null { return this.proveedorFilter(); }
  set proveedorFilterModel(v: string | null) { this.proveedorFilter.set(v); }
  get estadoFilterModel(): string | null { return this.estadoFilter(); }
  set estadoFilterModel(v: string | null) { this.estadoFilter.set(v); }
  get tipoFilterModel(): string | null { return this.tipoFilter(); }
  set tipoFilterModel(v: string | null) { this.tipoFilter.set(v); }
  get fechaRangeModel(): Date[] | null { return this.fechaRange(); }
  set fechaRangeModel(v: Date[] | null) { this.fechaRange.set(v); }
  get soloRevisadasModel(): boolean { return this.soloRevisadas(); }
  set soloRevisadasModel(v: boolean) { this.soloRevisadas.set(v); }
  get selectedFacturasModel(): Factura[] { return this.selectedFacturas(); }
  set selectedFacturasModel(v: Factura[]) { this.selectedFacturas.set(v); }

  // ── Computed: dynamic proveedor list from data ──
  readonly proveedores = computed<ProveedorOption[]>(() => {
    const set = new Set<string>();
    for (const f of this.facturas()) {
      if (f.vendor_name) set.add(f.vendor_name);
    }
    return [
      { label: 'Todos', value: null },
      ...[...set].sort().map((p) => ({ label: p, value: p })),
    ];
  });

  readonly filteredFacturas = computed<Factura[]>(() => {
    const all = this.facturas();
    const search = this.searchText().toLowerCase().trim();
    const proveedor = this.proveedorFilter();
    const estado = this.estadoFilter();
    const tipo = this.tipoFilter();
    const range = this.fechaRange();
    const soloRev = this.soloRevisadas();

    return all.filter((f) => {
      if (search) {
        const haystack = `${f.track_id ?? ''} ${f.cufe ?? ''} ${f.factura_nro ?? ''}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (proveedor && f.vendor_name !== proveedor) return false;
      if (estado && f.status !== estado) return false;
      if (tipo && this.getTipoFactura(f) !== tipo) return false;
      if (range && range[0] && f.fecha_emision) {
        const fecha = new Date(f.fecha_emision);
        if (fecha < range[0]) return false;
      }
      if (range && range[1] && f.fecha_emision) {
        const fecha = new Date(f.fecha_emision);
        const end = new Date(range[1]);
        end.setHours(23, 59, 59, 999);
        if (fecha > end) return false;
      }
      if (soloRev && f.status !== 'causada' && f.status !== 'finalizada') return false;
      return true;
    });
  });

  readonly hasActiveFilters = computed(() =>
    !!this.searchText() ||
    !!this.proveedorFilter() ||
    !!this.estadoFilter() ||
    !!this.tipoFilter() ||
    !!this.fechaRange() ||
    this.soloRevisadas()
  );

  // ── Static dropdown options ──
  readonly estadoOptions = [
    { label: 'Todas', value: null },
    { label: 'Pendiente', value: 'pendiente' },
    { label: 'Clasificando', value: 'clasificando' },
    { label: 'Causada', value: 'causada' },
    { label: 'Finalizada', value: 'finalizada' },
    { label: 'Error', value: 'error' },
  ];

  readonly tipoOptions = [
    { label: 'Todas', value: null },
    { label: 'Factura Compra', value: 'Factura Compra' },
    { label: 'Nota Crédito', value: 'Nota Crédito' },
  ];

  ngOnInit(): void {
    const nitParam = this.route.snapshot.paramMap.get('nit');
    if (nitParam) {
      const nitNum = Number(nitParam);
      this.nit.set(nitNum);

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

  // ── Filter actions ──
  clearFilters(): void {
    this.searchText.set('');
    this.proveedorFilter.set(null);
    this.estadoFilter.set(null);
    this.tipoFilter.set(null);
    this.fechaRange.set(null);
    this.soloRevisadas.set(false);
  }

  // ── Sync action: simple trigger that fetches latest. The real DIAN
  // sync requires a DIAN token; for now we just re-fetch. The
  // SyncStatusPill UI stays accurate. ──
  onSync(): void {
    this.syncLoading.set(true);
    this.facturaRepo.getFacturas(this.nit()).subscribe({
      next: (data: Factura[]) => {
        this.facturas.set(data);
        this.lastSync.set(new Date());
        this.syncLoading.set(false);
      },
      error: () => { this.error.set(true); this.syncLoading.set(false); }
    });
  }

  // ── Row click navigation ──
  goToFactura(f: Factura): void {
    this.router.navigate(['/clientes', this.nit(), 'factura', f.id]);
  }

  exportSelected(): void {
    // TODO: wire to backend export endpoint. For now: just log.
    const ids = this.selectedFacturas().map((f) => f.id);
    // eslint-disable-next-line no-console
    console.log('[cliente-detail] export selected', ids);
  }

  // ── Cell renderers ──
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

  /**
   * Heuristic: classify by track_id prefix. In a real integration this
   * would come from the DIAN XML metadata (factura_tipo code).
   */
  getTipoFactura(factura: Factura): string {
    const track = (factura.track_id ?? '').toUpperCase();
    if (track.startsWith('NC')) return 'Nota Crédito';
    return 'Factura Compra';
  }

  getTipoSlug(factura: Factura): string {
    const tipo = this.getTipoFactura(factura);
    return tipo.toLowerCase().replace(/\s+/g, '-');
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return d; }
  }

  formatMoney(n: number | null | undefined): string {
    if (n === null || n === undefined) return '0';
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
  }

  goBack(): void {
    window.history.back();
  }
}