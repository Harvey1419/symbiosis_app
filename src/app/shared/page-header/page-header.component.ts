import { Component, ChangeDetectionStrategy, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | undefined>(undefined);
  /** Slot derecho — botones de acción primaria (Causar, Finalizar, etc.). */
  readonly actionRef = input<TemplateRef<unknown> | undefined>(undefined);
  /**
   * Slot izquierdo — típicamente un `<app-back-button>` para volver al
   * nivel padre. Se renderiza inline con el título, antes del header-content,
   * así no ocupa una fila vertical separada.
   */
  readonly backRef = input<TemplateRef<unknown> | undefined>(undefined);
}
