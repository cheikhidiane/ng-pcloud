import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const AuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  console.log('Auth guard checking authentication status');
  
  // Check if user is authenticated
  if (authService.isAuthenticated()) {
    console.log('User is authenticated, allowing access');
    return true;
  }
  
  // Check if we have a refresh token to try
  if (authService.hasRefreshToken()) {
    console.log('User has refresh token, attempting to refresh before guard decision');
    // Try to refresh the token
    return new Promise<boolean | UrlTree>(resolve => {
      authService.refreshToken().subscribe({
        next: () => {
          console.log('Token refreshed successfully in guard, allowing access');
          resolve(true);
        },
        error: (err) => {
          console.error('Token refresh failed in guard:', err);
          console.log('Redirecting to login page');
          resolve(router.createUrlTree(['/auth/login']));
        }
      });
    });
  }
  
  console.log('No authentication found, redirecting to login');
  // Redirect to login page if not authenticated
  return router.createUrlTree(['/auth/login']);
};
