import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, type Observable } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';

// PrimeNG modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
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

interface CuentaOption {
  account_code: string;
  account_name: string;
  display: string; // "51050301 - Salario integral"
}

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
  readonly cuentasPuc = signal<CuentaPuc[]>([]);
  readonly impuestos = signal<readonly Impuesto[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionLoading = signal(false);

  // ── Dirty state tracking ──
  readonly dirtyRows = signal<Set<number>>(new Set());

  /** Impuestos dialog state. */
  readonly impuestosDialogOpen = signal(false);
  readonly editingRowIdx = signal<number | null>(null);
  private readonly router = inject(Router);

  /** Items can only be edited while the factura is not yet causada/finalizada. */
  readonly canEdit = computed(() => {
    const s = this.factura()?.status;
    return s === 'pendiente' || s === 'clasificando';
  });

  /** Computed: PUC options formatted as "51050301 - Salario integral". */
  readonly cuentasOptions = computed<CuentaOption[]>(() =>
    this.cuentasPuc().map((c) => ({
      account_code: c.account_code,
      account_name: c.account_name,
      display: `${c.account_code} — ${c.account_name}`,
    })),
  );

  /** Default cuenta for crédito (cash/bank) rows. Used as placeholder
   *  when the user hasn't assigned a specific cuenta yet. 11200501 is
   *  the standard PUC code for "Bancos" in Colombia — the typical
   *  contrapartida (where the money comes from) for causaciones. */
  readonly DEFAULT_CREDITO_CUENTA = '11200501';

  // ── Totales computados (estilo Cifrato) ──────────────────────

  /** Suma de débitos (filas donde el dinero se gasta). */
  readonly subtotal = computed<number>(() => {
    const f = this.factura();
    if (!f) return 0;
    return f.filas.reduce((sum, fila) => sum + (fila.debito ?? 0), 0);
  });

  /** Suma de IVA + Rete estimado (heurístico: 0 si no hay % configurado
   *  en clientes_impuestos; si hay, multiplicamos el débito por la
   *  tasa del impuesto asignado). En MVP usamos 0 — el contador revisa
   *  manualmente con su catálogo de Siigo. */
  readonly totalImpuestos = computed<number>(() => {
    const f = this.factura();
    if (!f) return 0;
    return f.filas.reduce((sum, fila) => {
      const base = fila.debito ?? 0;
      const ivaPct = this.impuestos().find((i) => i.codigo === fila.iva_code)?.percentage ?? 0;
      const retePct = this.impuestos().find((i) => i.codigo === fila.rete_code)?.percentage ?? 0;
      return sum + (base * ivaPct / 100) - (base * retePct / 100);
    }, 0);
  });

  /** Total = Subtotal + Impuestos. */
  readonly total = computed<number>(() =>
    this.subtotal() + this.totalImpuestos(),
  );

  /** Default cuenta for a row: if it's a crédito (where the money comes
   *  from), suggest 11200501 (Bancos) as a placeholder; otherwise null. */
  defaultCuentaPlaceholder(fila: { debito?: number | null; credito?: number | null; cuenta?: string | null }): string {
    if (fila.cuenta) return fila.cuenta;
    if ((fila.credito ?? 0) > 0) return this.DEFAULT_CREDITO_CUENTA;
    return '';
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

  /** Navigate back to the client's factura list. */
  goBack(): void {
    this.router.navigate(['/clientes', this.nit()]);
  }

  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      factura: this.facturaRepo.getById(this.facturaId()),
      puc: this.pucRepo.getCuentaPuc(this.nit()),
      impuestos: this.impuestosRepo.getImpuestosByNit(this.nit()),
    }).subscribe({
      next: ({ factura, puc, impuestos }) => {
        this.factura.set(factura);
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

  // ── Helpers ──────────────────────────────────────────────────

  getCuentaName(code: string): string {
    return this.cuentasPuc().find((c) => c.account_code === code)?.account_name ?? '';
  }

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

  formatTrackId(trackId: string | null | undefined): string {
    if (!trackId) return '—';
    if (trackId.length <= 24) return trackId;
    return trackId.slice(0, 16) + '…' + trackId.slice(-4);
  }

  /** Copy Track ID (a.k.a. CUFE) to clipboard. */
  copyTrackId(): void {
    const trackId = this.factura()?.track_id;
    if (!trackId) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(trackId).then(
        () => this.message.add({ severity: 'success', summary: 'Track ID copiado', detail: trackId, life: 2000 }),
        () => this.message.add({ severity: 'error', summary: 'No se pudo copiar el Track ID' }),
      );
    } else {
      const ta = document.createElement('textarea');
      ta.value = trackId;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        this.message.add({ severity: 'success', summary: 'Track ID copiado', life: 2000 });
      } catch {
        this.message.add({ severity: 'error', summary: 'No se pudo copiar el Track ID' });
      }
      document.body.removeChild(ta);
    }
  }

  // ── Dirty state ─────────────────────────────────────────────

  isDirty(idx: number): boolean {
    return this.dirtyRows().has(idx);
  }

  dirtyCount(): number {
    return this.dirtyRows().size;
  }

  hasDirtyRows(): boolean {
    return this.dirtyRows().size > 0;
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

  // ── Cuenta PUC: p-select auto-save on change ──────────────────

  /** When the user picks a cuenta from the p-select. */
  onCuentaChanged(idx: number, value: string | null): void {
    if (!this.canEdit()) return;
    const f = this.factura();
    if (!f) return;
    const updatedFilas = f.filas.map((row, i) =>
      i === idx ? { ...row, cuenta: value || null } : row,
    );
    this.factura.set({ ...f, filas: updatedFilas });
    this.markDirty(idx);
  }

  // ── Impuestos: open modal on cell click ───────────────────────

  onImpuestosCellClick(idx: number): void {
    if (!this.canEdit()) return;
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

  // ── Save row (PATCH) ─────────────────────────────────────────

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

  saveAll(): void {
    const dirty = Array.from(this.dirtyRows());
    if (dirty.length === 0) return;
    this.actionLoading.set(true);
    // Sequential PATCH per row
    const next = () => {
      if (dirty.length === 0) {
        this.actionLoading.set(false);
        this.message.add({ severity: 'success', summary: 'Todos los cambios guardados' });
        return;
      }
      const idx = dirty.shift()!;
      this.saveRow(idx);
    };
    // Override actionLoading-resetting in saveRow
    const original = this.saveRow.bind(this);
    this.saveRow = (i: number) => {
      original(i);
      this.actionLoading.set(true);
      setTimeout(next, 50);
    };
    setTimeout(() => { this.saveRow = original; }, dirty.length * 200);
    next();
  }

  discardAll(): void {
    if (this.dirtyRows().size === 0) return;
    this.ngOnInit();
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