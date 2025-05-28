import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      username: ['', [Validators.required, Validators.email]], // Username should be an email
      email: ['', [Validators.required, Validators.email]],
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
    if (this.registerForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    // Copy the form value
    const userData = {...this.registerForm.value};
    
    // Set username to be the same as email if not provided
    if (!userData.username) {
      userData.username = userData.email;
    }
    
    console.log('Submitting registration form:', userData);

    this.authService.register(userData).subscribe({
      next: (response) => {
        console.log('Registration successful, navigating to dashboard');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Registration error response:', error);
        this.isSubmitting = false;
        
        if (error.error) {
          if (typeof error.error === 'string') {
            this.errorMessage = error.error;
          } else {
            // Handle field-specific errors
            if (error.error.email) {
              this.errorMessage = `Email: ${error.error.email}`;
              this.registerForm.get('email')?.setErrors({'serverError': error.error.email});
            } else if (error.error.password) {
              this.errorMessage = `Password: ${error.error.password}`;
              this.registerForm.get('password')?.setErrors({'serverError': error.error.password});
            } else if (error.error.first_name) {
              this.errorMessage = `First name: ${error.error.first_name}`;
              this.registerForm.get('first_name')?.setErrors({'serverError': error.error.first_name});
            } else if (error.error.last_name) {
              this.errorMessage = `Last name: ${error.error.last_name}`;
              this.registerForm.get('last_name')?.setErrors({'serverError': error.error.last_name});
            } else if (error.error.detail) {
              this.errorMessage = error.error.detail;
            } else if (error.error.non_field_errors) {
              this.errorMessage = error.error.non_field_errors.join(', ');
            } else {
              this.errorMessage = 'Registration failed. Please check your information and try again.';
            }
          }
        } else if (error.message) {
          this.errorMessage = error.message;
        } else {
          this.errorMessage = 'Registration failed. Please try again.';
        }
      }
    });
  }
}
