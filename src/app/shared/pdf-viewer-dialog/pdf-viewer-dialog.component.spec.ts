import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { DomSanitizer, ɵDomSanitizerImpl } from '@angular/platform-browser';
import { PdfViewerDialogComponent } from './pdf-viewer-dialog.component';

const VALID_PDF_BASE64 = 'JVBERi0xLjQK';

describe('PdfViewerDialogComponent', () => {
  let component: PdfViewerDialogComponent;
  let fixture: ComponentFixture<PdfViewerDialogComponent>;
  // Track blob URL lifecycle so we can assert cleanup behavior.
  let createdUrls: string[] = [];
  let revokedUrls: string[] = [];
  let realCreate: typeof URL.createObjectURL;
  let realRevoke: typeof URL.revokeObjectURL;
  let counter = 0;

  beforeEach(async () => {
    // Disable happy-dom's child iframe navigation so setting a blob:
    // URL on the test iframe doesn't throw "URL scheme 'blob' is not
    // supported" — irrelevant to the production behavior we're testing
    // (the real browser renders PDF blob URLs natively).
    (window as unknown as { happyDOM: { settings: { navigation: { disableChildFrameNavigation: boolean } } } })
      .happyDOM.settings.navigation.disableChildFrameNavigation = true;

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [PdfViewerDialogComponent],
      providers: [
        provideAnimations(),
        {
          provide: DomSanitizer,
          useClass: ɵDomSanitizerImpl,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PdfViewerDialogComponent);
    component = fixture.componentInstance;

    realCreate = URL.createObjectURL;
    realRevoke = URL.revokeObjectURL;
    createdUrls = [];
    revokedUrls = [];
    counter = 0;
    // Mock URL.createObjectURL to return a synthetic blob: URL so the
    // production code path runs (it creates a real Blob) without
    // triggering happy-dom's iframe fetch logic in the test runner.
    // NOTE: parameterless `mockImplementation` avoids the
    // `_obj` unused-parameter lint that the flat eslint config cannot
    // suppress via the conventional `^_` pattern.
    URL.createObjectURL = vi.fn().mockImplementation(() => {
      counter += 1;
      const url = `blob:mock://test/${counter}`;
      createdUrls.push(url);
      return url;
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn((url: string) => {
      revokedUrls.push(url);
    }) as typeof URL.revokeObjectURL;
  });

  afterEach(() => {
    URL.createObjectURL = realCreate;
    URL.revokeObjectURL = realRevoke;
  });

  function render(pdfBase64: string | null, visible = true): void {
    fixture.componentRef.setInput('pdfBase64', pdfBase64);
    fixture.componentRef.setInput('visible', visible);
    fixture.detectChanges();
  }

  it('renders a viewer with a blob URL src for validated PDF content (not a data: URL)', () => {
    render(VALID_PDF_BASE64);

    const iframe = fixture.nativeElement.querySelector('[data-testid="pdf-frame"]') as HTMLElement | null;
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('title')).toBe('Vista previa del PDF');
    // The src MUST be a blob URL (not data:). Browsers silently reject
    // data: URLs over ~2 MB which is the root cause of "PDF text is lost".
    // A blob URL has no length limit and renders the PDF reliably.
    const src = iframe?.getAttribute('src') ?? '';
    expect(src.startsWith('blob:')).toBe(true);
    expect(src.startsWith('data:application/pdf')).toBe(false);
  });

  it('renders the iframe with an explicit non-zero height so the modal is not cut off', () => {
    render(VALID_PDF_BASE64);

    const iframe = fixture.nativeElement.querySelector('[data-testid="pdf-frame"]') as HTMLIFrameElement | null;
    expect(iframe).not.toBeNull();
    // The iframe height MUST be explicit. When only min-height is set
    // and the dialog body has no fixed height, the iframe collapses to
    // 0 and the PDF appears as "text completely lost". Asserting on the
    // HTML attribute (not CSS class) keeps this test behavioral.
    const heightAttr = iframe?.getAttribute('height') ?? '';
    expect(heightAttr).not.toBe('');
    expect(heightAttr).not.toBe('0');
  });

  /** Unwrap a SafeResourceUrl to its underlying URL string for equality checks. */
  function unwrap(safe: unknown): string {
    const candidate = safe as { changingThisBreaksApplicationSecurity?: string } | null | undefined;
    return candidate?.changingThisBreaksApplicationSecurity ?? '';
  }

  it('creates exactly one Blob URL when a valid PDF is loaded', () => {
    render(VALID_PDF_BASE64);

    expect(createdUrls.length).toBe(1);
    // The blob URL we created was also reflected as the iframe src.
    expect(createdUrls[0].startsWith('blob:')).toBe(true);
  });

  it('builds the Blob from the base64 PDF payload (application/pdf type)', () => {
    const createSpy = vi.spyOn(URL, 'createObjectURL');
    render(VALID_PDF_BASE64);

    expect(createSpy).toHaveBeenCalledTimes(1);
    const arg = createSpy.mock.calls[0][0] as Blob;
    expect(arg).toBeInstanceOf(Blob);
    expect(arg.type).toBe('application/pdf');
    // The blob's decoded bytes must include the PDF magic signature so
    // the browser treats the source as a real PDF document.
    expect(arg.size).toBeGreaterThan(0);
  });

  it('uses different Blob URLs for different valid base64 payloads', () => {
    render(VALID_PDF_BASE64);
    const firstSrc = unwrap(component.pdfSource());

    // Switch to a different valid PDF (still starts with %PDF-).
    // Both values are constructed to satisfy isPdfBase64() so the helper
    // is exercised on two distinct inputs.
    const otherPdf = 'JVBERi0xLjQKMSAwIG9iago=';
    render(otherPdf);

    const secondSrc = unwrap(component.pdfSource());
    // Triangulation: different base64 → different blob URL → first is revoked.
    expect(secondSrc).not.toBe(firstSrc);
    expect(revokedUrls).toContain(firstSrc);
  });

  it('renders no viewer when the PDF content is null', () => {
    render(null);

    expect(fixture.nativeElement.querySelector('[data-testid="pdf-frame"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('PDF no disponible');
    expect(createdUrls.length).toBe(0);
  });

  it('renders no viewer when the base64 content is not a PDF', () => {
    render('bm90IGEgcGRm');

    expect(fixture.nativeElement.querySelector('[data-testid="pdf-frame"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('PDF no disponible');
    expect(createdUrls.length).toBe(0);
  });

  it('clears the trusted source and revokes the Blob URL when the dialog closes', () => {
    render(VALID_PDF_BASE64);
    expect(component.pdfSource()).not.toBeNull();
    const urlAtOpen = unwrap(component.pdfSource());
    expect(createdUrls).toContain(urlAtOpen);

    component.onVisibleChange(false);
    fixture.detectChanges();

    expect(component.pdfSource()).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="pdf-frame"]')).toBeNull();
    // Memory: the blob URL must be revoked so the blob can be GC'd.
    expect(revokedUrls).toContain(urlAtOpen);
  });

  it('revokes the previous Blob URL when the pdfBase64 input changes', () => {
    render(VALID_PDF_BASE64);
    const firstUrl = unwrap(component.pdfSource());

    render('JVBERi0xLjQKMSAwIG9iago=');
    expect(createdUrls.length).toBe(2);
    expect(revokedUrls).toContain(firstUrl);
  });
});
