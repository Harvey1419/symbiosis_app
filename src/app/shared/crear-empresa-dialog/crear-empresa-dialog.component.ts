import { Component, ChangeDetectionStrategy, inject, input, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { FirmaRepository, Firma } from '@data/repositories/firma.repository';
import {
  CrearEmpresaSchema,
  UpdateEmpresaSchema,
} from './crear-empresa.schema';

/**
 * CrearEmpresaDialogComponent — modal "Crear Empresa" / "Terminar Registro".
 *
 * Soporta dos modos:
 *   - **Create** (default): `editingFirma` no presente. Muestra los 8 campos
 *     (4 de negocio + 1 tipo_siigo + firma_user + firma_pass).
 *     Botón "Crear empresa". Submit → POST /api/firmas.
 *
 *   - **Edit ("Terminar Registro")**: `editingFirma` presente. Muestra
 *     SOLO los 5 campos de negocio (sin firma_user/firma_pass ni tipo_siigo).
 *     Header cambia a "Completar Registro". Submit → PATCH /api/firmas/:id.
 *
 * PrimeNG `p-dialog` + signals + OnPush + ReactiveForms.
 * Patrón fuente: `impuestos-dialog.component.ts`.
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
export class CrearEmpresaDialogComponent implements OnInit {
  readonly visible = input<boolean>(false);
  /**
   * Si está presente, el dialog opera en modo "Terminar Registro":
   *   - Oculta campos de credenciales (firma_user, firma_pass, tipo_siigo).
   *   - Pre-rellena el form con los datos de la firma.
   *   - Submit hace PATCH /api/firmas/:id en lugar de POST.
   */
  readonly editingFirma = input<Firma | null>(null);

  readonly firmaCreated = output<Firma>();
  readonly firmaUpdated = output<Firma>();
  readonly closed = output<void>();

  readonly loading = signal(false);
  readonly error = signal(false);

  readonly isEditMode = computed(() => this.editingFirma() !== null);
  readonly dialogTitle = computed(() =>
    this.isEditMode() ? 'Completar Registro' : 'Crear Empresa'
  );
  readonly submitLabel = computed(() =>
    this.isEditMode() ? 'Guardar' : 'Crear empresa'
  );

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

  ngOnInit(): void {
    const firma = this.editingFirma();
    if (firma) {
      this.form.patchValue({
        tipo_persona: firma.tipo_persona ?? '',
        nombre: firma.nombre ?? '',
        nit: firma.nit ?? null,
        tipo_id_rep_legal: '',
        id_rep_legal: null,
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();

    if (this.isEditMode()) {
      const parsed = UpdateEmpresaSchema.safeParse(rawValue);
      if (!parsed.success) {
        this.error.set(true);
        return;
      }
      const firma = this.editingFirma();
      if (!firma) return;

      this.loading.set(true);
      this.error.set(false);
      this.firmaRepo.updateFirma(firma.id, parsed.data).subscribe({
        next: (updated) => {
          this.loading.set(false);
          this.firmaUpdated.emit(updated);
          this.onCancel();
        },
        error: () => {
          this.loading.set(false);
          this.error.set(true);
        },
      });
      return;
    }

    // Modo create
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
