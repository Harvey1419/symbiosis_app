import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [TagModule],
  template: `<p-tag [value]="label()" [severity]="severity()"></p-tag>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();

  readonly severity = computed<'success' | 'info' | 'warn' | 'danger' | 'secondary'>(() => {
    const s = this.status();
    if (s === 'active' || s === 'causada' || s === 'completed' || s === 'finalizada') return 'success';
    if (s === 'trialing' || s === 'pendiente' || s === 'clasificando' || s === 'processing') return 'info';
    if (s === 'past_due' || s === 'pending') return 'warn';
    if (s === 'error' || s === 'failed' || s === 'cancelled' || s === 'canceled') return 'danger';
    return 'secondary';
  });

  readonly label = computed(() => {
    const s = this.status();
    return s.charAt(0).toUpperCase() + s.slice(1);
  });
}
