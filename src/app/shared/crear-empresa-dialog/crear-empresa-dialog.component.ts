import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { FirmaRepository, Firma } from '@data/repositories/firma.repository';
import { CrearEmpresaSchema } from './crear-empresa.schema';

/**
 * CrearEmpresaDialogComponent — modal "Crear Empresa" (onboarding-empresa).
 *
 * Formulario único (NO wizard) con todos los campos de la firma Siigo.
 * PrimeNG `p-dialog` + signals + OnPush + ReactiveForms.
 * Patrón fuente: `impuestos-dialog.component.ts`.
 *
 * On submit: valida → `FirmaRepository.create()` → emite `firmaCreated` → close.
 * `firma_pass` se envía al backend que la encripta; la respuesta nunca la incluye.
 */
@Component({
  selector: 'app-crear-empresa-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    PasswordModule,
    MessageModule,
  ],
  templateUrl: './crear-empresa-dialog.component.html',
  styleUrl: './crear-empresa-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrearEmpresaDialogComponent {
  readonly visible = input<boolean>(false);

  readonly firmaCreated = output<Firma>();
  readonly closed = output<void>();

  readonly loading = signal(false);
  readonly error = signal(false);

  private readonly firmaRepo = inject(FirmaRepository);
  private readonly fb = inject(FormBuilder);

  readonly tipoPersonaOptions = [
    { label: 'Jurídica', value: 'juridica' },
    { label: 'Natural', value: 'natural' },
  ];
  readonly tipoIdRepLegalOptions = [
    { label: 'Cédula', value: 'cedula' },
    { label: 'Cédula de extranjería', value: 'cedula_extranjeria' },
    { label: 'Pasaporte', value: 'pasaporte' },
  ];
  readonly tipoSiigoOptions = [
    { label: 'Siigo Nube', value: 'nube' },
    { label: 'Contador', value: 'contador' },
  ];

  readonly form = this.fb.group({
    tipo_persona: ['', [Validators.required]],
    nombre: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
    nit: [null as number | null, [Validators.required, Validators.min(1)]],
    tipo_id_rep_legal: ['', [Validators.required]],
    id_rep_legal: [null as number | null, [Validators.required, Validators.min(1)]],
    tipo_siigo: ['', [Validators.required]],
    firma_user: ['', [Validators.required, Validators.email]],
    firma_pass: ['', [Validators.required, Validators.minLength(1)]],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const parsed = CrearEmpresaSchema.safeParse(rawValue);
    if (!parsed.success) {
      this.error.set(true);
      return;
    }

    this.loading.set(true);
    this.error.set(false);

    this.firmaRepo.create(parsed.data).subscribe({
      next: (firma) => {
        this.loading.set(false);
        this.firmaCreated.emit(firma);
        this.onCancel();
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  onCancel(): void {
    this.form.reset();
    this.error.set(false);
    this.closed.emit();
  }
}
