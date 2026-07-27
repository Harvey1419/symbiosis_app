import { Component, inject, signal, computed, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import type { MenuItem } from 'primeng/api';
import { finalize, forkJoin, Subscription } from 'rxjs';

import { FacturaRepository } from '@data/repositories/factura.repository';
import {
  CreateSyncJobRequest,
  JobInvoice,
  JobRepository,
  RetryErrorsRequest,
} from '@data/repositories/job.repository';
import { TokenService } from '@core/token.service';
import { RealtimeFacturasService } from '@core/realtime/realtime-facturas.service';
import { InvoiceSummary, SyncEvent, SyncEventFacturaInserted, SyncEventProcessing, SyncEventTerminal } from '@core/realtime/sync-event';
import { Factura } from '@domain/models/factura.model';
import { BackButtonComponent } from '@app/shared/back-button/back-button.component';
import { PageHeaderComponent } from '@app/shared/page-header/page-header.component';
import { AppBreadcrumbComponent } from '@app/shared/app-breadcrumb/app-breadcrumb.component';
import { SyncSiigoCompletoButtonComponent } from '@app/presentation/components/sync-siigo-completo-button/sync-siigo-completo-button.component';
import type { SiigoSyncResult } from '@app/presentation/components/sync-siigo-completo-button/sync-siigo-completo-button.component';
import {
  SyncDianModalComponent,
  SyncDianSubmitPayload,
} from './sync-dian-modal/sync-dian-modal.component';

interface ProveedorOption {
  label: string;
  value: string | null;
}

/**
 * Estado del job en cualquier punto del ciclo. `SyncEvent` es una unión
 * discriminada y `reconnected` (transporte) no tiene `estado`; usamos solo
 * los tres subtipos con `estado` para que la indexación compile.
 */
type SyncEventWithEstado = SyncEventProcessing | SyncEventFacturaInserted | SyncEventTerminal;
type SyncJobState = SyncEventWithEstado['estado'];
type ReconciledInvoice = InvoiceSummary | JobInvoice;

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toFactura(
  invoice: ReconciledInvoice,
  firmaId: string,
  jobId: string,
): Factura {
  return {
    id: invoice.id,
    client_nit: invoice.client_nit,
    track_id: invoice.track_id,
    cufe: null,
    factura_nro: null,
    vendor_nit: invoice.vendor_nit,
    vendor_name: invoice.vendor_name,
    fecha_emision: null,
    payment_due_date: null,
    notes: null,
    pdf_url: null,
    xml_url: null,
    pdf_base64: null,
    error_message: null,
    subtotal: null,
    total_iva: null,
    total_pagar: invoice.total_pagar,
    status: invoice.status as Factura['status'],
    filas: [],
    clasificado_at: null,
    causada_at: null,
    causada_by: null,
    created_at: invoice.created_at,
    firma_id: firmaId,
    job_id: 'job_id' in invoice ? invoice.job_id : jobId,
  };
}

function mergeInvoicesById(
  current: Factura[],
  incoming: ReconciledInvoice[],
  firmaId: string,
  jobId: string,
): Factura[] {
  const seen = new Set(current.map((invoice) => invoice.id));
  const prepended: Factura[] = [];

  for (const invoice of incoming) {
    if (seen.has(invoice.id)) continue;
    seen.add(invoice.id);
    prepended.push(toFactura(invoice, firmaId, jobId));
  }

  return [...prepended, ...current];
}

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    SyncSiigoCompletoButtonComponent,
    SyncDianModalComponent,
    TableModule, ButtonModule, SelectModule, DatePickerModule, InputTextModule, ToggleSwitchModule, TooltipModule,
    ToastModule,
    BackButtonComponent,
    PageHeaderComponent,
    AppBreadcrumbComponent,
  ],
  templateUrl: './cliente-detail.component.html',
  styleUrl: './cliente-detail.component.scss'
})
export class ClienteDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facturaRepo = inject(FacturaRepository);
  private readonly message = inject(MessageService);
  readonly realtime = inject(RealtimeFacturasService);
  readonly jobRepo = inject(JobRepository);
  readonly tokenService = inject(TokenService);

  // ── Core data ──
  nit = signal<number>(0);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly facturas = signal<Factura[]>([]);
  readonly clienteNombre = signal<string>('');
  /** Firma a la que pertenece este cliente (para el breadcrumb). */
  readonly firmaId = signal<string>('');
  readonly firmaNombre = signal<string>('');
  /** PR-B: credencial Siigo de la firma — habilita el card de sync desde `factura-detail`. */
  readonly firmaUser = signal<string>('');
  readonly tipoSiigo = signal<'nube' | 'contador' | undefined>(undefined);
  readonly syncLoading = signal(false);
  readonly siigoSyncDone = signal(0);
  readonly siigoSyncTotal = signal(4);
  readonly isExporting = signal(false);
  readonly lastSync = signal<Date | null>(null);
  readonly syncModalOpen = signal(false);
  readonly activeJobId = signal<string | null>(null);
  readonly procesadasCount = signal(0);
  readonly errorsCount = signal(0);
  readonly totalCount = signal(0);
  readonly syncStatus = signal<SyncJobState>('pending');
  private streamSubscription: Subscription | null = null;

  // ── Breadcrumb ──
  /** True cuando el Resolver no encontró el cliente (NIT no existe o no
   * pertenece a una firma del usuario). Se muestra un mensaje específico
   * en vez de la tabla de facturas vacía. */
  readonly notFound = signal(false);
  readonly breadcrumbHome: MenuItem = { icon: 'pi pi-home', routerLink: ['/clientes'] };
  readonly breadcrumbItems = computed<MenuItem[]>(() => {
    const items: MenuItem[] = [
      { label: 'Firmas', routerLink: ['/clientes'] },
    ];
    if (this.tipoSiigo() === 'nube') {
      if (this.clienteNombre()) {
        items.push({ label: this.clienteNombre() });
      } else if (this.nit()) {
        items.push({ label: `Cliente ${this.nit()}` });
      }
    } else {
      if (this.firmaNombre()) {
        items.push({
          label: this.firmaNombre(),
          routerLink: this.firmaId() ? ['/clientes/firma', this.firmaId()] : undefined,
        });
      }
      if (this.clienteNombre()) {
        items.push({ label: this.clienteNombre() });
      } else if (this.nit()) {
        items.push({ label: `Cliente ${this.nit()}` });
      }
    }
    return items;
  });

  /**
   * Destino del back button. Si tenemos firmaId vamos al detalle de
   * clientes de esa firma; si NO (ej. URL directa sin state), caemos
   * al listado general de firmas para no romper la navegación.
   */
  readonly backLink = computed<string[]>(() =>
    this.firmaId() ? ['/clientes/firma', this.firmaId()] : ['/clientes'],
  );

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
    { label: 'Lista Para Subir', value: 'lista_para_subir' },
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
    this.siigoSyncDone.set(0);
    const shouldRunSiigo = this.route.snapshot.queryParamMap?.get('sync') === 'run';
    if (shouldRunSiigo) {
      void this.router.navigate([], { relativeTo: this.route, queryParams: { sync: null }, queryParamsHandling: 'merge', replaceUrl: true });
    }

    if (nitParam) {
      const nitNum = Number(nitParam);
      this.nit.set(nitNum);

      // El Resolver (`clienteContextResolver`) corre ANTES de que este
      // componente se active, así que `route.snapshot.data['clienteContext']`
      // ya está poblado para deep-links / F5. En el flujo normal, el Resolver
      // también lee del state (fast-path), así que no hay diferencia
      // funcional — el breadcrumb está completo desde el primer frame.
      const ctx = this.route.snapshot.data['clienteContext'] as
        | {
            nombre_empresa: string;
            firma_id: string;
            firma_nombre: string;
            firma_user?: string;
            tipo_siigo?: 'nube' | 'contador';
          }
        | null;
      if (ctx) {
        this.clienteNombre.set(ctx.nombre_empresa);
        this.firmaId.set(ctx.firma_id);
        this.firmaNombre.set(ctx.firma_nombre);
        this.firmaUser.set(ctx.firma_user ?? '');
        this.tipoSiigo.set(ctx.tipo_siigo);
      } else {
        // Resolver retornó null → el NIT no existe o no pertenece a una
        // firma del usuario. Mostramos mensaje específico en vez de tabla vacía.
        this.notFound.set(true);
        this.loading.set(false);
        return;
      }

       this.facturaRepo.getFacturas(nitNum).subscribe({
         next: (data: Factura[]) => { this.facturas.set(data); this.loading.set(false); },
         error: () => { this.error.set(true); this.loading.set(false); }
       });
       if (shouldRunSiigo) {
         queueMicrotask(() => this.triggerSiigoSync());
       }
    }
  }

  private triggerSiigoSync(): void {
    this.siigoSyncDone.set(0);
    const buttons = document.querySelectorAll('app-sync-siigo-completo-button button');
    (buttons.item(0) as HTMLButtonElement | null)?.click();
  }


  clearFilters(): void {
    this.searchText.set('');
    this.proveedorFilter.set(null);
    this.estadoFilter.set(null);
    this.tipoFilter.set(null);
    this.fechaRange.set(null);
    this.soloRevisadas.set(false);
  }

  // ── DIAN sync modal + realtime stream ──
  openSyncModal(): void {
    this.syncModalOpen.set(true);
  }

  onSyncModalSubmitted(payload: SyncDianSubmitPayload): void {
    const request: CreateSyncJobRequest = {
      firma_id: this.firmaId(),
      nit_cliente: String(this.nit()),
      desde: toIsoDate(payload.desde),
      hasta: toIsoDate(payload.hasta),
      token_dian: payload.tokenDian,
    };

    this.syncLoading.set(true);
    this.jobRepo.createSyncJob(request).subscribe({
      next: ({ jobId, total }) => {
        this.activeJobId.set(jobId);
        this.procesadasCount.set(0);
        this.errorsCount.set(0);
        this.totalCount.set(total);
        this.syncStatus.set('pending');
        this.startStreaming(jobId);
      },
      error: (error: unknown) => {
        this.syncLoading.set(false);
        this.message.add({
          severity: 'error',
          summary: 'Error al iniciar sync',
          detail: this.readSyncError(error),
        });
      },
    });
  }

  onSyncModalRetry(payload: SyncDianSubmitPayload): void {
    const sourceJobId = this.activeJobId();
    if (!sourceJobId) return;

    const request: RetryErrorsRequest = {
      token_dian: payload.tokenDian,
      desde: toIsoDate(payload.desde),
      hasta: toIsoDate(payload.hasta),
    };

    this.syncLoading.set(true);
    this.jobRepo.retryErrors(sourceJobId, request).subscribe({
      next: ({ jobId, total }) => {
        this.activeJobId.set(jobId);
        this.procesadasCount.set(0);
        this.errorsCount.set(0);
        this.totalCount.set(total);
        this.syncStatus.set('pending');
        this.message.add({
          severity: 'success',
          summary: 'Reintento iniciado',
          detail: `${total} factura${total === 1 ? '' : 's'} en proceso.`,
        });
        this.startStreaming(jobId);
      },
      error: (error: unknown) => {
        this.syncLoading.set(false);
        this.message.add({
          severity: 'error',
          summary: 'Error al reintentar',
          detail: this.readSyncError(error),
        });
      },
    });
  }

  onSyncModalClosed(): void {
    this.syncModalOpen.set(false);
    this.syncLoading.set(false);
    this.streamSubscription?.unsubscribe();
    this.streamSubscription = null;
    this.realtime.unsubscribe();
    this.activeJobId.set(null);
  }

  private startStreaming(jobId: string): void {
    const jwt = this.tokenService.token();
    if (!jwt) {
      this.syncLoading.set(false);
      this.message.add({ severity: 'error', summary: 'Sin token de autenticación' });
      return;
    }

    this.streamSubscription?.unsubscribe();
    this.streamSubscription = this.realtime
      .subscribe(String(this.nit()), jobId, jwt)
      .subscribe({
        next: (event) => this.handleSyncEvent(event),
        error: () => {
          this.message.add({
            severity: 'warn',
            summary: 'Conexión SSE perdida',
            detail: 'Reintentando…',
          });
        },
      });
  }

  private handleSyncEvent(event: SyncEvent): void {
    if (event.jobId !== this.activeJobId() || event.nit !== String(this.nit())) return;

    // `reconnected` es una señal de transporte (viene del SSE client, no
    // del backend) que indica que el stream sobrevivió a un error y reabrió
    // el EventSource. No trae counters — saltar directo a la reconciliación
    // para re-pegar el estado autoritativo vía getJobStatus + getJobInvoices.
    if (event.type === 'reconnected') {
      this.reconcileAfterTerminal();
      return;
    }

    this.procesadasCount.set(event.procesadas);
    this.errorsCount.set(event.errors);
    this.totalCount.set(event.total);
    this.syncStatus.set(event.estado);

    switch (event.type) {
      case 'factura_inserted':
        this.facturas.update((current) => mergeInvoicesById(
          current,
          event.invoices,
          event.firmaId,
          event.jobId,
        ));
        this.lastSync.set(new Date(event.emittedAt));
        break;
      case 'processing':
        break;
      case 'terminal':
        this.syncLoading.set(false);
        this.reconcileAfterTerminal();
        break;
    }
  }

  private reconcileAfterTerminal(): void {
    const jobId = this.activeJobId();
    if (!jobId) return;

    forkJoin({
      status: this.jobRepo.getJobStatus(jobId),
      invoices: this.jobRepo.getJobInvoices(jobId, 1, 100),
    }).subscribe({
      next: ({ status, invoices }) => {
        this.procesadasCount.set(status.procesadas);
        this.errorsCount.set(status.errors);
        this.totalCount.set(status.total);
        this.syncStatus.set(status.estado as SyncJobState);
        this.facturas.update((current) => mergeInvoicesById(
          current,
          invoices.invoices,
          this.firmaId(),
          jobId,
        ));
      },
      error: () => {
        // Keep the last authoritative event snapshot; a later sync can reconcile again.
      },
    });
  }

  private readSyncError(error: unknown): string {
    return error instanceof Error && error.message.trim()
      ? error.message
      : 'No se pudo iniciar la sincronización. Intenta de nuevo.';
  }

  ngOnDestroy(): void {
    this.streamSubscription?.unsubscribe();
    this.streamSubscription = null;
    this.realtime.unsubscribe();
  }

  // ── Sync Siigo completo: cuando los 4 endpoints Siigo terminan bien,
  // refrescamos facturas porque pueden haber cambiado los proveedores
  // / filtros. El botón dentro de la tarjeta Siigo emite este evento
  // desde su `synced` output. ──
  onSiigoSynced(_results: SiigoSyncResult[]): void {
    this.siigoSyncDone.set(4);
    this.facturaRepo.getFacturas(this.nit()).subscribe({
      next: (data: Factura[]) => { this.facturas.set(data); },
      error: () => { /* swallow — la UI del button ya marcó el resultado */ },
    });
  }

  /**
   * Sync Siigo parcial: AL MENOS un endpoint falló. Mostramos un toast
   * warn con la lista de fuentes fallidas y aun así refrescamos
   * facturas — las fuentes que SÍ sincronizaron pueden haber cambiado
   * los datos visibles (p.ej. PUC nuevo → clasificación diferente).
   */
  onSiigoPartialSuccess(results: SiigoSyncResult[]): void {
    this.siigoSyncDone.set(results.length);

    const failed = results.filter((r) => !r.success).map((r) => r.source).join(', ');
    this.message.add({
      severity: 'warn',
      summary: 'Sincronización parcial',
      detail: `Falló: ${failed}. Las facturas existentes siguen disponibles.`,
    });
    this.onSiigoSynced(results);
  }

  // ── Row click navigation ──
  goToFactura(f: Factura): void {
    this.router.navigate(['/clientes', this.nit(), 'factura', f.id], {
      // Forward del state al detalle de factura para que arme su breadcrumb
      // sin tener que re-pegar /api/firmas ni leer /api/clientes/:nit.
      state: {
        clienteNombre: this.clienteNombre(),
        firmaId: this.firmaId(),
        firmaNombre: this.firmaNombre(),
        firmaUser: this.firmaUser(),
        tipoSiigo: this.tipoSiigo(),
      }
    });
  }

  exportSelected(): void {
    const selectedIds = this.selectedFacturas().map((factura) => factura.id);
    if (selectedIds.length === 0 || this.isExporting()) return;

    // Si la firma es contador, el nit del cliente no coincide con el nit
    // propio de la firma (la factura pertenece a la firma dueña del cliente,
    // no a una firma nube). Enviamos `undefined` para que el backend resuelva
    // la propiedad únicamente por `firmas.usuario_id`. Para firmas nube el
    // nit sí es necesario y lo enviamos como siempre.
    const nitForExport = this.tipoSiigo() === 'contador'
      ? undefined
      : this.nit();

    this.isExporting.set(true);
    try {
      this.facturaRepo.exportSelection(nitForExport, selectedIds)
        .pipe(finalize(() => this.isExporting.set(false)))
        .subscribe({
          next: (response) => {
            try {
              if (response.status !== 200 || !response.body) {
                this.showGenericExportError();
                return;
              }
              const counts = this.parseExportHeaders(response);
              this.downloadBlob(response, counts.causables);
              this.showExportSummary(counts.causables, counts.skipped);
            } catch {
              this.showGenericExportError();
            }
          },
          error: (error: unknown) => { void this.handleExportError(error); },
        });
    } catch {
      this.isExporting.set(false);
      this.showGenericExportError();
    }
  }

  private parseExportHeaders(response: HttpResponse<Blob>): { causables: number; skipped: number } {
    return {
      causables: this.parseExportCount(response.headers.get('X-Export-Causables')),
      skipped: this.parseExportCount(response.headers.get('X-Export-Skipped')),
    };
  }

  private parseExportCount(value: string | null): number {
    const count = Number(value);
    return Number.isFinite(count) && count >= 0 ? count : 0;
  }

  /**
   * Un solo toast consolidado para el export. La descarga del archivo ya
   * confirma visualmente el éxito; este toast aporta el desglose causables /
   * omitidas en una sola línea.
   */
  private showExportSummary(causables: number, skipped: number): void {
    let detail: string;
    if (causables > 0 && skipped > 0) {
      detail = `Causadas: ${causables} · Omitidas: ${skipped}`;
    } else if (causables > 0) {
      detail = `Causadas: ${causables}`;
    } else if (skipped > 0) {
      detail = `Omitidas: ${skipped}`;
    } else {
      detail = 'Documento generado';
    }
    this.message.add({
      severity: 'success',
      summary: 'Exportación generada',
      detail,
      life: 4000,
    });
  }

  private downloadBlob(response: HttpResponse<Blob>, causables: number): void {
    const blob = response.body;
    if (!blob) throw new Error('Missing export Blob');

    const objectUrl = URL.createObjectURL(blob);
    let anchor: HTMLAnchorElement | null = null;
    try {
      anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = this.getDownloadFilename(response, causables);
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
    } finally {
      anchor?.remove();
      URL.revokeObjectURL(objectUrl);
    }
  }

  private getDownloadFilename(response: HttpResponse<Blob>, causables: number): string {
    const disposition = response.headers.get('Content-Disposition');
    const encodedFilename = disposition?.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)?.[1];
    const plainFilename = disposition?.match(/filename\s*=\s*"?([^";]+)"?/i)?.[1];
    const filename = encodedFilename ?? plainFilename;
    if (filename) {
      try {
        return decodeURIComponent(filename).replace(/[\\/:*?"<>|]/g, '_');
      } catch {
        return filename.replace(/[\\/:*?"<>|]/g, '_');
      }
    }

    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    return `seleccion-${this.nit()}-${causables}-facturas-${timestamp}.xlsx`;
  }

  private async handleExportError(error: unknown): Promise<void> {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    if (error instanceof HttpErrorResponse && status >= 400 && status < 500) {
      this.message.add({
        severity: 'error',
        summary: 'Error de validación',
        detail: await this.readValidationError(error),
      });
      return;
    }
    this.showGenericExportError();
  }

  private async readValidationError(error: HttpErrorResponse): Promise<string> {
    const fallback = 'No se pudo validar la selección para exportar.';
    if (!(error.error instanceof Blob)) return fallback;

    try {
      const payload = JSON.parse(await error.error.text()) as Record<string, unknown>;
      const envelopeError = payload['error'];
      const nested = envelopeError && typeof envelopeError === 'object'
        ? envelopeError as Record<string, unknown>
        : undefined;
      const code = this.readErrorText(payload['code']) ?? this.readErrorText(nested?.['code']);
      const message = this.readErrorText(payload['message'])
        ?? this.readErrorText(nested?.['message'])
        ?? (typeof envelopeError === 'string' ? envelopeError : undefined);
      if (code && message) return `${code}: ${message}`;
      return message ?? code ?? fallback;
    } catch {
      return fallback;
    }
  }

  private readErrorText(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private showGenericExportError(): void {
    this.message.add({
      severity: 'error',
      summary: 'Error de exportación',
      detail: 'No se pudo exportar la selección. Intenta de nuevo.',
    });
  }

  // ── Cell renderers ──
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

  /**
   * ¿La factura está en un estado exportable a Excel? Solo `lista_para_subir`
   * (puerta explícita después de revisar todas las filas) pasa al export.
   * El resto son estados terminales (`causada`, `finalizada`) o intermedios
   * (`pendiente`, `clasificando`) o inválidos (`error`).
   *
   * Mantenido como función pura para que las pruebas unitarias puedan
   * ejercitar TODAS las ramas sin tener que renderizar la tabla completa.
   */
  isExportable(factura: Factura): boolean {
    const status = (factura as unknown as { status: string }).status;
    return status === 'lista_para_subir';
  }

  /**
   * Slug estable para la clase CSS del badge de status. Refleja el patrón
   * `tipo-badge` existente: una clase por estado con su variante de color.
   * Estados no conocidos caen a `status-unknown` (fallback neutro).
   */
  getStatusSlug(factura: Factura): string {
    const status = (factura as unknown as { status: string }).status;
    if (status === 'pendiente') return 'pendiente';
    if (status === 'clasificando') return 'clasificando';
    if (status === 'lista_para_subir') return 'lista-para-subir';
    if (status === 'causada') return 'causada';
    if (status === 'finalizada') return 'finalizada';
    if (status === 'error') return 'error';
    return 'unknown';
  }

  /**
   * Etiqueta legible para el badge de status. `lista_para_subir` se mapea
   * explícitamente a "Lista Para Subir"; los demás estados capitalizan el
   * slug. Estados desconocidos muestran el slug crudo para no perder info.
   */
  getStatusLabel(factura: Factura): string {
    const status = (factura as unknown as { status: string }).status;
    if (status === 'lista_para_subir') return 'Lista Para Subir';
    const slug = this.getStatusSlug(factura);
    if (slug === 'unknown') return status || '—';
    return slug.charAt(0).toUpperCase() + slug.slice(1);
  }

  /**
   * Adapter a la firma que espera `[rowSelectable]` de PrimeNG
   * (`({ data, index }) => boolean`). Cuando el usuario pulsa el header
   * checkbox, PrimeNG filtra la selección con este predicado — así, las
   * filas no exportables NUNCA entran al `selectedFacturas` vía "seleccionar
   * todo", independientemente del checkbox deshabilitado por fila.
   */
  isRowExportable = ({ data }: { data: Factura; index: number }): boolean =>
    this.isExportable(data);

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