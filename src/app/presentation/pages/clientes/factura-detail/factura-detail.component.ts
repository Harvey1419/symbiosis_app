import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, type Observable } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';

// PrimeNG modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { FacturaRepository } from '@data/repositories/factura.repository';
import { PucRepository } from '@data/repositories/puc.repository';
import { ImpuestosRepository } from '@data/repositories/impuestos.repository';
import { Factura, UpdateItemBody } from '@domain/models/factura.model';
import { CuentaPuc } from '@domain/models/puc.model';
import { Impuesto } from '@domain/models/impuesto.model';
import {
  PageHeaderComponent,
  LoadingStateComponent,
  ErrorBannerComponent,
  EmptyStateComponent,
  StatusBadgeComponent,
  ConfirmService,
  ImpuestosDialogComponent,
} from '@app/shared';

type ReabrirTarget = 'pendiente' | 'causada';

@Component({
  selector: 'app-factura-detail',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    // PrimeNG
    TableModule,
    ButtonModule,
    CardModule,
    SelectModule,
    InputTextModule,
    AutoCompleteModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    TagModule,
    TooltipModule,
    // Shared
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    ImpuestosDialogComponent,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './factura-detail.component.html',
  styleUrl: './factura-detail.component.scss',
})
export class FacturaDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly facturaRepo = inject(FacturaRepository);
  private readonly pucRepo = inject(PucRepository);
  private readonly impuestosRepo = inject(ImpuestosRepository);
  private readonly confirm = inject(ConfirmService);
  private readonly message = inject(MessageService);

  // ── Core data ──
  readonly nit = signal<number>(0);
  readonly facturaId = signal<string>('');
  readonly factura = signal<Factura | null>(null);
  readonly historico = signal<unknown[]>([]);
  readonly cuentasPuc = signal<CuentaPuc[]>([]);
  readonly cuentasFiltradas = signal<CuentaPuc[]>([]);
  readonly impuestos = signal<readonly Impuesto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionLoading = signal(false);

  // ── Dirty state tracking ──
  /** Indices of filas with unsaved local changes. */
  readonly dirtyRows = signal<Set<number>>(new Set());
  /** Index of fila currently being edited inline. */
  readonly editingIdx = signal<number | null>(null);
  /** Local working copy of the row being edited. */
  readonly draft = signal<{ cuenta: string; iva_code: string; rete_code: string } | null>(null);

  /** Impuestos dialog state. */
  readonly impuestosDialogOpen = signal(false);
  readonly editingRowIdx = signal<number | null>(null);

  /** Items can only be edited while the factura is not yet causada/finalizada. */
  readonly canEdit = computed(() => {
    const s = this.factura()?.status;
    return s === 'pendiente' || s === 'clasificando';
  });

  constructor() {
    // When dialog opens, load current row's codes into the dialog.
    effect(() => {
      if (this.impuestosDialogOpen()) {
        // No-op: dialog reads current values via input() bindings in template.
      }
    });
  }

  ngOnInit(): void {
    const nitParam = this.route.snapshot.paramMap.get('nit');
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!nitParam || !idParam) {
      this.error.set('Parámetros de ruta inválidos');
      this.loading.set(false);
      return;
    }
    this.nit.set(Number(nitParam));
    this.facturaId.set(idParam);
    this.loadAll();
  }

  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      factura: this.facturaRepo.getById(this.facturaId()),
      historico: this.facturaRepo.getHistorico(this.facturaId()),
      puc: this.pucRepo.getCuentaPuc(this.nit()),
      impuestos: this.impuestosRepo.getImpuestosByNit(this.nit()),
    }).subscribe({
      next: ({ factura, historico, puc, impuestos }) => {
        this.factura.set(factura);
        this.historico.set(historico);
        this.cuentasPuc.set(puc);
        this.impuestos.set(impuestos.filter((i) => i.active));
        this.loading.set(false);
      },
      error: (err: { message?: string }) => {
        this.error.set(err?.message ?? 'Error al cargar la factura');
        this.loading.set(false);
      },
    });
  }

  // ── Autocomplete for cuenta PUC ──────────────────────────────────

  searchCuentas(event: AutoCompleteCompleteEvent): void {
    const query = event.query.toLowerCase();
    const filtered = this.cuentasPuc()
      .filter(
        (c) =>
          c.account_code.toLowerCase().includes(query) ||
          c.account_name.toLowerCase().includes(query),
      )
      .slice(0, 20);
    this.cuentasFiltradas.set(filtered);
  }

  getCuentaName(code: string): string {
    return this.cuentasPuc().find((c) => c.account_code === code)?.account_name ?? '';
  }

  // ── Dirty state helpers ──────────────────────────────────────────

  isDirty(idx: number): boolean {
    return this.dirtyRows().has(idx);
  }

  private markDirty(idx: number): void {
    this.dirtyRows.update((s) => {
      const next = new Set(s);
      next.add(idx);
      return next;
    });
  }

  private clearDirty(idx: number): void {
    this.dirtyRows.update((s) => {
      const next = new Set(s);
      next.delete(idx);
      return next;
    });
  }

  // ── Inline editing (cuenta only) ────────────────────────────────

  startEdit(idx: number): void {
    const fila = this.factura()?.filas[idx];
    if (!fila) return;
    this.editingIdx.set(idx);
    this.draft.set({
      cuenta: fila.cuenta ?? '',
      iva_code: fila.iva_code ?? '',
      rete_code: fila.rete_code ?? '',
    });
  }

  cancelEdit(): void {
    const idx = this.editingIdx();
    if (idx !== null) this.clearDirty(idx);
    this.editingIdx.set(null);
    this.draft.set(null);
  }

  updateDraft(field: 'cuenta' | 'iva_code' | 'rete_code', value: string): void {
    this.draft.update((d) => (d ? { ...d, [field]: value } : d));
  }

  // ── Impuestos dialog ─────────────────────────────────────────────

  openImpuestosModal(idx: number): void {
    this.editingRowIdx.set(idx);
    this.impuestosDialogOpen.set(true);
  }

  applyImpuestosToRow(event: { iva_code: string | null; rete_code: string | null }): void {
    const idx = this.editingRowIdx();
    if (idx === null) return;
    const f = this.factura();
    if (!f) return;
    const updatedFilas = f.filas.map((row, i) =>
      i === idx
        ? { ...row, iva_code: event.iva_code, rete_code: event.rete_code }
        : row,
    );
    this.factura.set({ ...f, filas: updatedFilas });
    this.markDirty(idx);
    this.impuestosDialogOpen.set(false);
    this.editingRowIdx.set(null);
  }

  // ── Save row (PATCH) ─────────────────────────────────────────────

  saveRow(idx: number): void {
    const f = this.factura();
    const fila = f?.filas[idx];
    if (!f || !fila) return;

    const body: UpdateItemBody = {
      cuenta: fila.cuenta ?? undefined,
      iva_code: fila.iva_code ?? null,
      rete_code: fila.rete_code ?? null,
    };

    this.actionLoading.set(true);
    this.facturaRepo.updateItem(this.facturaId(), idx, body).subscribe({
      next: (updated) => {
        this.factura.set(updated);
        this.clearDirty(idx);
        this.actionLoading.set(false);
        this.message.add({ severity: 'success', summary: 'Fila guardada' });
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        const msg = err?.error?.message ?? err?.message ?? 'Error al guardar el item';
        this.error.set(msg);
        this.message.add({ severity: 'error', summary: 'Error', detail: msg });
        this.actionLoading.set(false);
      },
    });
  }

  // ── Status actions (Causar / Finalizar / Reabrir) ─────────────

  async causar(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Causar factura',
      message: '¿Confirmas causar esta factura? Una vez causada no podrás editar los items.',
      acceptLabel: 'Causar',
      acceptSeverity: 'primary',
    });
    if (!ok) return;
    this.runAction(this.facturaRepo.causar(this.facturaId()), 'Factura causada');
  }

  async finalizar(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Finalizar factura',
      message: '¿Confirmas finalizar esta factura?',
      acceptLabel: 'Finalizar',
      acceptSeverity: 'success',
    });
    if (!ok) return;
    this.runAction(this.facturaRepo.finalizar(this.facturaId()), 'Factura finalizada');
  }

  async reabrir(target: ReabrirTarget): Promise<void> {
    const ok = await this.confirm.confirm({
      title: target === 'pendiente' ? 'Reabrir a pendiente' : 'Reabrir a causada',
      message:
        target === 'pendiente'
          ? 'La factura volverá a pendiente y se podrán editar los items.'
          : 'La factura volverá a causada.',
      acceptLabel: 'Reabrir',
      acceptSeverity: 'warn',
    });
    if (!ok) return;
    this.runAction(this.facturaRepo.reabrir(this.facturaId(), target), 'Factura reabierta');
  }

  // ── Status formatting ───────────────────────────────────────────

  formatStatus(status: string): string {
    const map: Record<string, string> = {
      pendiente: 'Pendiente',
      causada: 'Causada',
      finalizada: 'Finalizada',
      error: 'Error',
      clasificando: 'Clasificando',
    };
    return map[status] || status;
  }

  formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return d; }
  }

  formatMoney(n: number | null | undefined): string {
    if (n === null || n === undefined) return '0';
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
  }

  formatCufe(cufe: string | null | undefined): string {
    if (!cufe) return '—';
    // DIAN CUFE is long; show first 12 + ellipsis
    if (cufe.length > 16) return cufe.slice(0, 12) + '…' + cufe.slice(-4);
    return cufe;
  }

  // ── Internal helpers ─────────────────────────────────────────────

  private runAction(obs: Observable<Factura>, successMsg: string): void {
    this.actionLoading.set(true);
    this.error.set(null);
    obs.subscribe({
      next: (updated) => {
        this.factura.set(updated);
        this.actionLoading.set(false);
        this.message.add({ severity: 'success', summary: successMsg });
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        const msg = err?.error?.message ?? err?.message ?? 'Error en la acción';
        this.error.set(msg);
        this.message.add({ severity: 'error', summary: 'Error', detail: msg });
        this.actionLoading.set(false);
      },
    });
  }
}