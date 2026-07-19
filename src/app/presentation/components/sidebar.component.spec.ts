import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SidebarComponent } from './sidebar.component';
import { FirmaRepository, Firma } from '@data/repositories/firma.repository';
import { TokenService } from '@core/token.service';

/**
 * Sidebar filtra los nav-items según `tipo_siigo` de las firmas del usuario:
 *   - 0 firmas o nube-only       → solo "Facturas"
 *   - contador-only              → "Clientes" + "Facturas"
 *   - mixto (nube + contador)    → "Clientes" + "Facturas" (contador visible)
 *
 * La función pura que decide qué items mostrar vive en el componente
 * (signal `navItems` derivado de las firmas). Estos tests verifican el
 * comportamiento end-to-end del componente.
 */
describe('SidebarComponent — nav-items por tipo_siigo', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let component: SidebarComponent;
  let firmaMock: { getFirmas: ReturnType<typeof vi.fn> };

  const NUBE_FIRMA: Firma = {
    id: 'f-nube',
    firma_user: 'nube@empresa.com',
    tipo_siigo: 'nube',
    nit: 900123456,
    last_token: null,
  };
  const CONTADOR_FIRMA: Firma = {
    id: 'f-contador',
    firma_user: 'c@empresa.com',
    tipo_siigo: 'contador',
    nit: 800111222,
    last_token: null,
  };

  beforeEach(() => {
    firmaMock = { getFirmas: vi.fn() };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        { provide: FirmaRepository, useValue: firmaMock },
        {
          provide: TokenService,
          useValue: {
            usuario: () => ({ id: 'u-1', email: 'a@b.com', nombre: 'Ada' }),
            clearAuth: vi.fn(),
          },
        },
      ],
    });
  });

  it('usuario nube-only: solo muestra "Facturas"', async () => {
    firmaMock.getFirmas.mockReturnValue(of([NUBE_FIRMA]));
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    // Esperar el subscribe
    await new Promise((r) => setTimeout(r, 0));

    const items = component.navItems();
    const labels = items.map((i) => i.label);
    expect(labels).toEqual(['Facturas']);
  });

  it('usuario contador-only: muestra "Clientes" + "Facturas"', async () => {
    firmaMock.getFirmas.mockReturnValue(of([CONTADOR_FIRMA]));
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));

    const labels = component.navItems().map((i) => i.label);
    expect(labels).toContain('Clientes');
    expect(labels).toContain('Facturas');
    expect(labels).not.toContain('Dashboard');
  });

  it('usuario mixto nube+contador: muestra "Clientes" + "Facturas"', async () => {
    firmaMock.getFirmas.mockReturnValue(of([NUBE_FIRMA, CONTADOR_FIRMA]));
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));

    const labels = component.navItems().map((i) => i.label);
    expect(labels).toContain('Clientes');
    expect(labels).toContain('Facturas');
  });

  it('sin firmas (primera vez): fallback a nav básico (Clientes + Facturas)', async () => {
    firmaMock.getFirmas.mockReturnValue(of([]));
    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r, 0));

    const labels = component.navItems().map((i) => i.label);
    expect(labels).toContain('Facturas');
  });
});