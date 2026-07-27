import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { DomSanitizer, ɵDomSanitizerImpl } from '@angular/platform-browser';
import { PdfViewerDialogComponent } from './pdf-viewer-dialog.component';

const VALID_PDF_BASE64 = 'JVBERi0xLjQK';

describe('PdfViewerDialogComponent', () => {
  let component: PdfViewerDialogComponent;
  let fixture: ComponentFixture<PdfViewerDialogComponent>;

  beforeEach(async () => {
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
  });

  function render(pdfBase64: string | null, visible = true): void {
    fixture.componentRef.setInput('pdfBase64', pdfBase64);
    fixture.componentRef.setInput('visible', visible);
    fixture.detectChanges();
  }

  it('renders an iframe for validated PDF content', () => {
    render(VALID_PDF_BASE64);

    const iframe = fixture.nativeElement.querySelector('[data-testid="pdf-frame"]') as HTMLIFrameElement | null;
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('title')).toBe('Vista previa del PDF');
    expect(iframe?.getAttribute('src')).toBe(`data:application/pdf;base64,${VALID_PDF_BASE64}`);
  });

  it('renders no iframe when the PDF content is null', () => {
    render(null);

    expect(fixture.nativeElement.querySelector('[data-testid="pdf-frame"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('PDF no disponible');
  });

  it('renders no iframe when the base64 content is not a PDF', () => {
    render('bm90IGEgcGRm');

    expect(fixture.nativeElement.querySelector('[data-testid="pdf-frame"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('PDF no disponible');
  });

  it('clears the trusted source when the dialog closes', () => {
    render(VALID_PDF_BASE64);
    expect(component.pdfSource()).not.toBeNull();

    component.onVisibleChange(false);
    fixture.detectChanges();

    expect(component.pdfSource()).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="pdf-frame"]')).toBeNull();
  });
});
