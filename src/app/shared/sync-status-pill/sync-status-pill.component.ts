import { Component, ChangeDetectionStrategy, input, output, booleanAttribute } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SyncCounterBadgeComponent } from '../sync-counter-badge/sync-counter-badge.component';

@Component({
  selector: 'app-sync-status-pill',
  standalone: true,
  imports: [CommonModule, DatePipe, ButtonModule, TooltipModule, SyncCounterBadgeComponent],
  template: `
    <div class="sync-pill" [class.syncing]="loading()">
      <i class="pi pi-refresh status-icon" [class.spinning]="loading()"></i>
      <div class="pill-text">
        <span class="service-name">{{ service() }}</span>
        <span class="separator">·</span>
        @if (done() !== null && total() !== null) {
          <app-sync-counter-badge [done]="done() ?? 0" [total]="total() ?? 0" />
        } @else {
          @switch (status()) {
            @case ('ok') {
              <span class="status-ok">Sincronizado @if (lastSync(); as d) { · {{ d | date: 'd MMM, h:mm a' }} }</span>
            }
            @case ('pending') { <span class="status-pending">Sincronización pendiente</span> }
            @default { <span class="status-never">Nunca sincronizado</span> }
          }
        }
      </div>
      <p-button
        [label]="loading() ? 'Sincronizando…' : 'Sincronizar ahora'"
        [icon]="loading() ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'"
        severity="primary" size="small" [text]="true" [disabled]="loading()"
        (onClick)="sync.emit()" styleClass="sync-btn"
      />
    </div>
  `,
  styleUrl: './sync-status-pill.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncStatusPillComponent {
  readonly service = input.required<string>();
  readonly lastSync = input<Date | string | null | undefined>(null);
  readonly status = input<'ok' | 'pending' | 'never'>('never');
  readonly loading = input(false, { transform: booleanAttribute });
  readonly done = input<number | null>(null);
  readonly total = input<number | null>(null);
  readonly sync = output<void>();
}
