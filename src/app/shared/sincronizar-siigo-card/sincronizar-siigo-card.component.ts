import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { FirmaRepository } from '@data/repositories/firma.repository';
import { SyncCounterBadgeComponent } from '@app/shared/sync-counter-badge/sync-counter-badge.component';

export interface SincronizarSiigoResult {
  success: boolean;
  count: number;
  newCount: number;
  newItems: unknown[];
}

/**
 * Reusable "Sincronizar desde Siigo" card (Luminous Dark theme).
 *
 * Centraliza el estilo y el wiring del sync EMPRESAS (per-firma) que
 * antes vivía inline en `firma-clientes.component.html`. El card se
 * renderiza ahora también en `factura-detail` para reemplazar el
 * deep-link roto `Router.navigate(['/clientes', nit], { queryParams:
 * { sync: 'run' } })` (que aterrizaba en la lista de facturas, no en
 * `cliente-detail`).
 *
 * Contrato:
 * - `firmaUser` (required) → identifica la firma; lo que el backend espera en `body.firma_user`.
 * - `firmaId` (optional) → solo para auditoría / trazabilidad; no se envía al backend.
 * - `syncCompleted` (output) → emite el payload completo del use-case para que el padre recargue la lista.
 *
 * PR-E.2 (round-3 fix): empresas is ONE catalog, not five. The card
 * now embeds a `SyncCounterBadgeComponent` with `total=1` and exposes
 * the same `0/1 → 1/1 → Listo` lifecycle as `SyncSiigoCompletoButtonComponent`,
 * so the user has consistent observability across both Siigo sync flows.
 *
 * El éxito y el error se muestran via toast de `MessageService` para no
 * atar el componente a un `p-toast` concreto del host.
 */
@Component({
  selector: 'app-sincronizar-siigo-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule, SyncCounterBadgeComponent],
  templateUrl: './sincronizar-siigo-card.component.html',
  styleUrl: './sincronizar-siigo-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SincronizarSiigoCardComponent {
  private readonly firmaRepo = inject(FirmaRepository);
  private readonly message = inject(MessageService);

  readonly firmaUser = input.required<string>();
  /** Solo para auditoría / logging — NO se envía al backend. */
  readonly firmaId = input<string>('');

  readonly syncCompleted = output<SincronizarSiigoResult>();

  readonly loading = signal(false);
  readonly lastError = signal<string | null>(null);
  readonly lastSync = signal<Date | null>(null);

  // PR-E.2: empresas is a single catalog. We expose `totalCatalogs=1`
  // so the badge shows "Sincronizando X/1" rather than "X/4" or nothing.
  // The "done" counter increments to 1 immediately on sync() — it marks
  // the in-flight request, not its resolution. The badge stays
  // "Sincronizando 1/1" while loading=true (via `inFlight=true` on the
  // badge) and flips to "Listo" the moment loading flips to false and
  // `justSynced` is true.
  readonly totalCatalogs = computed(() => 1);
  readonly inFlightDone = signal(0);
  readonly justSynced = signal(false);
  private justSyncedTimer: ReturnType<typeof setTimeout> | null = null;

  readonly buttonLabel = computed(() => (this.loading() ? 'Sincronizando…' : 'Sincronizar'));
  readonly buttonIcon = computed(() =>
    this.loading() ? 'pi pi-spin pi-spinner' : 'pi pi-refresh',
  );
  readonly ariaBusy = computed(() => (this.loading() ? 'true' : 'false'));

  sync(): void {
    const firmaUser = this.firmaUser();
    if (!firmaUser) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin firma seleccionada',
        detail: 'No se puede sincronizar empresas sin una firma activa.',
        life: 3000,
      });
      return;
    }

    this.loading.set(true);
    this.lastError.set(null);
    // Marca "1 catalog en vuelo" inmediatamente — el badge muestra
    // "Sincronizando 1/1" mientras loading=true (la respuesta no ha
    // llegado todavía). Cuando loading=false y justSynced=true, el
    // badge pasa a "Listo" (terminal wording) por su lógica propia.
    this.inFlightDone.set(1);
    this.justSynced.set(false);
    if (this.justSyncedTimer) clearTimeout(this.justSyncedTimer);

    this.firmaRepo.sincronizarEmpresasByUser(firmaUser).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.lastSync.set(new Date());
        this.justSynced.set(true);
        if (this.justSyncedTimer) clearTimeout(this.justSyncedTimer);
         this.justSyncedTimer = setTimeout(() => {
           this.justSynced.set(false);
           this.inFlightDone.set(0);
         }, 3000);
        this.message.add({
          severity: 'success',
          summary: 'Sincronizado',
          detail:
            result.newCount > 0
              ? `${result.newCount} empresa(s) nueva(s) · ${result.count} en total`
              : `Sin cambios (${result.count} empresa(s))`,
          life: 3000,
        });
        this.syncCompleted.emit(result);
      },
      error: (err: { error?: { message?: string; error?: string }; message?: string }) => {
        this.loading.set(false);
        this.justSynced.set(false);
        if (this.justSyncedTimer) clearTimeout(this.justSyncedTimer);
        // En error, reset done a 0 — el badge NO debe mostrar
        // "Sincronizando 1/1" ni "Listo" cuando la sincronización falló.
        this.inFlightDone.set(0);
        const msg =
          err?.error?.message ??
          err?.error?.error ??
          err?.message ??
          'Error al sincronizar desde Siigo';
        this.lastError.set(msg);
        this.message.add({
          severity: 'error',
          summary: 'No se pudo sincronizar',
          detail: msg,
          life: 5000,
        });
      },
    });
  }

  /** Test helper: clear the terminal `justSynced` flag manually so specs
   * can verify the badge hides without waiting 3 s for the timer. */
  clearTerminalState(): void {
    this.justSynced.set(false);
    this.inFlightDone.set(0);
    if (this.justSyncedTimer) {
      clearTimeout(this.justSyncedTimer);
      this.justSyncedTimer = null;
    }
  }
}
