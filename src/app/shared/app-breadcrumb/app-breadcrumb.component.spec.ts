import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import type { MenuItem } from 'primeng/api';
import { AppBreadcrumbComponent } from './app-breadcrumb.component';

describe('AppBreadcrumbComponent', () => {
  let fixture: ComponentFixture<AppBreadcrumbComponent>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AppBreadcrumbComponent],
      providers: [provideAnimations(), provideRouter([])],
    });
    fixture = TestBed.createComponent(AppBreadcrumbComponent);
  });

  it('renders p-breadcrumb with the provided model', async () => {
    const model: MenuItem[] = [
      { label: 'Firmas', routerLink: ['/clientes'] },
      { label: 'Firma Alpha' },
    ];

    fixture.componentRef.setInput('model', model);
    await fixture.whenStable();

    const breadcrumb = fixture.debugElement.query(By.css('p-breadcrumb'));
    expect(breadcrumb).not.toBeNull();
    const instance = breadcrumb.componentInstance as {
      model: MenuItem[] | (() => MenuItem[]);
    };
    const renderedModel = typeof instance.model === 'function' ? instance.model() : instance.model;
    expect(renderedModel).toEqual(model);
  });

  it('passes the home input to p-breadcrumb', async () => {
    const model: MenuItem[] = [{ label: 'Firma Alpha' }];
    const home: MenuItem = { icon: 'pi pi-home', routerLink: ['/clientes'] };

    fixture.componentRef.setInput('model', model);
    fixture.componentRef.setInput('home', home);
    await fixture.whenStable();

    const breadcrumb = fixture.debugElement.query(By.css('p-breadcrumb'));
    const instance = breadcrumb.componentInstance as {
      home: MenuItem | undefined | (() => MenuItem | undefined);
    };
    const renderedHome = typeof instance.home === 'function' ? instance.home() : instance.home;
    expect(renderedHome).toEqual(home);
  });

  it('renders p-breadcrumb when home is undefined', async () => {
    fixture.componentRef.setInput('model', [{ label: 'Firma Alpha' }]);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('p-breadcrumb')).not.toBeNull();
  });
});
