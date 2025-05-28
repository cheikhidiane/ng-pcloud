import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]], // Username field should contain email
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Redirect if already logged in
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach(key => {
        const control = this.loginForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const credentials = this.loginForm.value;
    console.log('Submitting login form:', credentials);

    this.authService.login(credentials).subscribe({
      next: (response) => {
        console.log('Login successful, navigating to dashboard');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Login error response:', error);
        this.isSubmitting = false;
        
        if (error.error) {
          if (error.error.detail) {
            this.errorMessage = error.error.detail;
          } else if (error.error.non_field_errors) {
            this.errorMessage = error.error.non_field_errors.join(', ');
          } else if (error.error.email) {
            this.errorMessage = `Email: ${error.error.email}`;
          } else if (error.error.password) {
            this.errorMessage = `Password: ${error.error.password}`;
          } else {
            this.errorMessage = 'Login failed. Please check your credentials and try again.';
          }
        } else if (error.message) {
          this.errorMessage = error.message;
        } else {
          this.errorMessage = 'Login failed. Please check your credentials and try again.';
        }
      }
    });
  }
}
