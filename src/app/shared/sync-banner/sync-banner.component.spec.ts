import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SyncBannerComponent } from './sync-banner.component';

describe('SyncBannerComponent progress', () => {
  it('renders progress when done and total are supplied', () => {
    const fixture = TestBed.createComponent(SyncBannerComponent);
    fixture.componentRef.setInput('title', 'Siigo');
    fixture.componentRef.setInput('subtitle', 'Catalogs');
    fixture.componentRef.setInput('done', 2);
    fixture.componentRef.setInput('total', 4);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sincronizando 2/4');
  });
});
