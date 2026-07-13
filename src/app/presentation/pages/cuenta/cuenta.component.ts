import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DividerModule } from 'primeng/divider';
import { forkJoin } from 'rxjs';
import { SuscripcionRepository } from '@data/repositories/suscripcion.repository';
import { SuscripcionMe, UsageRow, Plan } from '@domain/models/suscripcion.model';

@Component({
  selector: 'app-cuenta',
  standalone: true,
  imports: [CommonModule, ProgressBarModule, TagModule, TableModule, DividerModule],
  templateUrl: './cuenta.component.html',
  styleUrl: './cuenta.component.scss',
})
export class CuentaComponent implements OnInit {
  private readonly repo = inject(SuscripcionRepository);

  readonly me = signal<SuscripcionMe | null>(null);
  readonly usage = signal<UsageRow[]>([]);
  readonly planes = signal<Plan[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly usagePercent = computed(() => {
    const m = this.me();
    if (!m || m.limite === 0) return 0;
    return Math.min(100, Math.round((m.used / m.limite) * 100));
  });

  readonly estadoSeverity = computed<'success' | 'info' | 'warn' | 'danger'>(() => {
    const e = this.me()?.estado;
    if (e === 'active') return 'success';
    if (e === 'trialing') return 'info';
    if (e === 'past_due') return 'warn';
    return 'danger';
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      me: this.repo.getMe(),
      usage: this.repo.getUsage(6),
      planes: this.repo.getPlanes(),
    }).subscribe({
      next: ({ me, usage, planes }) => {
        this.me.set(me);
        this.usage.set(usage);
        this.planes.set(planes);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al cargar la cuenta');
        this.loading.set(false);
      },
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  }
}
