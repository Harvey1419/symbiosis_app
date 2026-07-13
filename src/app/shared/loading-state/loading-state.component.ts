import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  imports: [ProgressSpinnerModule],
  template: `
    <div class="loading-state" [class.compact]="compact()">
      <p-progressSpinner styleClass="loading-spinner" strokeWidth="4" />
      <p class="loading-message">{{ message() }}</p>
    </div>
  `,
  styles: [`
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 3rem 1rem;
      color: var(--color-secondary);

      &.compact { padding: 1rem; }

      .loading-spinner { width: 40px; height: 40px; }
      .loading-message { margin: 0; font-size: 0.95rem; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingStateComponent {
  readonly message = input<string>('Cargando...');
  readonly compact = input<boolean>(false);
}
