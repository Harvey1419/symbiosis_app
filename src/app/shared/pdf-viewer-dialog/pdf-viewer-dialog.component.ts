import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';

const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * Validates that a value is padded base64 containing a PDF file signature.
 * The signature check prevents arbitrary data URLs from reaching the iframe.
 */
export function isPdfBase64(value: string | null): value is string {
  if (!value || value.length % 4 !== 0 || !BASE64_PATTERN.test(value)) return false;

  try {
    return atob(value).startsWith('%PDF-');
  } catch {
    return false;
  }
}

@Component({
  selector: 'app-pdf-viewer-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule],
  templateUrl: './pdf-viewer-dialog.component.html',
  styleUrl: './pdf-viewer-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfViewerDialogComponent {
  readonly visible = input<boolean>(false);
  readonly pdfBase64 = input<string | null>(null);
  readonly visibleChange = output<boolean>();
  readonly dismissed = output<void>();

  readonly pdfSource = signal<SafeResourceUrl | null>(null);
  private readonly sanitizer = inject(DomSanitizer);

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const base64 = this.pdfBase64();
      this.pdfSource.set(isVisible && isPdfBase64(base64)
        ? this.sanitizer.bypassSecurityTrustResourceUrl(
            `data:application/pdf;base64,${base64}`,
          )
        : null);
    });
  }

  onVisibleChange(visible: boolean): void {
    this.visibleChange.emit(visible);
    if (!visible) {
      this.pdfSource.set(null);
      this.dismissed.emit();
    }
  }
}
