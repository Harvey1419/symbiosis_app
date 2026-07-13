import { Injectable, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly primeng = inject(ConfirmationService);

  confirm(opts: {
    title: string;
    message: string;
    acceptLabel?: string;
    rejectLabel?: string;
    acceptButtonStyleClass?: string;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      this.primeng.confirm({
        header: opts.title,
        message: opts.message,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: opts.acceptLabel ?? 'Si',
        rejectLabel: opts.rejectLabel ?? 'No',
        acceptButtonStyleClass: opts.acceptButtonStyleClass ?? 'p-button-danger',
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }
}
