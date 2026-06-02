import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TokenService } from '@core/token.service';
import { Router } from '@angular/router';
import { SidebarService } from '@core/sidebar.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);
  readonly sidebarService = inject(SidebarService);

  collapsed = this.sidebarService.collapsed;

  toggleCollapse(): void {
    this.sidebarService.toggle();
  }

  logout(): void {
    this.tokenService.clearToken();
    this.router.navigate(['/auth/login']);
  }
}