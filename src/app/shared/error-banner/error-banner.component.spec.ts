import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ErrorBannerComponent } from './error-banner.component';

describe('ErrorBannerComponent', () => {
  let fixture: ComponentFixture<ErrorBannerComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ErrorBannerComponent],
    });
    fixture = TestBed.createComponent(ErrorBannerComponent);
  });

  it('renderiza el mensaje de error', () => {
    fixture.componentRef.setInput('message', 'Algo salio mal');
    fixture.detectChanges();

    const msg = fixture.nativeElement.querySelector('.error-message');
    expect(msg.textContent.trim()).toBe('Algo salio mal');
  });

  it('tiene role="alert" para accesibilidad', () => {
    fixture.componentRef.setInput('message', 'Error');
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('.error-banner');
    expect(banner.getAttribute('role')).toBe('alert');
  });

  it('no muestra el boton dismiss cuando dismissible=false (default)', () => {
    fixture.componentRef.setInput('message', 'Error');
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.dismiss-btn');
    expect(btn).toBeNull();
  });

  it('muestra el boton dismiss cuando dismissible=true', () => {
    fixture.componentRef.setInput('message', 'Error');
    fixture.componentRef.setInput('dismissible', true);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.dismiss-btn');
    expect(btn).toBeTruthy();
  });

  it('emite dismissed al hacer click en el boton dismiss', () => {
    fixture.componentRef.setInput('message', 'Error');
    fixture.componentRef.setInput('dismissible', true);
    fixture.detectChanges();

    const spy = vi.spyOn(fixture.componentInstance.dismissed, 'emit');
    const btn = fixture.nativeElement.querySelector('.dismiss-btn') as HTMLElement;
    btn.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
