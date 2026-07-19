import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TokenService } from '@core/token.service';
import { Router } from '@angular/router';
import { SidebarService } from '@core/sidebar.service';
import { FirmaRepository, Firma } from '@data/repositories/firma.repository';
import { ButtonModule } from 'primeng/button';
import { ThemeToggleButtonComponent } from '@app/shared/theme-toggle/theme-toggle.component';

export interface NavItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ButtonModule, ThemeToggleButtonComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  private readonly firmaRepo = inject(FirmaRepository);
  readonly sidebarService = inject(SidebarService);

  readonly usuario = this.tokenService.usuario;
  collapsed = this.sidebarService.collapsed;

  private readonly firmas = signal<Firma[]>([]);

  /**
   * Nav items derivados del tipo_siigo de las firmas del usuario:
   *   - nube-only       → solo "Facturas"
   *   - contador-only   → "Clientes" + "Facturas"
   *   - mixto           → "Clientes" + "Facturas"
   *   - sin firmas      → "Clientes" + "Facturas" (fallback conservador)
   */
  readonly navItems = computed<NavItem[]>(() => {
    const firmas = this.firmas();
    if (firmas.length === 0) {
      return [
        { label: 'Clientes', route: '/clientes' },
        { label: 'Facturas', route: '/facturas' },
      ];
    }
    const hasNube = firmas.some((f) => f.tipo_siigo === 'nube');
    if (hasNube && firmas.every((f) => f.tipo_siigo === 'nube')) {
      return [{ label: 'Facturas', route: '/facturas' }];
    }
    return [
      { label: 'Clientes', route: '/clientes' },
      { label: 'Facturas', route: '/facturas' },
    ];
  });

  ngOnInit(): void {
    this.firmaRepo.getFirmas().subscribe({
      next: (firmas) => this.firmas.set(firmas),
      error: () => this.firmas.set([]),
    });
  }

  toggleCollapse(): void {
    this.sidebarService.toggle();
  }

  logout(): void {
    this.tokenService.clearToken();
    this.router.navigate(['/auth/login']);
  }
}