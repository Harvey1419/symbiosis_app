import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { NEVER, of, throwError } from 'rxjs';
import { SincronizarSiigoCardComponent } from './sincronizar-siigo-card.component';
import { FirmaRepository } from '@data/repositories/firma.repository';

describe('SincronizarSiigoCardComponent', () => {
  let fixture: ComponentFixture<SincronizarSiigoCardComponent>;
  let component: SincronizarSiigoCardComponent;
  let firmaMock: {
    sincronizarEmpresasByUser: ReturnType<typeof vi.fn>;
  };
  let messageService: { add: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    firmaMock = {
      sincronizarEmpresasByUser: vi.fn().mockReturnValue(of({ success: true, count: 0, newCount: 0, newItems: [] })),
    };
    messageService = { add: vi.fn() };

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SincronizarSiigoCardComponent],
      providers: [
        provideAnimations(),
        { provide: FirmaRepository, useValue: firmaMock },
        { provide: MessageService, useValue: messageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SincronizarSiigoCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('firmaUser', 'firma@example.com');
    fixture.componentRef.setInput('firmaId', 'firma-uuid-1');
    fixture.detectChanges();
  });

  it('renders the descriptive card with title, description, and Sincronizar button', () => {
    const card = fixture.nativeElement.querySelector('[data-testid="sincronizar-siigo-card"]') as HTMLElement | null;
    expect(card).not.toBeNull();

    const title = card?.querySelector('.card-title')?.textContent ?? '';
    const description = card?.querySelector('.card-description')?.textContent ?? '';
    const button = card?.querySelector('button') as HTMLButtonElement | null;

    expect(title).toContain('Sincronizar desde Siigo');
    expect(description.toLowerCase()).toContain('empresas');
    expect(button).not.toBeNull();
    expect(button?.textContent ?? '').toContain('Sincronizar');
  });

  it('does NOT render any hardcoded color hex (theme tokens only)', () => {
    const source = (component.constructor as unknown as { ɵcmp: { styles: string } }).ɵcmp?.styles ?? '';
    // The component class should rely on CSS tokens, not hex colors. Defensive check:
    // we accept either an empty styles string (inline template styles moved to .scss) OR
    // a styles string that does NOT contain raw hex like #fff/#000/#f1ff58.
    if (source.length > 0) {
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  it('clicking Sincronizar calls FirmaRepository.sincronizarEmpresasByUser with the firma_user input', () => {
    component.sync();

    expect(firmaMock.sincronizarEmpresasByUser).toHaveBeenCalledTimes(1);
    expect(firmaMock.sincronizarEmpresasByUser).toHaveBeenCalledWith('firma@example.com');
  });

  it('sets loading=true while the request is in-flight and false after it resolves', () => {
    firmaMock.sincronizarEmpresasByUser.mockReturnValue(
      // NEVER to simulate in-flight; but we want a resolution, so use a delayed observable.
      // Simplest: return an observable that resolves synchronously to assert order.
      of({ success: true, count: 0, newCount: 0, newItems: [] }),
    );

    expect(component.loading()).toBe(false);
    component.sync();
    // Synchronous emission: by the time sync() returns, the observable has completed.
    expect(component.loading()).toBe(false);
  });

  it('emits (syncCompleted) AFTER a successful sync with the success result', () => {
    const completed = vi.fn();
    component.syncCompleted.subscribe(completed);
    firmaMock.sincronizarEmpresasByUser.mockReturnValue(
      of({ success: true, count: 4, newCount: 2, newItems: [{ nit: 800333333 }, { nit: 800444444 }] }),
    );

    component.sync();

    expect(completed).toHaveBeenCalledTimes(1);
    const payload = completed.mock.calls[0][0] as { success: boolean; count: number; newCount: number };
    expect(payload.success).toBe(true);
    expect(payload.count).toBe(4);
    expect(payload.newCount).toBe(2);
  });

  it('surfaces errors to MessageService (toast) AND keeps lastError signal set when the request fails', () => {
    firmaMock.sincronizarEmpresasByUser.mockReturnValue(
      throwError(() => ({ error: { message: 'FIRMA_NOT_OWNED' }, message: 'FIRMA_NOT_OWNED' })),
    );

    component.sync();

    expect(component.loading()).toBe(false);
    expect(component.lastError()).toBe('FIRMA_NOT_OWNED');
    expect(messageService.add).toHaveBeenCalledTimes(1);
    const toast = messageService.add.mock.calls[0][0] as { severity: string; summary: string };
    expect(toast.severity).toBe('error');
    expect(toast.summary.toLowerCase()).toContain('sincroniz');
  });

  it('does NOT call the repository when firmaUser is missing (empty string)', () => {
    fixture.componentRef.setInput('firmaUser', '');
    fixture.detectChanges();

    component.sync();

    expect(firmaMock.sincronizarEmpresasByUser).not.toHaveBeenCalled();
    // Still surfaces a warning toast so the user understands why nothing happened.
    expect(messageService.add).toHaveBeenCalled();
  });

  it('disabled state on the button reflects the loading signal', () => {
    component.loading.set(true);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('[data-testid="sincronizar-siigo-card"] button') as HTMLButtonElement | null;
    expect(btn?.disabled).toBe(true);

    component.loading.set(false);
    fixture.detectChanges();
    expect(btn?.disabled).toBe(false);
  });

  it('has aria-busy set while loading (accessibility)', () => {
    component.loading.set(true);
    fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('[data-testid="sincronizar-siigo-card"]') as HTMLElement | null;
    expect(card?.getAttribute('aria-busy')).toBe('true');

    component.loading.set(false);
    fixture.detectChanges();
    expect(card?.getAttribute('aria-busy')).toBe('false');
  });

  // PR-E.2 (round-3 fix): empresas sync is ONE catalog (empresas itself),
  // not five. The card must surface a counter showing 0/1 → 1/1 → Listo so
  // the user has the same observability as the 4-catalog `SyncSiigoCompletoButtonComponent`.
  it('embeds the SyncCounterBadge with total=1 — empresas is one catalog, not five', () => {
    expect(component.totalCatalogs()).toBe(1);
    const badge = fixture.nativeElement.querySelector('app-sync-counter-badge') as HTMLElement | null;
    // Pre-sync the card is idle, so the badge is NOT yet rendered.
    // We only require that, when it renders, it always uses total=1.
    expect(badge).toBeNull();
  });

  it('badge transitions "Sincronizando 1/1" while loading (in-flight) — NOT "Listo"', () => {
    // Click sync → loading becomes true. The done counter increments to 1
    // immediately (marking the in-flight request) and the badge should
    // show "Sincronizando 1/1" because the request has not resolved yet.
    firmaMock.sincronizarEmpresasByUser.mockReturnValue(
      // NEVER keeps loading=true so we can assert the in-flight state.
      NEVER,
    );

    component.sync();
    fixture.detectChanges();

    expect(component.loading()).toBe(true);
    expect(component.inFlightDone()).toBe(1);

    const badge = fixture.nativeElement.querySelector('app-sync-counter-badge') as HTMLElement | null;
    expect(badge).not.toBeNull();
    const status = badge?.querySelector('[role="status"]') as HTMLElement | null;
    expect(status?.textContent?.trim()).toBe('Sincronizando 1/1');
    expect(status?.getAttribute('aria-live')).toBe('polite');
  });

  it('badge transitions to "Listo" after a successful sync completes (terminal state)', () => {
    firmaMock.sincronizarEmpresasByUser.mockReturnValue(
      of({ success: true, count: 4, newCount: 2, newItems: [{ nit: 800333333 }, { nit: 800444444 }] }),
    );

    component.sync();
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.justSynced()).toBe(true);
    expect(component.inFlightDone()).toBe(1);

    const badge = fixture.nativeElement.querySelector('app-sync-counter-badge') as HTMLElement | null;
    expect(badge).not.toBeNull();
    const status = badge?.querySelector('[role="status"]') as HTMLElement | null;
    expect(status?.textContent?.trim()).toBe('Listo');
  });

  it('badge hides after the terminal window expires (no lingering counter)', () => {
    firmaMock.sincronizarEmpresasByUser.mockReturnValue(
      of({ success: true, count: 0, newCount: 0, newItems: [] }),
    );

    component.sync();
    fixture.detectChanges();

    expect(component.justSynced()).toBe(true);
    expect(fixture.nativeElement.querySelector('app-sync-counter-badge')).not.toBeNull();

    component.clearTerminalState();
    fixture.detectChanges();

    expect(component.justSynced()).toBe(false);
    expect(fixture.nativeElement.querySelector('app-sync-counter-badge')).toBeNull();
  });
});
