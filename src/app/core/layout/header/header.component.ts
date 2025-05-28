import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { FileService } from '../../services/file.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  @Input() isSidebarCollapsed = false;
  @Input() isDarkMode = false;
  
  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() toggleDarkMode = new EventEmitter<void>();
  
  isUserMenuOpen = false;
  showNotifications = false;
  searchQuery = '';
  
  constructor(
    private router: Router,
    private fileService: FileService,
    private authService: AuthService
  ) {}
  
  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }
  
  onToggleDarkMode(): void {
    this.toggleDarkMode.emit();
  }
  
  uploadFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    // Default to root folder if no current folder is selected
    const folderId = 'root';
    
    this.fileService.uploadFile(file, folderId).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          console.log('Upload complete');
          // Reset the input
          input.value = '';
          // Provide user feedback
          alert('File uploaded successfully!');
        }
      },
      error: (err) => {
        console.error('Error uploading file:', err);
        alert('Failed to upload file. Please try again.');
      }
    });
  }
  
  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    // Close notifications if user menu is opened
    if (this.isUserMenuOpen) {
      this.showNotifications = false;
    }
  }
  
  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    // Close user menu if notifications are opened
    if (this.showNotifications) {
      this.isUserMenuOpen = false;
    }
  }
  
  onSearch(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    // Handle search functionality
    console.log('Searching for:', query);
    // Implement search logic or navigate to search results
    if (query && event instanceof KeyboardEvent && event.key === 'Enter') {
      this.router.navigate(['/files'], { queryParams: { search: query } });
    }
  }
  
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Error logging out:', error);
        // Force logout even if API call fails
        this.authService.clearAuth();
        this.router.navigate(['/auth/login']);
      }
    });
  }
}
