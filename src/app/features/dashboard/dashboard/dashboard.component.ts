import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { StorageUsageComponent } from '../storage-usage/storage-usage.component';
import { RecentFilesComponent } from '../recent-files/recent-files.component';
import { AuthService } from '../../../core/services/auth.service';
import { FileService } from '../../../core/services/file.service';
import { User } from '../../../core/models/api.model';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StorageUsageComponent, RecentFilesComponent, UpperCasePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  user: User | null = null;
  isProfileDropdownOpen = false;
  isUploading = false;
  uploadProgress = 0;
  
  storageUsage = {
    used: 0, // GB
    total: 0, // GB
    percentage: 0,
    nb_files: 0,
    nb_documents: 0,
    nb_media: 0,
    nb_other: 0
  };

  recentFiles: any[] = [];
  
  constructor(
    private authService: AuthService,
    private fileService: FileService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    // Subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      console.log('Current user in dashboard:', user);
      
      // Fetch user data once we have the user
      if (user) {
        this.loadUserData();
      }
    });
    
    // If no user is loaded from the subscription, try to fetch it
    if (!this.user) {
      this.authService.fetchUserProfile().subscribe({
        next: (user) => {
          console.log('User profile fetched in dashboard:', user);
          this.user = user;
          this.loadUserData();
        },
        error: (err) => {
          console.error('Error fetching user profile in dashboard:', err);
        }
      });
    }
  }
  
  private loadUserData(): void {
    // Fetch storage statistics
    this.fileService.getStats().subscribe({
      next: (stats) => {
        console.log('Storage stats:', stats);
        const usedGB = stats.used_storage / (1024 * 1024 * 1024); // Convert bytes to GB
        const totalGB = stats.storage / (1024 * 1024 * 1024); // Convert bytes to GB
        
        this.storageUsage = {
          used: parseFloat(usedGB.toFixed(2)),
          total: parseFloat(totalGB.toFixed(2)),
          percentage: Math.round((usedGB / totalGB) * 100) || 0,
          nb_documents: stats.nb_documents,
          nb_files: stats.nb_files,
          nb_media: stats.nb_media,
          nb_other: stats.nb_other
        };
      },
      error: (err) => {
        console.error('Error fetching storage stats:', err);
      }
    });
    
    // Fetch recent files
    this.fileService.getFiles().subscribe({
      next: (files) => {
        console.log('Files fetched:', files);
        // Sort by lastModified date (newest first) and take the first 5
        this.recentFiles = files
          .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
          .slice(0, 5)
          .map(file => ({
            name: file.name,
            type: file.type,
            size: this.formatFileSize(file.size),
            lastModified: file.lastModified
          }));
      },
      error: (err) => {
        console.error('Error fetching recent files:', err);
      }
    });
  }
  
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  toggleProfileDropdown(): void {
    this.isProfileDropdownOpen = !this.isProfileDropdownOpen;
  }
  
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logged out successfully');
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Even if the API call fails, we should clear local auth data
        this.authService.clearAuth();
        this.router.navigate(['/auth/login']);
      }
    });
  }
  
  // File upload methods
  openFileSelector(): void {
    this.fileInput.nativeElement.click();
  }
  
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.uploadFiles(input.files);
    }
  }
  
  uploadFiles(files: FileList): void {
    this.isUploading = true;
    this.uploadProgress = 0;
    
    // For simplicity, we'll just upload the first file
    const file = files[0];
    
    this.fileService.uploadFile(file, 'root').subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress = Math.round(100 * event.loaded / event.total);
        } else if (event.type === HttpEventType.Response) {
          console.log('Upload complete:', event.body);
          this.isUploading = false;
          // Refresh the file list or show success message
          // You might want to refresh your file list here
        }
      },
      error: (error) => {
        console.error('Upload error:', error);
        this.isUploading = false;
        // Show error message
      }
    });
  }
  
  createNewFolder(): void {
    console.log('Create new folder clicked');
    // Navigate to file manager with a special flag to show the create folder dialog
    this.router.navigate(['/files'], { queryParams: { createFolder: 'true' } });
  }
  
  viewTrash(): void {
    console.log('View trash clicked');
    // Navigate to file manager with trash view
    this.router.navigate(['/files'], { queryParams: { view: 'trash' } });
  }
}
