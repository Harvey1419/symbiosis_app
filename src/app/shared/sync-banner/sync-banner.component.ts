import { Component, ChangeDetectionStrategy, input, output, booleanAttribute } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SyncCounterBadgeComponent } from '../sync-counter-badge/sync-counter-badge.component';

@Component({
  selector: 'app-sync-banner',
  standalone: true,
  imports: [CommonModule, DatePipe, ButtonModule, TooltipModule, ProgressSpinnerModule, SyncCounterBadgeComponent],
  template: `
    <div class="sync-banner">
      <div class="banner-lead"><h2 class="banner-title">{{ title() }}</h2><p class="banner-subtitle">{{ subtitle() }}</p></div>
      <div class="banner-status">
        @if (done() !== null && total() !== null) {
          <app-sync-counter-badge [done]="done() ?? 0" [total]="total() ?? 0" />
        } @else if (statusMessage(); as msg) {
          <p class="status-line"><i class="pi pi-check-circle"></i>{{ msg }}</p>
        } @else {
          <p class="status-line pending"><i class="pi pi-info-circle"></i>Sin sincronización previa</p>
        }
        @if (lastSync(); as date) { <p class="status-date">Última sincronización: {{ date | date: 'dd/MM/yyyy, h:mm a' }}</p> }
        @else { <p class="status-date muted">Última sincronización: —</p> }
        @if (catalogs() && catalogs()!.length > 0) { <ul class="catalog-list">@for (c of catalogs()!; track c) { <li class="catalog-item"><i class="pi pi-check"></i><span>{{ c }}</span></li> }</ul> }
      </div>
      <div class="banner-action"><p-button [label]="loading() ? 'Sincronizando...' : 'Sincronizar'" [icon]="loading() ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'" severity="primary" (onClick)="sync.emit()" [disabled]="loading()" /></div>
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
  readonly done = input<number | null>(null);
  readonly total = input<number | null>(null);
  readonly sync = output<void>();
}
