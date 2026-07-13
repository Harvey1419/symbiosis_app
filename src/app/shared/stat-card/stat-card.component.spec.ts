import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  let fixture: ComponentFixture<StatCardComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [StatCardComponent],
    });
    fixture = TestBed.createComponent(StatCardComponent);
  });

  it('renderiza label y value', () => {
    fixture.componentRef.setInput('label', 'Clientes');
    fixture.componentRef.setInput('value', 42);
    fixture.detectChanges();

    const value = fixture.nativeElement.querySelector('.stat-value');
    const label = fixture.nativeElement.querySelector('.stat-label');
    expect(value.textContent.trim()).toBe('42');
    expect(label.textContent.trim()).toBe('Clientes');
  });

  it('aplica el iconClass al elemento i', () => {
    fixture.componentRef.setInput('label', 'Test');
    fixture.componentRef.setInput('value', 1);
    fixture.componentRef.setInput('iconClass', 'pi pi-users');
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('.stat-icon i');
    expect(icon.className).toContain('pi-users');
  });

  it('aplica variant como data attribute', () => {
    fixture.componentRef.setInput('label', 'Test');
    fixture.componentRef.setInput('value', 1);
    fixture.componentRef.setInput('variant', 'pending');
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.stat-card');
    expect(card.getAttribute('data-variant')).toBe('pending');
  });

  it('usa variant="default" por defecto', () => {
    fixture.componentRef.setInput('label', 'Test');
    fixture.componentRef.setInput('value', 1);
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.stat-card');
    expect(card.getAttribute('data-variant')).toBe('default');
  });
});
