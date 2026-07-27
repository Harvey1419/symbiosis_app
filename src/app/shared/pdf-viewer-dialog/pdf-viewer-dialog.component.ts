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
const PDF_CONTENT_TYPE = 'application/pdf';

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

/**
 * Decode a base64 string to a Uint8Array. Pure — no DOM dependency so
 * the helper is trivially testable. Uses `atob` which is available in
 * every modern browser and in happy-dom/jsdom.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Build an `application/pdf` Blob from a base64-encoded PDF payload.
 * The Blob is the foundation for a Blob URL — see `toBlobUrl` below for
 * the rationale (no URL length limit, native browser cache, cleaner
 * revoking semantics).
 */
export function base64ToPdfBlob(base64: string): Blob {
  // The BlobPart array must accept Uint8Array; we use Uint8Array.from to
  // produce a plain Uint8Array<ArrayBuffer> (not the SharedArrayBuffer
  // variant that TS infers from `new Uint8Array(length)` in some lib
  // targets). This keeps the build green under strict lib settings.
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: PDF_CONTENT_TYPE });
}

/**
 * Wrap a base64 PDF payload into a `Blob:` URL that bypasses the browser's
 * ~2 MB `data:` URL limit. Browsers silently reject data: URLs over the
 * limit which is the root cause of "PDF text is completely lost" in the
 * Ver PDF modal — the iframe loads but is empty. A Blob URL has no
 * length cap and is rendered reliably by the browser's PDF viewer.
 */
export function toPdfBlobUrl(base64: string): string {
  return URL.createObjectURL(base64ToPdfBlob(base64));
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

  /**
   * Track the active Blob URL so we can revoke it when:
   *   - the dialog closes (memory cleanup)
   *   - a new pdfBase64 arrives (replace the previous source)
   *   - the component is destroyed (last-chance cleanup)
   */
  private activeBlobUrl: string | null = null;

  constructor() {
    effect(() => {
      const isVisible = this.visible();
      const base64 = this.pdfBase64();

      // Always release the previous Blob URL before reassigning so we
      // never leak more than one at a time per open session.
      this.revokeActiveBlobUrl();

      if (isVisible && isPdfBase64(base64)) {
        const blobUrl = toPdfBlobUrl(base64);
        this.activeBlobUrl = blobUrl;
        this.pdfSource.set(this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl));
      } else {
        this.pdfSource.set(null);
      }
    });
  }

  onVisibleChange(visible: boolean): void {
    this.visibleChange.emit(visible);
    if (!visible) {
      this.revokeActiveBlobUrl();
      this.pdfSource.set(null);
      this.dismissed.emit();
    }
  }

  private revokeActiveBlobUrl(): void {
    if (this.activeBlobUrl !== null) {
      URL.revokeObjectURL(this.activeBlobUrl);
      this.activeBlobUrl = null;
    }
  }
}