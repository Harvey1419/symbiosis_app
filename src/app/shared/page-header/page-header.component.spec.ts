import { describe, it, expect, beforeEach } from 'vitest';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { PageHeaderComponent } from './page-header.component';

@Component({
  standalone: true,
  imports: [PageHeaderComponent],
  template: `
    <ng-template #backTemplate><span>BACK-MARKER</span></ng-template>
    <app-page-header [title]="'Mi Pagina'" [backRef]="backTemplate" />
  `,
})
class PageHeaderHostComponent {}

describe('PageHeaderComponent', () => {
  let fixture: ComponentFixture<PageHeaderComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [PageHeaderComponent, PageHeaderHostComponent],
    });
    fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentRef.setInput('title', 'Mi Pagina');
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

  it('renders the back template content when backRef is provided', () => {
    const hostFixture = TestBed.createComponent(PageHeaderHostComponent);
    hostFixture.detectChanges();

    expect(hostFixture.nativeElement.textContent).toContain('BACK-MARKER');
  });

  it('no renderiza el subtitle cuando no se pasa', () => {
    fixture.componentRef.setInput('title', 'Mi Pagina');
    fixture.detectChanges();

    const subtitle = fixture.nativeElement.querySelector('.subtitle');
    expect(subtitle).toBeNull();
  });
});
