import { Component, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './presentation/components/sidebar.component';
import { CommonModule } from '@angular/common';
import { SidebarService } from '@core/sidebar.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class App {
  showSidebar = false;
  readonly sidebarService = inject(SidebarService);

  constructor(private router: Router) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const authRoutes = ['/auth/login', '/auth/register'];
        this.showSidebar = !authRoutes.some(route => this.router.url.startsWith(route));
      }
    });
  }
}