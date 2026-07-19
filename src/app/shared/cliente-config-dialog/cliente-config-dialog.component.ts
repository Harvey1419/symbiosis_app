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
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { Cliente, EmpresaDetalle } from '@domain/models/cliente.model';
import { ClienteRepository, UpdateClienteInput } from '@data/repositories/cliente.repository';
import { UpdateEmpresaSchema } from '@app/shared/crear-empresa-dialog/crear-empresa.schema';

/**
 * ClienteConfigDialogComponent — modal "Configurar cliente" para la lista
 * `/clientes/firma/:id`.
 *
 * Espejo del modal "Actualizar Empresa" de firmas pero con dos diferencias
 * clave:
 *   1. **NO tiene sección "Eliminar empresa"** — los clientes vienen de
 *      Siigo (sync) y borrarlos localmente sería incoherente.
 *   2. **`nombre` está en READ-ONLY** — también viene de Siigo y debe
 *      permanecer sincronizado. Lo demás (tipo_persona, tipo_id_rep_legal,
 *      id_rep_legal) sí es editable porque vive en `empresas` (tabla propia).
 *
 * El endpoint `PATCH /api/empresas/:nit` es compartido con
 * `FirmaRepository.updateEmpresa` (cliente y firma apuntan a la misma fila
 * en `empresas` por NIT). El body sale del `UpdateEmpresaSchema` mirror,
 * así que los campos se validan localmente antes de pegar al backend.
 */
@Component({
  selector: 'app-cliente-config-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    MessageModule,
  ],
  templateUrl: './cliente-config-dialog.component.html',
  styleUrl: './cliente-config-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClienteConfigDialogComponent {
  readonly visible = input<boolean>(false);
  readonly editingCliente = input<Cliente | null>(null);

  readonly clienteUpdated = output<Cliente>();
  readonly closed = output<void>();

  readonly loading = signal(false);
  readonly error = signal(false);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => this.editingCliente() !== null);
  readonly dialogTitle = computed(() => 'Configurar cliente');
  readonly submitLabel = computed(() => 'Guardar');

  /** Helper para el template: extrae la sección `empresas` del join. */
  readonly empresa = computed<EmpresaDetalle | null>(() => {
    return this.editingCliente()?.empresas ?? null;
  });

  /** Display name con fallback al NIT (igual que en `getDisplayName` del cliente-list). */
  readonly displayName = computed(() => {
    const e = this.empresa();
    return e?.nombre_empresa?.trim() || `Cliente ${this.editingCliente()?.nit ?? ''}`;
  });

  private readonly clienteRepo = inject(ClienteRepository);
  private readonly fb = inject(FormBuilder);
  private readonly message = inject(MessageService);

  readonly form = this.fb.group({
    tipo_persona: ['', [Validators.required]],
    nombre: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(200)]],
    nit: [null as number | null, [Validators.required, Validators.min(1)]],
    tipo_id_rep_legal: ['', [Validators.required]],
    id_rep_legal: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  readonly tipoPersonaOptions = [
    { label: 'Jurídica', value: 'juridica' },
    { label: 'Natural', value: 'natural' },
  ];
  readonly tipoIdRepLegalOptions = [
    { label: 'Cédula', value: 'cedula' },
    { label: 'Cédula de extranjería', value: 'cedula_extranjeria' },
    { label: 'Pasaporte', value: 'pasaporte' },
  ];

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const cliente = this.editingCliente();
      if (isVisible) {
        untracked(() => {
          const empresa = cliente?.empresas ?? null;
          // nombre y NIT siempre deshabilitados (vienen de Siigo / son PK).
          this.form.get('nombre')?.disable();
          this.form.get('nit')?.disable();
          // Editables: tipo_persona, tipo_id_rep_legal, id_rep_legal.
          for (const field of ['tipo_persona', 'tipo_id_rep_legal', 'id_rep_legal'] as const) {
            this.form.get(field)?.enable();
          }

          this.form.patchValue({
            tipo_persona: this.normalizeTipoPersona(empresa?.tipo_persona),
            nombre: empresa?.nombre_empresa ?? '',
            nit: cliente?.nit ?? null,
            tipo_id_rep_legal: this.normalizeTipoId(empresa?.tipo_id_rep_legal),
            id_rep_legal: this.toNumberOrNull(empresa?.id_rep_legal),
          });
        });
      }
    });
  }

  // ── Normalización / coerción ──────────────────────────────────────

  normalizeTipoPersona(val: string | null | undefined): string {
    if (!val) return '';
    const n = val.toLowerCase().trim();
    if (n.includes('juridica') || n.includes('jurídica')) return 'juridica';
    if (n.includes('natural')) return 'natural';
    return n;
  }

  normalizeTipoId(val: string | null | undefined): string {
    if (!val) return '';
    const n = val.toLowerCase().trim();
    if (
      n.includes('cedula_extranjeria') ||
      n.includes('cédula de extranjería') ||
      n.includes('extranjería') ||
      n.includes('extranjeria')
    ) return 'cedula_extranjeria';
    if (n.includes('cedula') || n.includes('cédula')) return 'cedula';
    if (n.includes('pasaporte')) return 'pasaporte';
    return n;
  }

  private toNumberOrNull(value: unknown): number | null {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string' && value.trim() !== '') {
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  // ── Submit ───────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const coerced = {
      ...raw,
      nit: this.toNumberOrNull(raw.nit),
      id_rep_legal: this.toNumberOrNull(raw.id_rep_legal),
    };

    // Reusamos UpdateEmpresaSchema (mismo contrato que el modal de firmas).
    const parsed = UpdateEmpresaSchema.safeParse(coerced);
    if (!parsed.success) {
      this.setError('Validación local falló', JSON.stringify(parsed.error.format()));
      return;
    }

    const cliente = this.editingCliente();
    if (!cliente || cliente.nit == null) {
      this.setError('Cliente inválido', 'No hay NIT asociado al cliente.');
      return;
    }

    const payload: UpdateClienteInput = {
      tipo_persona: parsed.data.tipo_persona,
      nombre: parsed.data.nombre,
      tipo_id_rep_legal: parsed.data.tipo_id_rep_legal,
      id_rep_legal: parsed.data.id_rep_legal,
      // El use-case backend usa firmaId para validar ownership via
      // `clientes_siigo` cuando `firmas.nit` es null (caso Siigo contador).
      firmaId: cliente.firma_id,
    };

    this.loading.set(true);
    this.clearError();

    this.clienteRepo.updateCliente(cliente.nit, payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.message.add({
          severity: 'success',
          summary: 'Cliente actualizado',
          detail: `Los datos de ${payload.nombre} fueron guardados correctamente.`,
        });
        this.clienteUpdated.emit(cliente);
        this.onCancel();
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.loading.set(false);
        const msg = err?.error?.message ?? err?.message ?? 'Error al actualizar el cliente';
        this.errorMessage.set(msg);
        this.error.set(true);
      },
    });
  }

  onCancel(): void {
    this.form.reset();
    this.clearError();
    this.closed.emit();
  }

  // ── Errores ──────────────────────────────────────────────────────

  private setError(short: string, detail: string): void {
    this.error.set(true);
    this.errorMessage.set(detail ? `${short} — ${detail}` : short);
  }

  private clearError(): void {
    this.error.set(false);
    this.errorMessage.set('');
  }
}