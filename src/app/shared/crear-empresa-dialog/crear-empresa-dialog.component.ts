import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal,
  computed,
  effect,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { FirmaRepository, Firma } from '@data/repositories/firma.repository';
import { ConfirmService } from '@app/shared/confirm-dialog/confirm.service';
import { CrearEmpresaSchema, UpdateEmpresaSchema, UpdateEmpresaInput } from './crear-empresa.schema';

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
 *     Header cambia a "Completar Registro". Submit → PATCH /api/empresas/:nit.
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
    DividerModule,
  ],
  templateUrl: './crear-empresa-dialog.component.html',
  styleUrl: './crear-empresa-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrearEmpresaDialogComponent {
  readonly visible = input<boolean>(false);
  /**
   * Si está presente, el dialog opera en modo "Terminar Registro":
   *   - Oculta campos de credenciales (firma_user, firma_pass, tipo_siigo).
   *   - Pre-rellena el form con los datos de la firma.
   *   - Submit hace PATCH /api/empresas/:nit en lugar de POST.
   */
  readonly editingFirma = input<Firma | null>(null);

  readonly firmaCreated = output<Firma>();
  readonly firmaUpdated = output<Firma>();
  readonly firmaDeleted = output<Firma>();
  readonly closed = output<void>();

  readonly loading = signal(false);
  readonly deleting = signal(false);
  readonly error = signal(false);
  /** Mensaje del último error (status + body) para debugging del usuario. */
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => this.editingFirma() !== null);
  readonly dialogTitle = computed(() =>
    this.isEditMode() ? 'Completar Registro' : 'Crear Empresa',
  );
  readonly submitLabel = computed(() => (this.isEditMode() ? 'Guardar' : 'Crear empresa'));

  private readonly firmaRepo = inject(FirmaRepository);
  private readonly fb = inject(FormBuilder);
  /** PrimeNG global toast — provisto en `app.config.ts:111`. WU-7. */
  private readonly message = inject(MessageService);
  private readonly confirm = inject(ConfirmService);

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const firma = this.editingFirma();
      if (isVisible) {
        untracked(() => {
          // Campos de credenciales + tipo_siigo: solo se piden en modo
          // create. En edit mode se deshabilitan y limpian sus validadores.
          for (const field of ['tipo_siigo', 'firma_user', 'firma_pass'] as const) {
            const ctrl = this.form.get(field);
            if (firma) {
              ctrl?.clearValidators();
              ctrl?.disable();
            } else {
              ctrl?.enable();
              if (field === 'tipo_siigo') {
                ctrl?.setValidators([Validators.required]);
              } else if (field === 'firma_user') {
                ctrl?.setValidators([Validators.required, Validators.email]);
              } else if (field === 'firma_pass') {
                ctrl?.setValidators([Validators.required, Validators.minLength(1)]);
              }
            }
            ctrl?.updateValueAndValidity();
          }

// Campos de negocio en edit mode: solo `nit` está BLOQUEADO porque es el
// route parameter del endpoint (`PATCH /api/empresas/:nit`) y no se puede
// cambiar por este flow. Los demás campos (`tipo_persona`, `nombre`,
// `tipo_id_rep_legal`, `id_rep_legal`) son editables — ver
// UpdateEmpresaSchema para los campos que viajan en el body.
for (const field of ['nit'] as const) {
  const ctrl = this.form.get(field);
  if (firma) {
    ctrl?.clearValidators();
    ctrl?.disable();
  } else {
    ctrl?.enable();
    ctrl?.setValidators([Validators.required]);
    ctrl?.updateValueAndValidity();
  }
}

          if (firma) {
            this.form.patchValue({
              tipo_persona: this.normalizeTipoPersona(firma.tipo_persona),
              nombre: firma.nombre ?? '',
              nit: firma.nit ?? null,
              tipo_id_rep_legal: this.normalizeTipoId(firma.tipo_id_rep_legal),
              id_rep_legal: firma.id_rep_legal ?? null,
            });
          } else {
            this.form.reset();
          }
        });
      }
    });
  }

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
    firma_pass: ['', [Validators.required]],
  });

  normalizeTipoPersona(val: string | null | undefined): string {
    if (!val) return '';
    const normalized = val.toLowerCase().trim();
    if (normalized.includes('juridica') || normalized.includes('jurídica')) {
      return 'juridica';
    }
    if (normalized.includes('natural')) {
      return 'natural';
    }
    return normalized;
  }

  normalizeTipoId(val: string | null | undefined): string {
    if (!val) return '';
    const normalized = val.toLowerCase().trim();
    if (
      normalized.includes('cedula_extranjeria') ||
      normalized.includes('cédula de extranjería') ||
      normalized.includes('cedula de extranjeria') ||
      normalized.includes('extranjeria') ||
      normalized.includes('extranjería')
    ) {
      return 'cedula_extranjeria';
    }
    if (normalized.includes('cedula') || normalized.includes('cédula')) {
      return 'cedula';
    }
    if (normalized.includes('pasaporte')) {
      return 'pasaporte';
    }
    return normalized;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();

    // Coercionar string → number. <input type="number" formControlName="...">
    // con pInputText devuelve STRING (porque pInputText NO usa NumberValueAccessor
    // automáticamente). Zod requiere `z.number().int().positive()` para nit e
    // id_rep_legal — sin coerción, save falla silenciosamente.
    const coerced = {
      ...rawValue,
      nit: this.toNumber(rawValue.nit),
      id_rep_legal: this.toNumber(rawValue.id_rep_legal),
    };

    if (this.isEditMode()) {
      const parsed = UpdateEmpresaSchema.safeParse(coerced);
      if (!parsed.success) {
        this.setError('Validación local falló', JSON.stringify(parsed.error.format()));
        return;
      }
      const firma = this.editingFirma();
      if (!firma) return;

      const targetNit = firma.nit !== null ? firma.nit : coerced.nit;
      if (!targetNit) {
        this.setError('No se puede actualizar la empresa', 'El NIT es requerido.');
        return;
      }

      this.loading.set(true);
      this.clearError();

      const payload: UpdateEmpresaInput = {
        ...parsed.data,
        firmaId: firma.id,
      };

      this.firmaRepo.updateEmpresa(targetNit, payload).subscribe({
        next: (updated) => {
          this.loading.set(false);
          this.message.add({
            severity: 'success',
            summary: 'Empresa actualizada',
            detail: `Los datos de ${updated.nombre} fueron guardados correctamente.`,
          });
          this.firmaUpdated.emit(updated);
          this.onCancel();
        },
        error: (err) => this.handleHttpError(err, 'actualizar la empresa'),
      });
      return;
    }

    // Modo create
    const parsed = CrearEmpresaSchema.safeParse(coerced);
    if (!parsed.success) {
      this.setError('Validación local falló', JSON.stringify(parsed.error.format()));
      return;
    }

    this.loading.set(true);
    this.clearError();

    this.firmaRepo.create(parsed.data).subscribe({
      next: (firma) => {
        this.loading.set(false);
        this.message.add({
          severity: 'success',
          summary: 'Empresa creada',
          detail: `La empresa ${firma.nombre} fue creada correctamente.`,
        });
        this.firmaCreated.emit(firma);
        this.onCancel();
      },
      error: (err) => this.handleHttpError(err, 'crear la empresa'),
    });
  }

  /** Convierte string o número a number. NaN/null/undefined → 0 fallback. */
  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  }

  private handleHttpError(err: unknown, action: string): void {
    this.loading.set(false);
    // Angular HttpClient error shape: { status, statusText, error: {...body} }
    const httpErr = err as {
      status?: number;
      statusText?: string;
      error?: unknown;
      message?: string;
    };
    const status = httpErr.status ?? 0;
    const statusText = httpErr.statusText ?? 'Error';
    const body =
      typeof httpErr.error === 'string'
        ? httpErr.error
        : httpErr.error && typeof httpErr.error === 'object'
          ? JSON.stringify(httpErr.error)
          : (httpErr.message ?? '');
    const msg = `Error al ${action} (${status} ${statusText})${body ? ': ' + body : ''}`;
    // eslint-disable-next-line no-console
    console.error('[CrearEmpresaDialog]', msg, err);
    // WU-7: feedback global via PrimeNG toast. NO reemplaza el `error` signal —
    // el `<p-message>` inline sigue siendo el fallback accesible dentro del modal.
    this.message.add({
      severity: 'error',
      summary: 'No se pudo guardar la empresa',
      detail: msg,
      life: 6000,
    });
    this.setError(`${status} ${statusText}`, body);
  }

  private setError(short: string, detail: string): void {
    this.error.set(true);
    this.errorMessage.set(detail ? `${short} — ${detail}` : short);
  }

  private clearError(): void {
    this.error.set(false);
    this.errorMessage.set('');
  }

  onCancel(): void {
    this.form.reset();
    this.clearError();
    this.closed.emit();
  }

  /**
   * Soft-delete de la firma/empresa en edición. Pide confirmación al
   * usuario, luego dispatcha al endpoint correcto:
   *
   *   - Si la firma tiene NIT → `deleteEmpresa(nit)` →
   *     `DELETE /api/empresas/:nit` (soft-delete de la fila en `empresas`).
   *   - Si NO tiene NIT (legacy nube pendiente de "Terminar registro") →
   *     `deleteFirma(id)` → `DELETE /api/firmas/:id` (soft-delete de la
   *     fila en `firmas`, porque no existe empresa asociada).
   *
   * Ambos endpoints son TODO en backend (ver comentarios en
   * `firma.repository.ts`). Al terminar emite `firmaDeleted(firma)` para
   * que el parent cierre el dialog y refresque la lista.
   */
  async onEliminarEmpresa(): Promise<void> {
    const firma = this.editingFirma();
    if (!firma) return;

    const ok = await this.confirm.confirm({
      title: 'Eliminar empresa',
      message: `¿Eliminar "${firma.nombre ?? firma.firma_user}"? No será visible en la lista de empresas.`,
      acceptLabel: 'Eliminar',
      acceptSeverity: 'danger',
    });
    if (!ok) return;

    this.deleting.set(true);
    this.clearError();

    const request$ = firma.nit != null
      ? this.firmaRepo.deleteEmpresa(firma.nit)
      : this.firmaRepo.deleteFirma(firma.id);

    request$.subscribe({
      next: () => {
        this.deleting.set(false);
        this.message.add({
          severity: 'success',
          summary: 'Empresa eliminada',
          detail: `${firma.nombre ?? firma.firma_user} ya no será visible en la lista.`,
        });
        this.firmaDeleted.emit(firma);
        this.onCancel();
      },
      error: (err: unknown) => {
        this.deleting.set(false);
        this.handleHttpError(err, 'eliminar la empresa');
      },
    });
  }
}
