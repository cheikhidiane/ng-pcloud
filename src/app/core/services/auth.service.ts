import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthResponse, LoginRequest, RefreshTokenRequest, RegisterRequest, User } from '../models/api.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // API URL - Using relative path for proxy
  private API_URL = 'http://127.0.0.1:8000/api';
  
  // HTTP Options to handle CORS
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }),
    withCredentials: true // Set to true if your API requires cookies/credentials
  };
  private readonly TOKEN_KEY = 'pcloud_auth_token';
  private readonly REFRESH_TOKEN_KEY = 'pcloud_refresh_token';
  private readonly USER_KEY = 'pcloud_user';
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredAuth();
  }

  private loadStoredAuth(): void {
    console.log('Loading stored authentication data');
    const token = localStorage.getItem(this.TOKEN_KEY);
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    const userJson = localStorage.getItem(this.USER_KEY);
    
    if (token) {
      console.log('Found stored token, setting authenticated state');
      this.isAuthenticatedSubject.next(true);
      
      if (userJson) {
        try {
          const user = JSON.parse(userJson) as User;
          this.currentUserSubject.next(user);
          console.log('Loaded user from storage:', user);
        } catch (error) {
          console.error('Error parsing stored user data', error);
          // Try to fetch user profile instead of clearing auth
          this.fetchUserProfile().subscribe({
            next: () => console.log('Successfully fetched user profile after parse error'),
            error: () => console.error('Failed to fetch user profile after parse error')
          });
        }
      } else if (refreshToken) {
        // We have a token but no user data, try to fetch the user profile
        console.log('Token found but no user data, fetching profile');
        this.fetchUserProfile().subscribe({
          next: () => console.log('Successfully fetched user profile on app init'),
          error: () => console.error('Failed to fetch user profile on app init')
        });
      }
    } else if (refreshToken) {
      // We have a refresh token but no access token, try to refresh
      console.log('No access token found, but refresh token exists. Attempting refresh...');
      this.refreshToken().subscribe({
        next: () => console.log('Successfully refreshed token on app init'),
        error: (err) => {
          console.error('Failed to refresh token on app init', err);
          this.clearAuth();
        }
      });
    } else {
      console.log('No authentication data found');
      this.clearAuth();
    }
  }

  public register(userData: RegisterRequest): Observable<AuthResponse> {
    console.log('Registering user:', userData);
    // Simplify the registration flow to debug the issue
    return this.http.post<AuthResponse>(`${this.API_URL}/account/register/`, userData, this.httpOptions)
      .pipe(
        tap(response => {
          console.log('Registration response:', response);
          // Store tokens
          if (response.access) {
            localStorage.setItem(this.TOKEN_KEY, response.access);
          }
          if (response.refresh) {
            localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh);
          }
          this.isAuthenticatedSubject.next(true);
          
          // Fetch user profile separately
          this.fetchUserProfile().subscribe({
            next: user => console.log('User profile fetched after registration:', user),
            error: err => console.error('Error fetching user profile after registration:', err)
          });
        }),
        catchError(error => {
          console.error('Registration error', error);
          return throwError(() => error);
        })
      );
  }

  public login(credentials: LoginRequest): Observable<AuthResponse> {
    console.log('Logging in user:', credentials);
    // Simplify the login flow to debug the issue
    return this.http.post<AuthResponse>(`${this.API_URL}/account/token/`, credentials, this.httpOptions)
      .pipe(
        tap(response => {
          console.log('Login response:', response);
          // Store tokens
          if (response.access) {
            localStorage.setItem(this.TOKEN_KEY, response.access);
          }
          if (response.refresh) {
            localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh);
          }
          this.isAuthenticatedSubject.next(true);
          
          // Fetch user profile separately
          this.fetchUserProfile().subscribe({
            next: user => console.log('User profile fetched after login:', user),
            error: err => console.error('Error fetching user profile after login:', err)
          });
        }),
        catchError(error => {
          console.error('Login error', error);
          return throwError(() => error);
        })
      );
  }

  public logout(): Observable<any> {
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    const payload = refreshToken ? { refresh: refreshToken } : {};
    
    // Clear auth data first to ensure user is logged out even if API call fails
    this.clearAuth();
    
    return this.http.post(`${this.API_URL}/account/logout/`, payload, this.httpOptions)
      .pipe(
        catchError(error => {
          console.error('Logout error', error);
          return throwError(() => error);
        })
      );
  }

  public refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    
    const payload: RefreshTokenRequest = { refresh: refreshToken };
    
    return this.http.post<AuthResponse>(`${this.API_URL}/account/token/refresh/`, payload, this.httpOptions)
      .pipe(
        tap(response => {
          // Update the access token in localStorage
          localStorage.setItem(this.TOKEN_KEY, response.access);
          
          // If the response includes a new refresh token, update it as well
          if (response.refresh) {
            localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh);
          }
          
          // If the response includes user data, update it
          if (response.user) {
            localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
            this.currentUserSubject.next(response.user);
          }
          
          // Ensure authentication state is updated
          this.isAuthenticatedSubject.next(true);
        }),
        catchError(error => {
          console.error('Token refresh error', error);
          // If refresh fails, log the user out
          this.clearAuth();
          return throwError(() => error);
        })
      );
  }

  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }
  
  public hasRefreshToken(): boolean {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY) !== null;
  }

  public isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  public getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private handleAuthResponse(response: AuthResponse): void {
    // Handle different response formats
    const accessToken = response.access || response.token || '';
    const refreshToken = response.refresh || '';
    
    if (!accessToken) {
      console.error('No access token in response:', response);
      throw new Error('Authentication failed: No access token received');
    }
    
    localStorage.setItem(this.TOKEN_KEY, accessToken);
    
    if (refreshToken) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    }
    
    // Note: We'll fetch the user profile separately
    // if the response includes user data, use it
    if (response.user) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
      this.currentUserSubject.next(response.user);
    }
    
    this.isAuthenticatedSubject.next(true);
  }

  public clearAuth(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    
    // Navigate to login page
    this.router.navigate(['/auth/login']);
  }
  
  /**
   * Fetch the user profile from the API
   */
  public fetchUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/account/profile/`, this.httpOptions).pipe(
      tap(user => {
        console.log('User profile fetched:', user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.currentUserSubject.next(user);
      }),
      catchError(error => {
        console.error('Error fetching user profile:', error);
        return throwError(() => error);
      })
    );
  }
}
