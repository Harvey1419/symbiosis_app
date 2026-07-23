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
import { catchError, forkJoin, of } from 'rxjs';
import { ClienteRepository } from '@data/repositories/cliente.repository';

/**
 * Resultado normalizado de UNA fuente del sync Siigo completo. La
 * fuente `source` identifica el endpoint (proveedores, empresas, puc,
 * taxes, trazabilidad) para que el padre pueda decidir qué mostrar
 * en toast/refresh.
 */
export interface SiigoSyncResult {
  source: 'proveedores' | 'empresas' | 'puc' | 'taxes' | 'trazabilidad';
  success: boolean;
  registros?: number;
  error?: string;
}

/**
 * Botón que dispara los 5 endpoints Siigo en paralelo (proveedores,
 * empresas, puc, taxes, trazabilidad) usando `forkJoin`. Pensado para
 * la cabecera de `cliente-detail.component.html`, ARRIBA del pill DIAN.
 *
 * Tres caminos de salida:
 *  - **Todos OK**      → emite `(synced)` → el padre recarga facturas.
 *  - **Algunos OK**   → emite `(partialSuccess)` → toast de aviso + recarga parcial.
 *  - **Todos fallan** → no emite; muestra mensaje de error local.
 *
 * El éxito puntual ("Sincronizado", "Error") se renderiza inline
 * junto al botón y se auto-limpia tras unos segundos.
 */
@Component({
  selector: 'app-sync-siigo-completo-button',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  templateUrl: './sync-siigo-completo-button.component.html',
  styleUrl: './sync-siigo-completo-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncSiigoCompletoButtonComponent {
  readonly nit = input.required<number>();

  /** Emits cuando TODOS los 5 sync succeed — el padre debe refrescar facturas. */
  readonly synced = output<SiigoSyncResult[]>();

  /** Emits cuando AL MENOS 1 succeed pero no todos — partial refresh + toast warn. */
  readonly partialSuccess = output<SiigoSyncResult[]>();

  private readonly clienteRepo = inject(ClienteRepository);

  readonly loading = signal(false);
  readonly justSynced = signal(false);
  readonly hasError = signal(false);
  readonly partialFailed = signal(false);
  readonly results = signal<SiigoSyncResult[]>([]);

  readonly label = computed(() => {
    if (this.loading()) return 'Sincronizando Siigo…';
    if (this.justSynced()) return 'Sincronizado';
    if (this.partialFailed()) return 'Sincronización parcial';
    if (this.hasError()) return 'Error';
    return 'Sincronizar Siigo';
  });

  readonly icon = computed(() => {
    if (this.loading()) return 'pi pi-spin pi-spinner';
    if (this.justSynced()) return 'pi pi-check';
    if (this.partialFailed()) return 'pi pi-exclamation-triangle';
    if (this.hasError()) return 'pi pi-times';
    return 'pi pi-refresh';
  });

  readonly tooltip = computed(() => {
    const failed = this.results()
      .filter((r) => !r.success)
      .map((r) => r.source)
      .join(', ');
    if (failed.length > 0) return `Falló: ${failed}`;
    return 'Trae proveedores, empresas, PUC, taxes y trazabilidad desde Siigo';
  });

  sync(): void {
    this.loading.set(true);
    this.hasError.set(false);
    this.partialFailed.set(false);
    this.justSynced.set(false);
    this.results.set([]);

    const calls = {
      proveedores: this.clienteRepo.sincronizarProveedores(this.nit()).pipe(
        catchError((err: unknown) =>
          of({ success: false, error: this.toMessage(err) }),
        ),
      ),
      empresas: this.clienteRepo.sincronizarEmpresas(this.nit()).pipe(
        catchError((err: unknown) =>
          of({ success: false, error: this.toMessage(err) }),
        ),
      ),
      puc: this.clienteRepo.sincronizarPuc(this.nit()).pipe(
        catchError((err: unknown) =>
          of({ success: false, error: this.toMessage(err) }),
        ),
      ),
      taxes: this.clienteRepo.sincronizarTaxes(this.nit()).pipe(
        catchError((err: unknown) =>
          of({ success: false, error: this.toMessage(err) }),
        ),
      ),
      trazabilidad: this.clienteRepo.sincronizarTrazabilidad(this.nit()).pipe(
        catchError((err: unknown) =>
          of({ success: false, error: this.toMessage(err) }),
        ),
      ),
    };

    forkJoin(calls).subscribe({
      next: (responses) => {
        const collected: SiigoSyncResult[] = (
          Object.keys(responses) as (keyof typeof responses)[]
        ).map((k) => {
          const r = responses[k] as {
            success: boolean;
            registros?: number;
            error?: string;
          };
          return {
            source: k,
            success: r.success,
            registros: r.registros,
            error: r.error,
          };
        });
        this.results.set(collected);
        this.loading.set(false);

        const allOk = collected.every((r) => r.success);
        const someOk = collected.some((r) => r.success);
        if (allOk) {
          this.justSynced.set(true);
          this.synced.emit(collected);
          setTimeout(() => this.justSynced.set(false), 3000);
        } else if (someOk) {
          this.partialFailed.set(true);
          this.partialSuccess.emit(collected);
          setTimeout(() => this.partialFailed.set(false), 5000);
        } else {
          this.hasError.set(true);
          setTimeout(() => this.hasError.set(false), 4000);
        }
      },
      error: () => {
        // forkJoin sólo emite `error` si la fuente completa falla antes
        // de que se conecten las 5 — improbable con catchError local.
        this.loading.set(false);
        this.hasError.set(true);
        setTimeout(() => this.hasError.set(false), 4000);
      },
    });
  }

  private toMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return String(err);
  }
}