import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

export interface ConfirmOptions {
  title: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  /** Severity: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast' */
  acceptSeverity?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast';
  rejectSeverity?: 'primary' | 'secondary' | 'success' | 'info' | 'warn' | 'help' | 'danger' | 'contrast';
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly primeng = inject(ConfirmationService);

  confirm(opts: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.primeng.confirm({
        header: opts.title,
        message: opts.message,
        icon: opts.icon ?? 'pi pi-exclamation-triangle',
        acceptButtonProps: {
          label: opts.acceptLabel ?? 'Sí',
          severity: opts.acceptSeverity ?? 'danger',
        },
        rejectButtonProps: {
          label: opts.rejectLabel ?? 'No',
          severity: opts.rejectSeverity ?? 'secondary',
          outlined: true,
        },
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }
}
