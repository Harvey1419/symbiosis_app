import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TokenService } from '@core/token.service';

export const authGuard: CanActivateFn = () => {
  if (inject(TokenService).isAuthenticated()) {
    return true;
  }
  return inject(Router).createUrlTree(['/auth/login']);
};