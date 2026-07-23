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
