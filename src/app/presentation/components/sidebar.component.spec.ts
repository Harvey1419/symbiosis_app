import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TokenService } from '@core/token.service';

/**
 * Sidebar muestra únicamente "Clientes" en el menú (Facturas y Dashboard
 * quedan ocultos por ahora). Los nav-items ya no se derivan de las firmas
 * del usuario, así que los tests verifican el contenido estático del array.
 */
describe('SidebarComponent — nav-items', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let component: SidebarComponent;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        {
          provide: TokenService,
          useValue: {
            usuario: () => ({ id: 'u-1', email: 'a@b.com', nombre: 'Ada' }),
            clearAuth: () => undefined,
          },
        },
      ],
    });
  });

  it('muestra únicamente "Clientes" en el menú', () => {
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const labels = component.navItems.map((i) => i.label);
    expect(labels).toEqual(['Clientes']);
  });

  it('la ruta de Clientes apunta a /clientes', () => {
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.navItems[0].route).toBe('/clientes');
  });

  it('no incluye Facturas ni Dashboard en el menú', () => {
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const labels = component.navItems.map((i) => i.label);
    expect(labels).not.toContain('Facturas');
    expect(labels).not.toContain('Dashboard');
  });
});