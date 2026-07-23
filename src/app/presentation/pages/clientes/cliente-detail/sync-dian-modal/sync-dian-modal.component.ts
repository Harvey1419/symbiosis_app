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

  private readonly rangeValidator = (
    control: AbstractControl,
  ): ValidationErrors | null => {
    const value = control.value as [Date | null, Date | null] | null;
    if (!value || !value[0] || !value[1]) return null;
    return value[0].getTime() <= value[1].getTime() ? null : { dateRange: true };
  };

  readonly form = this.fb.group({
    tokenDian: ['', [Validators.required, Validators.minLength(20)]],
    dateRange: this.fb.control<[Date | null, Date | null] | null>(null, [
      Validators.required,
      this.rangeValidator,
    ]),
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

    const { tokenDian, dateRange } = this.form.getRawValue() as {
      tokenDian: string;
      dateRange: [Date | null, Date | null] | null;
    };
    if (!dateRange || !dateRange[0] || !dateRange[1]) return;

    this.submitted.emit({
      tokenDian: tokenDian ?? '',
      desde: dateRange[0],
      hasta: dateRange[1],
    });
  }

  onRetry(): void {
    if (this.retryTokenControl.invalid) return;

    const dateRange = this.form.controls.dateRange.getRawValue();
    if (!dateRange || !dateRange[0] || !dateRange[1]) return;

    this.retryRequested.emit({
      tokenDian: this.retryTokenControl.value ?? '',
      desde: dateRange[0],
      hasta: dateRange[1],
    });
  }

  onClose(): void {
    this.visibleChange.emit(false);
    this.closed.emit();
  }
}
