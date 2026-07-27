import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SyncCounterBadgeComponent } from './sync-counter-badge.component';

describe('SyncCounterBadgeComponent', () => {
  let fixture: ComponentFixture<SyncCounterBadgeComponent>;

  function create(done: number, total: number): void {
    fixture = TestBed.createComponent(SyncCounterBadgeComponent);
    fixture.componentRef.setInput('done', done);
    fixture.componentRef.setInput('total', total);
    fixture.detectChanges();
  }

  it('renders active progress with status semantics', () => {
    create(2, 4);

    const status = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(status.textContent?.trim()).toBe('Sincronizando 2/4');
    expect(status.getAttribute('aria-live')).toBe('polite');
  });

  it('renders the terminal wording when every catalog is complete', () => {
    create(4, 4);

    expect((fixture.nativeElement.querySelector('[role="status"]') as HTMLElement).textContent?.trim()).toBe('Listo');
  });

  // PR-E.2: when `inFlight=true` AND `done === total`, the badge must
  // keep the "Sincronizando X/Y" wording (used by the 1-catalog
  // empresas card to show "Sincronizando 1/1" while the request is in
  // flight, before the response arrives and the terminal "Listo" appears).
  it('keeps "Sincronizando 1/1" wording when inFlight=true and done===total', () => {
    fixture = TestBed.createComponent(SyncCounterBadgeComponent);
    fixture.componentRef.setInput('done', 1);
    fixture.componentRef.setInput('total', 1);
    fixture.componentRef.setInput('inFlight', true);
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('[role="status"]') as HTMLElement).textContent?.trim())
      .toBe('Sincronizando 1/1');
  });

  it('falls back to terminal "Listo" when inFlight=false and done===total (default behavior preserved)', () => {
    fixture = TestBed.createComponent(SyncCounterBadgeComponent);
    fixture.componentRef.setInput('done', 4);
    fixture.componentRef.setInput('total', 4);
    // inFlight defaults to false; explicit false for clarity.
    fixture.componentRef.setInput('inFlight', false);
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('[role="status"]') as HTMLElement).textContent?.trim())
      .toBe('Listo');
  });
});
