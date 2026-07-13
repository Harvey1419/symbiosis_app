import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
import { Factura, UpdateItemBody, HistoricoRow } from '@domain/models/factura.model';
import { CuentaPuc } from '@domain/models/puc.model';
import {
  PageHeaderComponent,
  LoadingStateComponent,
  ErrorBannerComponent,
  EmptyStateComponent,
  StatusBadgeComponent,
  ConfirmService,
} from '@app/shared';

interface ItemDraft {
  cuenta: string;
  iva_code: string;
  rete_code: string;
}

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
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './factura-detail.component.html',
  styleUrl: './factura-detail.component.scss',
})
export class FacturaDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly facturaRepo = inject(FacturaRepository);
  private readonly pucRepo = inject(PucRepository);
  private readonly confirm = inject(ConfirmService);
  private readonly message = inject(MessageService);

  readonly nit = signal<number>(0);
  readonly facturaId = signal<string>('');
  readonly factura = signal<Factura | null>(null);
  readonly historico = signal<HistoricoRow[]>([]);
  readonly cuentasPuc = signal<CuentaPuc[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly actionLoading = signal(false);
  readonly editingIdx = signal<number | null>(null);
  readonly draft = signal<ItemDraft | null>(null);

  /** Items can only be edited while the factura is not yet causada/finalizada. */
  readonly canEdit = computed(() => {
    const s = this.factura()?.status;
    return s === 'pendiente' || s === 'clasificando';
  });

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
    }).subscribe({
      next: ({ factura, historico, puc }) => {
        this.factura.set(factura);
        this.historico.set(historico);
        this.cuentasPuc.set(puc);
        this.loading.set(false);
      },
      error: (err: { message?: string }) => {
        this.error.set(err?.message ?? 'Error al cargar la factura');
        this.loading.set(false);
      },
    });
  }

  // --- Autocomplete for cuenta PUC ---

  searchCuentas(event: AutoCompleteCompleteEvent): CuentaPuc[] {
    const query = event.query.toLowerCase();
    return this.cuentasPuc()
      .filter(
        (c) =>
          c.account_code.toLowerCase().includes(query) ||
          c.account_name.toLowerCase().includes(query),
      )
      .slice(0, 20);
  }

  /** Wrapper for template (avoids $event type issues with strict tsconfig). */
  searchCuentasEvent(event: { query: string }): CuentaPuc[] {
    return this.searchCuentas(event as AutoCompleteCompleteEvent);
  }

  getCuentaName(code: string): string {
    return this.cuentasPuc().find((c) => c.account_code === code)?.account_name ?? '';
  }

  // --- Inline editing ---------------------------------------------------

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
    this.editingIdx.set(null);
    this.draft.set(null);
  }

  updateDraft(field: keyof ItemDraft, value: string): void {
    this.draft.update((d) => (d ? { ...d, [field]: value } : d));
  }

  saveEdit(): void {
    const idx = this.editingIdx();
    const draft = this.draft();
    if (idx === null || !draft) return;

    const body: UpdateItemBody = {
      cuenta: draft.cuenta || undefined,
      iva_code: draft.iva_code || null,
      rete_code: draft.rete_code || null,
    };

    this.actionLoading.set(true);
    this.error.set(null);
    this.facturaRepo.updateItem(this.facturaId(), idx, body).subscribe({
      next: (updated) => {
        this.factura.set(updated);
        this.cancelEdit();
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

  // --- Status actions ---------------------------------------------------

  async causar(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Causar factura',
      message: '¿Confirmas causar esta factura? Una vez causada no podrás editar los items.',
      acceptLabel: 'Causar',
    });
    if (!ok) return;
    this.runAction(this.facturaRepo.causar(this.facturaId()), 'Factura causada');
  }

  async finalizar(): Promise<void> {
    const ok = await this.confirm.confirm({
      title: 'Finalizar factura',
      message: '¿Confirmas finalizar esta factura?',
      acceptLabel: 'Finalizar',
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
    });
    if (!ok) return;
    this.runAction(this.facturaRepo.reabrir(this.facturaId(), target), 'Factura reabierta');
  }

  getConfianzaMin(f: Factura): number {
    if (!f.filas?.length) return 0;
    return Math.min(...f.filas.map((fila) => fila.confianza ?? 0));
  }

  /** Severity for confidence badge: success/warn/danger based on value. */
  getConfianzaSeverity(confianza: number | undefined): 'success' | 'warn' | 'danger' | 'secondary' {
    if (confianza === undefined || confianza === null) return 'secondary';
    if (confianza >= 80) return 'success';
    if (confianza >= 60) return 'warn';
    return 'danger';
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
