import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe, JsonPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { TabsModule } from 'primeng/tabs';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { JobRepository, JobError, JobInvoice } from '@data/repositories/job.repository';
import {
  PageHeaderComponent,
  LoadingStateComponent,
  ErrorBannerComponent,
  EmptyStateComponent,
} from '@app/shared';

type JobTab = 'invoices' | 'errores';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    JsonPipe,
    RouterLink,
    TabsModule,
    TableModule,
    ButtonModule,
    CardModule,
    TagModule,
    TooltipModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorBannerComponent,
    EmptyStateComponent,
  ],
  templateUrl: './job-detail.component.html',
  styleUrl: './job-detail.component.scss',
})
export class JobDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly repo = inject(JobRepository);

  readonly jobId = signal<string>('');
  readonly invoices = signal<JobInvoice[]>([]);
  readonly errors = signal<JobError[]>([]);
  readonly invoicesTotal = signal(0);
  readonly errorsTotal = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly activeTab = signal<JobTab>('invoices');

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('jobId');
    if (!id) {
      this.error.set('ID de job no proporcionado');
      this.loading.set(false);
      return;
    }
    this.jobId.set(id);
    this.loadAll();
  }

  private loadAll(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      invoices: this.repo.getJobInvoices(this.jobId(), 1, 100),
      errors: this.repo.getJobErrores(this.jobId(), 1, 100),
    }).subscribe({
      next: ({ invoices, errors }) => {
        this.invoices.set(invoices.invoices);
        this.invoicesTotal.set(invoices.meta.total);
        this.errors.set(errors.errors);
        this.errorsTotal.set(errors.meta.total);
        this.loading.set(false);
      },
      error: (err: { message?: string }) => {
        this.error.set(err?.message ?? 'Error al cargar el job');
        this.loading.set(false);
      },
    });
  }

  switchTab(tab: JobTab): void {
    this.activeTab.set(tab);
  }
}
