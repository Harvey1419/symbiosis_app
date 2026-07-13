import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { LoadingStateComponent } from './loading-state.component';

describe('LoadingStateComponent', () => {
  let fixture: ComponentFixture<LoadingStateComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [LoadingStateComponent],
    });
    fixture = TestBed.createComponent(LoadingStateComponent);
  });

  it('renderiza el mensaje por defecto', () => {
    fixture.detectChanges();

    const p = fixture.nativeElement.querySelector('p');
    expect(p.textContent.trim()).toBe('Cargando...');
  });

  it('renderiza un mensaje custom', () => {
    fixture.componentRef.setInput('message', 'Cargando facturas...');
    fixture.detectChanges();

    const p = fixture.nativeElement.querySelector('p');
    expect(p.textContent.trim()).toBe('Cargando facturas...');
  });

  it('aplica la clase compact cuando compact=true', () => {
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.loading-state');
    expect(container.classList.contains('compact')).toBe(true);
  });

  it('muestra el spinner', () => {
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.spinner');
    expect(spinner).toBeTruthy();
  });
});
