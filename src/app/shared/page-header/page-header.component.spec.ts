import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<PageHeaderComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PageHeaderComponent],
    });
    fixture = TestBed.createComponent(PageHeaderComponent);
  });

  it('renderiza el title', () => {
    fixture.componentRef.setInput('title', 'Mi Pagina');
    fixture.detectChanges();

    const h1 = fixture.nativeElement.querySelector('h1');
    expect(h1.textContent.trim()).toBe('Mi Pagina');
  });

  it('renderiza el subtitle cuando se pasa', () => {
    fixture.componentRef.setInput('title', 'Mi Pagina');
    fixture.componentRef.setInput('subtitle', 'Descripcion corta');
    fixture.detectChanges();

    const subtitle = fixture.nativeElement.querySelector('.subtitle');
    expect(subtitle.textContent.trim()).toBe('Descripcion corta');
  });

  it('no renderiza el subtitle cuando no se pasa', () => {
    fixture.componentRef.setInput('title', 'Mi Pagina');
    fixture.detectChanges();

    const subtitle = fixture.nativeElement.querySelector('.subtitle');
    expect(subtitle).toBeNull();
  });
});
