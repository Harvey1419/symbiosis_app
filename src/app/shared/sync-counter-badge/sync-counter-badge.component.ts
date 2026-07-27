import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-sync-counter-badge',
  standalone: true,
  templateUrl: './sync-counter-badge.component.html',
  styleUrl: './sync-counter-badge.component.scss',
})
export class SyncCounterBadgeComponent {
  readonly done = input(0);
  readonly total = input(0);

  readonly statusText = computed(() =>
    this.done() === this.total() ? 'Listo' : `Sincronizando ${this.done()}/${this.total()}`,
  );
}
