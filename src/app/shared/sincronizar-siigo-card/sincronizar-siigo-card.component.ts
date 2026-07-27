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
 * El éxito y el error se muestran via toast de `MessageService` para no
 * atar el componente a un `p-toast` concreto del host.
 */
@Component({
  selector: 'app-sincronizar-siigo-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
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

    this.firmaRepo.sincronizarEmpresasByUser(firmaUser).subscribe({
      next: (result) => {
        this.loading.set(false);
        this.lastSync.set(new Date());
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
}
