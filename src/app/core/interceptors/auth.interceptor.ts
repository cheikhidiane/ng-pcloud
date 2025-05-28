import {
  HttpRequest,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { inject } from '@angular/core';
import { catchError, filter, finalize, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

// Shared state for token refresh
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const AuthInterceptor: HttpInterceptorFn = (request: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  
  // Skip adding token for authentication endpoints
  if (isAuthUrl(request.url)) {
    console.log('Skipping auth for auth URL:', request.url);
    return next(request);
  }

  // Add token to request
  const token = authService.getToken();
  if (token) {
    console.log('Adding token to request:', request.url);
    request = addToken(request, token);
  } else {
    // If no token is available, try to refresh it before proceeding
    // This helps when the app is reloaded but the token is expired
    if (authService.hasRefreshToken()) {
      console.log('No token available but refresh token exists. Refreshing token for:', request.url);
      return authService.refreshToken().pipe(
        switchMap(response => {
          console.log('Token refreshed successfully, proceeding with request');
          return next(addToken(request, response.access));
        }),
        catchError(error => {
          // If refresh fails, continue without token
          console.error('Token refresh failed on startup:', error);
          // Don't clear auth here, let the 401 handler do it if needed
          return next(request);
        })
      );
    } else {
      console.log('No authentication tokens available for request:', request.url);
    }
  }

  return next(request).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401Error(request, next, authService);
      }
      return throwError(() => error);
    })
  );
};

const addToken = (request: HttpRequest<any>, token: string): HttpRequest<any> => {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
};

const handle401Error = (request: HttpRequest<any>, next: HttpHandlerFn, authService: AuthService): Observable<HttpEvent<any>> => {
  // Skip token refresh for auth endpoints to avoid infinite loops
  if (isAuthUrl(request.url)) {
    console.log('401 error on auth URL, not attempting refresh:', request.url);
    return throwError(() => new Error('Authentication failed'));
  }
  
  console.log('Handling 401 error for URL:', request.url);
  
  if (!isRefreshing) {
    console.log('Starting token refresh process');
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap(response => {
        console.log('Token refresh successful, continuing with original request');
        refreshTokenSubject.next(response.access);
        return next(addToken(request, response.access));
      }),
      catchError(error => {
        // If refresh token fails, log out the user
        console.error('Token refresh failed in interceptor:', error);
        console.log('Clearing authentication state due to refresh failure');
        authService.clearAuth(); // Ensure user is logged out on refresh failure
        return throwError(() => new Error('Session expired. Please log in again.'));
      }),
      finalize(() => {
        console.log('Token refresh process completed');
        isRefreshing = false;
      })
    );
  } else {
    console.log('Token refresh already in progress, waiting for completion');
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        if (token) {
          console.log('Using newly refreshed token for queued request');
          return next(addToken(request, token));
        }
        console.log('No token available after refresh, authentication failed');
        return throwError(() => new Error('Authentication failed. Please log in again.'));
      })
    );
  }
};

const isAuthUrl = (url: string): boolean => {
  // Only exclude registration and login endpoints from token requirement
  return (
    url.includes('/api/account/register/') ||
    url.includes('/api/account/token/')
  );
};
