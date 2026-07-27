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
});
