import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  let fixture: ComponentFixture<StatusBadgeComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [StatusBadgeComponent],
    });
    fixture = TestBed.createComponent(StatusBadgeComponent);
  });

  it('mapea "active" a severity "success"', () => {
    fixture.componentRef.setInput('status', 'active');
    fixture.detectChanges();

    expect(fixture.componentInstance.severity()).toBe('success');
  });

  it('mapea "pendiente" a severity "info"', () => {
    fixture.componentRef.setInput('status', 'pendiente');
    fixture.detectChanges();

    expect(fixture.componentInstance.severity()).toBe('info');
  });

  it('mapea "error" a severity "danger"', () => {
    fixture.componentRef.setInput('status', 'error');
    fixture.detectChanges();

    expect(fixture.componentInstance.severity()).toBe('danger');
  });

  it('mapea "causada" a severity "success"', () => {
    fixture.componentRef.setInput('status', 'causada');
    fixture.detectChanges();

    expect(fixture.componentInstance.severity()).toBe('success');
  });

  it('mapea "finalizada" a severity "success"', () => {
    fixture.componentRef.setInput('status', 'finalizada');
    fixture.detectChanges();

    expect(fixture.componentInstance.severity()).toBe('success');
  });

  it('capitaliza el label', () => {
    fixture.componentRef.setInput('status', 'active');
    fixture.detectChanges();

    expect(fixture.componentInstance.label()).toBe('Active');
  });

  it('usa severity "secondary" para status desconocido', () => {
    fixture.componentRef.setInput('status', 'unknown_status');
    fixture.detectChanges();

    expect(fixture.componentInstance.severity()).toBe('secondary');
  });
});
