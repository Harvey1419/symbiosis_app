import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
    });
    fixture = TestBed.createComponent(EmptyStateComponent);
  });

  it('renderiza el title', () => {
    fixture.componentRef.setInput('title', 'Sin datos');
    fixture.detectChanges();

    const h3 = fixture.nativeElement.querySelector('h3');
    expect(h3.textContent.trim()).toBe('Sin datos');
  });

  it('renderiza la description cuando se pasa', () => {
    fixture.componentRef.setInput('title', 'Sin datos');
    fixture.componentRef.setInput('description', 'Intenta sincronizar');
    fixture.detectChanges();

    const p = fixture.nativeElement.querySelector('p');
    expect(p.textContent.trim()).toBe('Intenta sincronizar');
  });

  it('aplica el iconClass al elemento i', () => {
    fixture.componentRef.setInput('title', 'Sin datos');
    fixture.componentRef.setInput('iconClass', 'pi pi-file');
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('i');
    expect(icon.className).toContain('pi-file');
    expect(icon.className).toContain('pi');
  });
});
