import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';

export interface SyncDianSubmitPayload {
  tokenDian: string;
  desde: Date;
  hasta: Date;
}

type SyncDianState = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';

@Component({
  selector: 'app-sync-dian-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    DatePickerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sync-dian-modal.component.html',
  styleUrl: './sync-dian-modal.component.scss',
})
export class SyncDianModalComponent {
  readonly nit = input.required<string>();
  readonly firmaId = input.required<string>();
  readonly visible = input.required<boolean>();
  readonly visibleChange = output<boolean>();
  readonly submitted = output<SyncDianSubmitPayload>();
  readonly closed = output<void>();
  readonly retryRequested = output<SyncDianSubmitPayload>();

  readonly procesadas = input(0);
  readonly errors = input(0);
  readonly total = input(0);
  readonly estado = input<SyncDianState>('pending');
  readonly hasExhaustedItems = input(false);
  readonly submitting = input(false);

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    tokenDian: ['', [Validators.required, Validators.minLength(20)]],
    fechaRange: this.fb.group(
      {
        desde: [null as Date | null, Validators.required],
        hasta: [null as Date | null, Validators.required],
      },
      { validators: [this.dateRangeValidator] },
    ),
  });

  readonly retryTokenControl = this.fb.control('', [
    Validators.required,
    Validators.minLength(20),
  ]);

  readonly terminal = computed(() =>
    ['completed', 'failed', 'partial'].includes(this.estado()),
  );

  onSubmit(): void {
    if (this.form.invalid) return;

    const { tokenDian, fechaRange } = this.form.getRawValue();
    this.submitted.emit({
      tokenDian: tokenDian ?? '',
      desde: fechaRange.desde as Date,
      hasta: fechaRange.hasta as Date,
    });
  }

  onRetry(): void {
    if (this.retryTokenControl.invalid) return;

    const fechaRange = this.form.controls.fechaRange.getRawValue();
    if (!fechaRange.desde || !fechaRange.hasta) return;

    this.retryRequested.emit({
      tokenDian: this.retryTokenControl.value ?? '',
      desde: fechaRange.desde,
      hasta: fechaRange.hasta,
    });
  }

  onClose(): void {
    this.visibleChange.emit(false);
    this.closed.emit();
  }

  private dateRangeValidator(group: AbstractControl): ValidationErrors | null {
    const desde = group.get('desde')?.value as Date | null;
    const hasta = group.get('hasta')?.value as Date | null;
    if (!desde || !hasta) return null;
    return desde.getTime() <= hasta.getTime() ? null : { dateRange: true };
  }
}
