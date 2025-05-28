import { Component, Input, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FileService } from '../../services/file.service';
import { ThemeService } from '../../services/theme.service';
import { FileItem } from '../../models/file.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;
  
  // Navigation items with badges
  navItems = [
    { 
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', 
      label: 'Dashboard', 
      route: '/dashboard',
      badge: null
    },
    { 
      icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z', 
      label: 'My Files', 
      route: '/files',
      badge: null
    },
    { 
      icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4', 
      label: 'Trash', 
      route: '/trash',
      badge: 1 // Recently deleted items
    }
  ];

  // Pinned files functionality removed
  
  // Selected file for details panel
  selectedFile: FileItem | null = null;
  showFileDetails = false;
  
  // For responsive behavior
  isMobile = false;
  isHovering = false;
  
  // Storage info
  storageUsed = 2.5; // GB
  storageTotal = 10; // GB
  storagePercentage = 25; // %
  
  // Theme
  isDarkMode = false;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    public fileService: FileService,
    private themeService: ThemeService
  ) {}
  
  ngOnInit(): void {
    // Check screen size on init
    this.checkScreenSize();
    
    // Pinned files functionality removed
    
    // Subscribe to selected file
    this.fileService.selectedFile$
      .pipe(takeUntil(this.destroy$))
      .subscribe(file => {
        this.selectedFile = file;
        if (file) {
          this.showFileDetails = true;
        }
      });
    
    // Subscribe to theme changes
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.isDarkMode = theme === 'dark';
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  @HostListener('window:resize')
  checkScreenSize(): void {
    this.isMobile = window.innerWidth < 768; // md breakpoint in Tailwind
    if (this.isMobile && !this.collapsed) {
      this.collapsed = true;
    }
  }
  
  onMouseEnter(): void {
    if (this.collapsed) {
      this.isHovering = true;
    }
  }
  
  onMouseLeave(): void {
    this.isHovering = false;
  }
  
  toggleFileDetails(): void {
    this.showFileDetails = !this.showFileDetails;
  }
  
  closeFileDetails(): void {
    this.showFileDetails = false;
  }
  
  selectFile(file: FileItem): void {
    this.fileService.selectFile(file);
  }
  
  // Pinned files functionality removed
  
  // Helper method to safely parse SVG content
  getSvgContent(svgString: string): string {
    return svgString;
  }
  
  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Format date for display
  formatDate(date: Date): string {
    return date.toLocaleDateString();
  }
}
