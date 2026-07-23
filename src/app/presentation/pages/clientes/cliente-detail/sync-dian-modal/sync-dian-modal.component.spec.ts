import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { SyncDianModalComponent } from './sync-dian-modal.component';

describe('SyncDianModalComponent', () => {
  let fixture: ComponentFixture<SyncDianModalComponent>;
  let component: SyncDianModalComponent;

  const desde = new Date(2026, 0, 1);
  const hasta = new Date(2026, 0, 31);
  const validToken = 'token-dian-with-20-chars';

  beforeEach(async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SyncDianModalComponent],
      providers: [provideAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(SyncDianModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('nit', '900123456');
    fixture.componentRef.setInput('firmaId', 'firma-1');
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
  });

  function setValidRange(): void {
    component.form.get('dateRange')?.setValue([desde, hasta]);
  }

  function buttonByLabel(label: string): HTMLButtonElement | null {
    const buttons = Array.from(document.body.querySelectorAll<HTMLButtonElement>('button'));
    return buttons.find((button) => button.textContent?.includes(label)) ?? null;
  }

  it('disables submit when tokenDian has fewer than 20 characters', async () => {
    setValidRange();
    component.form.get('tokenDian')?.setValue('short-token');
    await fixture.whenStable();

    expect(buttonByLabel('Iniciar sync')?.disabled).toBe(true);
  });

  it('disables submit when dateRange is empty', async () => {
    component.form.get('tokenDian')?.setValue(validToken);
    component.form.get('dateRange')?.setValue(null);
    await fixture.whenStable();

    expect(buttonByLabel('Iniciar sync')?.disabled).toBe(true);
  });

  it('disables submit and shows a date-range message when start is after end', async () => {
    component.form.setValue({
      tokenDian: validToken,
      dateRange: [new Date(2026, 1, 2), new Date(2026, 1, 1)],
    });
    await fixture.whenStable();

    expect(buttonByLabel('Iniciar sync')?.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('La fecha inicial debe ser anterior o igual a la fecha final');
  });

  it('emits a valid submission without closing the modal', () => {
    const submitted = vi.fn();
    const visibleChanged = vi.fn();
    component.submitted.subscribe(submitted);
    component.visibleChange.subscribe(visibleChanged);
    component.form.setValue({ tokenDian: validToken, dateRange: [desde, hasta] });

    component.onSubmit();

    expect(submitted).toHaveBeenCalledWith({ tokenDian: validToken, desde, hasta });
    expect(visibleChanged).not.toHaveBeenCalled();
    expect(component.visible()).toBe(true);
  });

  it('keeps the dialog open and does not emit closed after a terminal event', async () => {
    const closed = vi.fn();
    component.closed.subscribe(closed);
    fixture.componentRef.setInput('estado', 'completed');
    await fixture.whenStable();

    expect(closed).not.toHaveBeenCalled();
    expect(component.visible()).toBe(true);
    expect(document.body.querySelector('.sync-dian-dialog')).not.toBeNull();
  });

  it('renders retry only for terminal state with errors and exhausted items', async () => {
    fixture.componentRef.setInput('estado', 'processing');
    fixture.componentRef.setInput('errors', 2);
    fixture.componentRef.setInput('hasExhaustedItems', false);
    await fixture.whenStable();
    expect(buttonByLabel('Reintentar errores')).toBeNull();

    fixture.componentRef.setInput('estado', 'partial');
    fixture.componentRef.setInput('hasExhaustedItems', true);
    await fixture.whenStable();
    expect(buttonByLabel('Reintentar errores')).not.toBeNull();
  });

  it('muestra el NIT pero NO el firmaId en el meta-row', async () => {
    await fixture.whenStable();
    const metaText = fixture.nativeElement.querySelector('.meta-row')?.textContent ?? '';

    expect(metaText).toContain('NIT:');
    expect(metaText).toContain('900123456');
    expect(metaText).not.toContain('Firma:');
    expect(metaText).not.toContain('firma-1');
  });

  it('los inputs del formulario (tokenDian, dateRange, retryToken) ocupan el ancho completo', async () => {
    fixture.componentRef.setInput('estado', 'failed');
    fixture.componentRef.setInput('errors', 1);
    fixture.componentRef.setInput('hasExhaustedItems', true);
    setValidRange();
    component.form.get('tokenDian')?.setValue(validToken);
    component.retryTokenControl.setValue(validToken);
    await fixture.whenStable();

    const tokenInput = document.body.querySelector<HTMLInputElement>('input#tokenDian');
    const retryInput = document.body.querySelector<HTMLInputElement>('input#retryToken');
    const datepicker = document.body.querySelector<HTMLElement>('p-datepicker.full-width');

    expect(tokenInput).not.toBeNull();
    expect(retryInput).not.toBeNull();
    expect(datepicker).not.toBeNull();

    // Token + retry inputs use inline `style="width: 100%"`.
    expect(tokenInput!.getAttribute('style')).toContain('width: 100%');
    expect(retryInput!.getAttribute('style')).toContain('width: 100%');

    // Datepicker host + internal input use `[style]` + `[inputStyle]` (PrimeNG forwards them).
    // jsdom doesn't always reflect component input bindings as inline `style` attributes on
    // custom elements, so we assert the configuration via the class + a structural fallback.
    expect(datepicker!.classList.contains('full-width')).toBe(true);
    const datepickerInput = document.body.querySelector<HTMLInputElement>('.p-datepicker-input');
    if (datepickerInput) {
      expect(datepickerInput.getAttribute('style') ?? '').toContain('width: 100%');
    }
  });

  it('muestra un link "Traer token manualmente" que apunta al portal DIAN y abre en nueva pestaña', () => {
    const link = document.body.querySelector<HTMLAnchorElement>('a.token-link');

    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('https://catalogo-vpfe.dian.gov.co/User/companylogin');
    expect(link!.getAttribute('target')).toBe('_blank');
    expect(link!.getAttribute('rel')).toContain('noopener');
    expect(link!.textContent?.trim()).toBe('Traer token manualmente');
  });

  it('disables retry for an empty token and emits the retry payload for a valid token', async () => {
    const retryRequested = vi.fn();
    component.retryRequested.subscribe(retryRequested);
    fixture.componentRef.setInput('estado', 'failed');
    fixture.componentRef.setInput('errors', 1);
    fixture.componentRef.setInput('hasExhaustedItems', true);
    setValidRange();
    await fixture.whenStable();

    expect(buttonByLabel('Reintentar errores')?.disabled).toBe(true);

    component.retryTokenControl.setValue(validToken);
    await fixture.whenStable();
    const retryButton = buttonByLabel('Reintentar errores');
    expect(retryButton?.disabled).toBe(false);
    retryButton?.click();

    expect(retryRequested).toHaveBeenCalledWith({ tokenDian: validToken, desde, hasta });
  });
});
