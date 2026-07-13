import { Component, ChangeDetectionStrategy, input, output, booleanAttribute } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

/**
 * SyncBannerComponent — horizontal card with title, sync status, and
 * action button. Designed after the Cifrato "Sincronizar con Siigo Contador"
 * banner.
 *
 * Usage:
 *   <app-sync-banner
 *     title="Sincronizar con Siigo Nube"
 *     subtitle="Actualiza tu información de Siigo Nube en Symbiosis."
 *     [lastSync]="someDate()"
 *     [statusMessage]="'Se sincronizaron 5/5 catálogos correctamente'"
 *     [catalogs]="catalogs()"
 *     [loading]="syncing()"
 *     (sync)="onSync()"
 *   />
 */
@Component({
  selector: 'app-sync-banner',
  standalone: true,
  imports: [CommonModule, DatePipe, ButtonModule, TooltipModule, ProgressSpinnerModule],
  template: `
    <div class="sync-banner">
      <!-- Left: title + subtitle -->
      <div class="banner-lead">
        <h2 class="banner-title">{{ title() }}</h2>
        <p class="banner-subtitle">{{ subtitle() }}</p>
      </div>

      <!-- Center: status -->
      <div class="banner-status">
        @if (statusMessage(); as msg) {
          <p class="status-line">
            <i class="pi pi-check-circle"></i>
            {{ msg }}
          </p>
        } @else {
          <p class="status-line pending">
            <i class="pi pi-info-circle"></i>
            Sin sincronización previa
          </p>
        }

        @if (lastSync(); as date) {
          <p class="status-date">Última sincronización: {{ date | date: 'dd/MM/yyyy, h:mm a' }}</p>
        } @else {
          <p class="status-date muted">Última sincronización: —</p>
        }

        @if (catalogs() && catalogs()!.length > 0) {
          <ul class="catalog-list">
            @for (c of catalogs()!; track c) {
              <li class="catalog-item">
                <i class="pi pi-check"></i>
                <span>{{ c }}</span>
              </li>
            }
          </ul>
        }
      </div>

      <!-- Right: action -->
      <div class="banner-action">
        <p-button
          [label]="loading() ? 'Sincronizando...' : 'Sincronizar'"
          [icon]="loading() ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"
          severity="primary"
          (onClick)="sync.emit()"
          [disabled]="loading()"
        />
      </div>
    </div>
  `,
  styleUrl: './sync-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncBannerComponent {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly lastSync = input<Date | string | null | undefined>(null);
  readonly statusMessage = input<string | null | undefined>(null);
  readonly catalogs = input<readonly string[] | null | undefined>(null);
  readonly loading = input(false, { transform: booleanAttribute });

  /** Emitted when the user clicks "Sincronizar". */
  readonly sync = output<void>();
}