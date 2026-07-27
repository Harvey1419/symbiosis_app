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
  // PR-E.2 (round-3 fix): when true, the badge keeps the
  // "Sincronizando X/Y" wording even if `done === total`. Used by the
  // 1-catalog `SincronizarSiigoCardComponent` so the user sees
  // "Sincronizando 1/1" while the request is in flight (NOT the
  // terminal "Listo"). Default false preserves existing 4-catalog
  // behavior — "Listo" appears the moment the last response lands.
  readonly inFlight = input(false);

  readonly statusText = computed(() => {
    const d = this.done();
    const t = this.total();
    if (this.inFlight() && d === t) return `Sincronizando ${d}/${t}`;
    return d === t ? 'Listo' : `Sincronizando ${d}/${t}`;
  });
}
