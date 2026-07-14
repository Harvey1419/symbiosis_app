import { Component, ChangeDetectionStrategy, input, output, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TooltipModule } from 'primeng/tooltip';
import { Impuesto } from '../../domain/models/impuesto.model';

export interface ImpuestosApplyEvent {
  iva_code: string | null;
  rete_code: string | null;
}

/**
 * ImpuestosDialogComponent — modal for selecting IVA + Rete codes for a row.
 *
 * Two sections (IVA, Rete), each showing p-radiobutton per available tax of
 * that type. None option in each section clears the code.
 */
@Component({
  selector: 'app-impuestos-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, RadioButtonModule, TooltipModule],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '560px' }"
      header="Asignar impuestos"
      styleClass="impuestos-dialog"
    >
      <div class="dialog-body">
        <p class="dialog-hint">
          Selecciona un (1) IVA y/o un (1) Rete para esta fila. Si no quieres
          asignar ninguno, déjalos sin seleccionar.
        </p>

        <section class="tax-section">
          <h3 class="section-title">
            <i class="pi pi-percentage"></i>
            IVA
          </h3>
          <div class="tax-options">
            <label class="tax-option">
              <p-radioButton
                name="iva"
                [value]="null"
                [(ngModel)]="selectedIva"
                (onClick)="selectedIva.set(null)"
              />
              <span class="tax-label">Ninguno</span>
            </label>
            @for (tax of ivaOptions(); track tax.codigo) {
              <label class="tax-option">
                <p-radioButton
                  name="iva"
                  [value]="tax.codigo"
                  [(ngModel)]="selectedIva"
                />
                <span class="tax-label">
                  <span class="tax-code">{{ tax.codigo }}</span>
                  <span class="tax-name">{{ tax.description || tax.purchase_account_name || tax.codigo }}</span>
                  @if (tax.percentage !== null && tax.percentage !== undefined) {
                    <span class="tax-pct">{{ tax.percentage }}%</span>
                  }
                </span>
              </label>
            }
          </div>
        </section>

        <section class="tax-section">
          <h3 class="section-title">
            <i class="pi pi-percentage"></i>
            Rete (Retención)
          </h3>
          <div class="tax-options">
            <label class="tax-option">
              <p-radioButton
                name="rete"
                [value]="null"
                [(ngModel)]="selectedRete"
                (onClick)="selectedRete.set(null)"
              />
              <span class="tax-label">Ninguno</span>
            </label>
            @for (tax of reteOptions(); track tax.codigo) {
              <label class="tax-option">
                <p-radioButton
                  name="rete"
                  [value]="tax.codigo"
                  [(ngModel)]="selectedRete"
                />
                <span class="tax-label">
                  <span class="tax-code">{{ tax.codigo }}</span>
                  <span class="tax-name">{{ tax.description || tax.purchase_account_name || tax.codigo }}</span>
                  @if (tax.percentage !== null && tax.percentage !== undefined) {
                    <span class="tax-pct">{{ tax.percentage }}%</span>
                  }
                </span>
              </label>
            }
          </div>
        </section>
      </div>

      <ng-template pTemplate="footer">
        <p-button
          label="Cancelar"
          severity="secondary"
          [outlined]="true"
          (onClick)="onCancel()"
        />
        <p-button
          label="Aplicar"
          severity="primary"
          icon="pi pi-check"
          (onClick)="onApply()"
        />
      </ng-template>
    </p-dialog>
  `,
  styleUrl: './impuestos-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImpuestosDialogComponent {
  readonly visible = input<boolean>(false);
  readonly currentIvaCode = input<string | null>(null);
  readonly currentReteCode = input<string | null>(null);
  readonly impuestos = input<readonly Impuesto[]>([]);

  /** Emitted on Aplicar with the selected codes. */
  readonly apply = output<ImpuestosApplyEvent>();
  /** Emitted on close (X or Cancelar) — no payload. */
  readonly close = output<void>();

  /** Selected codes (signal-based for PrimeNG ngModel binding). */
  readonly selectedIva = signal<string | null>(null);
  readonly selectedRete = signal<string | null>(null);

  /** Computed: filtered by tipo. */
  readonly ivaOptions = computed<Impuesto[]>(() =>
    // Only pure "IVA" — not "ReteIVA" or other "X...IVA" variants.
    this.impuestos().filter((t) => t.tipo?.toUpperCase() === 'IVA'),
  );
  readonly reteOptions = computed<Impuesto[]>(() =>
    // Anything starting with "Rete" (ReteFuente, ReteICA, ReteIVA, etc.)
    this.impuestos().filter((t) => t.tipo?.toUpperCase().startsWith('RETE')),
  );

  constructor() {
    // Whenever the dialog becomes visible (or the current codes change),
    // reset the local selections to those current values.
    effect(() => {
      if (this.visible()) {
        this.selectedIva.set(this.currentIvaCode());
        this.selectedRete.set(this.currentReteCode());
      }
    });
  }

  onVisibleChange(visible: boolean): void {
    if (!visible) this.close.emit();
  }

  onApply(): void {
    this.apply.emit({
      iva_code: this.selectedIva(),
      rete_code: this.selectedRete(),
    });
  }

  onCancel(): void {
    this.close.emit();
  }
}