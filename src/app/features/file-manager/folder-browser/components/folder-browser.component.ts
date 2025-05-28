import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FileService } from '../../../../core/services/file.service';
import { FileItem, FolderItem, mapApiFileToFileItem, mapApiFolderToFolderItem } from '../../../../core/models/file.model';
import { BehaviorSubject, Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { FileUploadComponent } from '../../file-upload/components/file-upload.component';

@Component({
  selector: 'app-folder-browser',
  templateUrl: './folder-browser.component.html',
  styleUrls: ['./folder-browser.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule, FileUploadComponent]
})
export class FolderBrowserComponent implements OnInit {
  currentFolderId = 'root';
  currentFolder: FolderItem | null = null;
  breadcrumbs: { id: string; name: string }[] = [{ id: 'root', name: 'Home' }];
  
  files: FileItem[] = [];
  folders: FolderItem[] = [];
  
  isLoading = true;
  error: string | null = null;
  
  showUploadModal = false;
  
  sortField: 'name' | 'lastModified' | 'size' = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  viewMode: 'grid' | 'list' = 'grid';
  
  selectedItems: Set<string> = new Set();
  
  constructor(private fileService: FileService) {}

  ngOnInit(): void {
    this.loadFolderContents(this.currentFolderId);
  }
  
  loadFolderContents(folderId: string): void {
    this.isLoading = true;
    this.error = null;
    this.currentFolderId = folderId;
    this.selectedItems.clear();
    
    // If not the root folder, load the folder details to update breadcrumbs
    if (folderId !== 'root') {
      this.fileService.getFolderById(folderId).subscribe({
        next: (folder) => {
          this.currentFolder = folder;
          this.updateBreadcrumbs(folder);
        },
        error: (err) => {
          console.error('Error loading folder details:', err);
          this.error = 'Failed to load folder details';
        }
      });
    } else {
      this.currentFolder = null;
      this.breadcrumbs = [{ id: 'root', name: 'Home' }];
    }
    
    // Load folder contents (files and subfolders)
    this.fileService.getFolderContents(folderId).subscribe({
      next: (contents) => {
        this.folders = contents.folders.map(folder => 
          mapApiFolderToFolderItem(folder)
        );
        
        this.files = contents.files.map(file => 
          mapApiFileToFileItem(file)
        );
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading folder contents:', err);
        this.error = 'Failed to load folder contents';
        this.isLoading = false;
      }
    });
  }
  
  updateBreadcrumbs(folder: FolderItem): void {
    // Reset breadcrumbs
    this.breadcrumbs = [{ id: 'root', name: 'Home' }];
    
    // Build path from current folder
    const path = folder.path.split('/').filter(p => p);
    let currentPath = '';
    let currentId = 'root';
    
    // This is simplified - in a real app, you would need to fetch the folder IDs
    // for each level of the path or maintain a mapping of paths to IDs
    for (let i = 0; i < path.length; i++) {
      currentPath += '/' + path[i];
      if (i === path.length - 1) {
        currentId = folder.id;
      }
      
      this.breadcrumbs.push({
        id: currentId,
        name: path[i]
      });
    }
  }
  
  navigateToFolder(folderId: string): void {
    this.loadFolderContents(folderId);
  }
  
  navigateToBreadcrumb(index: number): void {
    if (index >= 0 && index < this.breadcrumbs.length) {
      this.loadFolderContents(this.breadcrumbs[index].id);
    }
  }
  
  createNewFolder(): void {
    const folderName = prompt('Enter folder name:');
    if (folderName) {
      this.fileService.createFolder({
        name: folderName,
        parent_id: this.currentFolderId
      }).subscribe({
        next: (folder) => {
          // Reload the current folder to show the new folder
          this.loadFolderContents(this.currentFolderId);
        },
        error: (err) => {
          console.error('Error creating folder:', err);
          this.error = 'Failed to create folder';
        }
      });
    }
  }
  
  toggleUploadModal(): void {
    this.showUploadModal = !this.showUploadModal;
  }
  
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }
  
  toggleItemSelection(id: string, event: MouseEvent): void {
    event.stopPropagation();
    
    if (this.selectedItems.has(id)) {
      this.selectedItems.delete(id);
    } else {
      this.selectedItems.add(id);
    }
  }
  
  isSelected(id: string): boolean {
    return this.selectedItems.has(id);
  }
  
  selectAll(): void {
    if (this.selectedItems.size === this.files.length + this.folders.length) {
      // If all are selected, deselect all
      this.selectedItems.clear();
    } else {
      // Select all
      this.selectedItems.clear();
      this.files.forEach(file => this.selectedItems.add(file.id));
      this.folders.forEach(folder => this.selectedItems.add(folder.id));
    }
  }
  
  deleteSelected(): void {
    if (this.selectedItems.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${this.selectedItems.size} item(s)?`)) {
      const deletePromises: Observable<any>[] = [];
      
      // Delete selected files
      this.files.forEach(file => {
        if (this.selectedItems.has(file.id)) {
          deletePromises.push(
            this.fileService.deleteFile(file.id).pipe(
              catchError(err => {
                console.error(`Error deleting file ${file.name}:`, err);
                return of(null);
              })
            )
          );
        }
      });
      
      // Delete selected folders
      this.folders.forEach(folder => {
        if (this.selectedItems.has(folder.id)) {
          deletePromises.push(
            this.fileService.deleteFolder(folder.id).pipe(
              catchError(err => {
                console.error(`Error deleting folder ${folder.name}:`, err);
                return of(null);
              })
            )
          );
        }
      });
      
      // Execute all delete operations
      if (deletePromises.length > 0) {
        // Use forkJoin in a real app to wait for all operations to complete
        // For simplicity, we're just subscribing to each observable
        deletePromises.forEach(obs => obs.subscribe());
        
        // Reload folder contents after a short delay
        setTimeout(() => {
          this.loadFolderContents(this.currentFolderId);
        }, 500);
      }
    }
  }
  
  sortItems(field: 'name' | 'lastModified' | 'size'): void {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new field and default to ascending
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    
    // Sort folders
    this.folders.sort((a, b) => {
      if (field === 'name') {
        return this.sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (field === 'lastModified') {
        return this.sortDirection === 'asc'
          ? a.modified_at.getTime() - b.modified_at.getTime()
          : b.modified_at.getTime() - a.modified_at.getTime();
      }
      return 0; // Folders don't have size
    });
    
    // Sort files
    this.files.sort((a, b) => {
      if (field === 'name') {
        return this.sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (field === 'lastModified') {
        return this.sortDirection === 'asc'
          ? a.lastModified.getTime() - b.lastModified.getTime()
          : b.lastModified.getTime() - a.lastModified.getTime();
      } else if (field === 'size') {
        return this.sortDirection === 'asc'
          ? a.size - b.size
          : b.size - a.size;
      }
      return 0;
    });
  }
  
  getFileSize(size: number): string {
    if (size < 1024) {
      return size + ' B';
    } else if (size < 1024 * 1024) {
      return (size / 1024).toFixed(1) + ' KB';
    } else if (size < 1024 * 1024 * 1024) {
      return (size / (1024 * 1024)).toFixed(1) + ' MB';
    } else {
      return (size / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }
  }
  
  downloadFile(file: FileItem, event: MouseEvent): void {
    event.stopPropagation();
    
    this.fileService.downloadFile(file.id).subscribe({
      next: (blob) => {
        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (err) => {
        console.error('Error downloading file:', err);
        this.error = 'Failed to download file';
      }
    });
  }
}
