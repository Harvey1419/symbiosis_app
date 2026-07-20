import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { BackButtonComponent } from './back-button.component';

describe('BackButtonComponent', () => {
  let fixture: ComponentFixture<BackButtonComponent>;
  let component: BackButtonComponent;
  let routerMock: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.restoreAllMocks();
    routerMock = { navigate: vi.fn() };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [BackButtonComponent],
      providers: [
        provideAnimations(),
        provideRouter([]),
        { provide: Router, useValue: routerMock },
      ],
    });
    fixture = TestBed.createComponent(BackButtonComponent);
    component = fixture.componentInstance;
  });

  it('uses "Volver" as the default label', async () => {
    fixture.componentRef.setInput('routerLink', null);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Volver');
  });

  it('navigates with the provided link and navigation state', () => {
    const state = { firmaId: 'firma-123', firmaNombre: 'Firma Alpha' };
    const link = ['/clientes', '900123456'];
    fixture.componentRef.setInput('routerLink', link);
    fixture.componentRef.setInput('navigationState', state);

    component.onClick();

    expect(routerMock.navigate).toHaveBeenCalledWith(link, { state });
  });

  it('navigates with an empty options object when navigationState is null', () => {
    const link = ['/clientes', '900123456'];
    fixture.componentRef.setInput('routerLink', link);
    fixture.componentRef.setInput('navigationState', null);

    component.onClick();

    expect(routerMock.navigate).toHaveBeenCalledWith(link, {});
  });

  it('goes back in browser history without navigating when routerLink is null', () => {
    const historyBackSpy = vi.spyOn(globalThis.window.history, 'back').mockImplementation(() => undefined);

    fixture.componentRef.setInput('routerLink', null);
    component.onClick();

    expect(historyBackSpy).toHaveBeenCalledTimes(1);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('passes a custom label to p-button', async () => {
    fixture.componentRef.setInput('label', 'Regresar');
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Regresar');
  });
});
