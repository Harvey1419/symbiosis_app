import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SyncStatusPillComponent } from './sync-status-pill.component';

describe('SyncStatusPillComponent progress', () => {
  it('renders progress when done and total are supplied', () => {
    const fixture = TestBed.createComponent(SyncStatusPillComponent);
    fixture.componentRef.setInput('service', 'Siigo');
    fixture.componentRef.setInput('done', 2);
    fixture.componentRef.setInput('total', 4);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sincronizando 2/4');
  });
});
