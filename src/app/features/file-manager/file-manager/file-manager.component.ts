import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpEventType, HttpHeaders } from '@angular/common/http';
import { FileService } from '../../../core/services/file.service';
import { FileItem, FolderItem, mapApiFileToFileItem, mapApiFolderToFolderItem } from '../../../core/models/file.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-file-manager',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './file-manager.component.html',
  styleUrl: './file-manager.component.scss'
})
export class FileManagerComponent implements OnInit, OnDestroy {
  files: any[] = [];
  folders: any[] = [];
  currentFolder: FolderItem | null = null;
  isLoading = true;
  error: string | null = null;
  
  private fileUpdateSubscription: Subscription = new Subscription();
  private routeSubscription: Subscription = new Subscription();
  isTrashView = false;
  
  constructor(
    public fileService: FileService,
    private route: ActivatedRoute
  ) {}
  
  ngOnInit(): void {
    // Perform direct API test to check connectivity
    this.testApiConnection();
    
    // Subscribe to route query params to check for trash view
    this.routeSubscription = this.route.queryParams.subscribe(params => {
      this.isTrashView = params['view'] === 'trash';
      console.log('Is trash view:', this.isTrashView);
      
      if (this.isTrashView) {
        this.loadTrashFiles();
      } else {
        this.loadFiles();
      }
    });
    
    // Subscribe to file updates to refresh the file list when files are uploaded
    this.fileUpdateSubscription = this.fileService.fileUpdate$.subscribe(update => {
      if (update) {
        console.log('File update detected, refreshing files...');
        if (this.isTrashView) {
          this.loadTrashFiles();
        } else {
          const currentFolderId = this.currentFolder ? this.currentFolder.id : 'root';
          this.loadFiles(currentFolderId);
        }
      }
    });
  }
  
  // Test direct API connection
  private testApiConnection(): void {
    console.log('Testing direct API connection...');
    const token = localStorage.getItem('pcloud_auth_token');
    const headers = new HttpHeaders();
    
    if (token) {
      headers.append('Authorization', `Bearer ${token}`);
      console.log('Using token for API test:', token.substring(0, 10) + '...');
    } else {
      console.warn('No authentication token found for API test');
    }
    
    // Try a direct fetch request to the API
    fetch('http://127.0.0.1:8000/api/folders/root/contents/', {
      method: 'GET',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      console.log('Direct API test response status:', response.status);
      console.log('Response headers:', response.headers); 
      return response.json();
    })
    .then(data => {
      var parsedData = JSON.parse(data) as { files: any[], folders: any[] };
      this.files = parsedData["files"];
      this.folders = parsedData["folders"];
      if (data.files && data.files.length > 0) {
        console.log(`Found ${data.files.length} files via direct API call`);
      } else {
        console.log('No files found via direct API call');
      }
    })
    .catch(error => {
      console.error('Direct API test error:', error);
    });
  }
  
  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.fileUpdateSubscription) {
      this.fileUpdateSubscription.unsubscribe();
    }
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }
  
  loadFiles(folderId: string = 'root'): void {
    this.isLoading = true;
    this.error = null;
    this.isTrashView = false;
    
    console.log('Loading files from folder:', folderId);
    
    // Add some test files for debugging
    const addTestFiles = () => {
      console.log('Adding test files for debugging');
      this.files = [
        {
          id: 'test-file-1',
          name: 'Test File 1.pdf',
          type: 'pdf',
          size: 12345,
          lastModified: new Date(),
          path: '/',
          isShared: false,
          folder_id: 'root',
          is_trashed: false
        },
        {
          id: 'test-file-2',
          name: 'Test File 2.docx',
          type: 'docx',
          size: 67890,
          lastModified: new Date(),
          path: '/',
          isShared: false,
          folder_id: 'root',
          is_trashed: false
        }
      ];
      this.isLoading = false;
    };
    
    this.fileService.getFolderContents(folderId).subscribe({
      next: (content) => {
        console.log('Folder contents received:', content);
        console.log('Files array:', content.files);
        console.log('Folders array:', content.folders);
        
        try {
          if (!content.files || content.files.length === 0) {
            console.log('No files returned from API, adding test files');
            addTestFiles();
            return;
          }
          
          // Use the mapper functions to convert API models to UI models
          this.files = content.files.map(file => {
            console.log('Processing file:', file);
            const result = mapApiFileToFileItem(file, file.folder_id ? `/folders/${file.folder_id}` : '/');
            console.log('Mapped to FileItem:', result);
            return result;
          });
          
          this.folders = content.folders ? content.folders.map(folder => {
            console.log('Processing folder:', folder);
            const result = mapApiFolderToFolderItem(folder, folder.path || '/');
            console.log('Mapped to FolderItem:', result);
            return result;
          }) : [];
          
          console.log('Final files array:', this.files);
          console.log('Final folders array:', this.folders);
        } catch (e) {
          console.error('Error processing file data:', e);
          this.error = 'Error processing file data. Please try again.';
          console.log('Adding test files after error');
          addTestFiles();
        } finally {
          // Always set loading to false, even if there's an error
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error loading files:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        console.error('Error details:', err.error);
        this.error = `Failed to load files: ${err.status} ${err.statusText || 'Unknown error'}`;
        this.isLoading = false;
        console.log('Adding test files after API error');
        addTestFiles();
      },
      complete: () => {
        // Ensure loading state is reset when the observable completes
        this.isLoading = false;
      }
    });
  }
  
  loadTrashFiles(): void {
    this.isLoading = true;
    this.error = null;
    this.isTrashView = true;
    this.currentFolder = null;
    
    console.log('Loading trash files');
    this.fileService.getTrashContents().subscribe({
      next: (content) => {
        console.log('Trash contents:', content);
        try {
          // Use the mapper functions to convert API models to UI models
          this.files = content.files ? content.files.map(file => 
            mapApiFileToFileItem(file, '/trash')
          ) : [];
          
          // Trash view has no folders
          this.folders = [];
        } catch (e) {
          console.error('Error processing trash data:', e);
          this.error = 'Error processing trash data. Please try again.';
        } finally {
          // Always set loading to false, even if there's an error
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error loading trash files:', err);
        this.error = `Failed to load trash: ${err.status} ${err.statusText || 'Unknown error'}`;
        this.isLoading = false;
      },
      complete: () => {
        // Ensure loading state is reset when the observable completes
        this.isLoading = false;
      }
    });
  }
  
  navigateToFolder(folder: FolderItem): void {
    this.currentFolder = folder;
    this.loadFiles(folder.id);
  }
  
  navigateUp(): void {
    if (this.currentFolder && this.currentFolder.parent_id) {
      this.loadFiles(this.currentFolder.parent_id);
    } else {
      this.loadFiles('root');
      this.currentFolder = null;
    }
  }
  
  createNewFolder(): void {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;
    
    const parentId = this.currentFolder ? this.currentFolder.id : 'root';
    
    this.fileService.createFolder({
      name: folderName,
      parent_id: parentId
    }).subscribe({
      next: () => {
        this.loadFiles(parentId);
      },
      error: (err) => {
        console.error('Error creating folder:', err);
        alert('Failed to create folder. Please try again.');
      }
    });
  }
  
  uploadFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    
    const file = input.files[0];
    const folderId = this.currentFolder ? this.currentFolder.id : 'root';
    
    this.fileService.uploadFile(file, folderId).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          console.log('Upload complete');
          this.loadFiles(folderId);
          input.value = ''; // Reset the input
        }
      },
      error: (err) => {
        console.error('Error uploading file:', err);
        alert('Failed to upload file. Please try again.');
      }
    });
  }
  
  downloadFile(file: FileItem): void {
    this.fileService.downloadFile(file.id).subscribe({
      next: (blob) => {
        // Create a URL for the blob
        const url = window.URL.createObjectURL(blob);
        
        // Create a temporary anchor element
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        
        // Trigger the download
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (err) => {
        console.error('Error downloading file:', err);
        alert('Failed to download file. Please try again.');
      }
    });
  }
  
  deleteItem(item: FileItem | FolderItem, isFile: boolean = true): void {
    const itemType = isFile ? 'file' : 'folder';
    const confirmDelete = confirm(`Are you sure you want to delete this ${itemType}?`);
    
    if (!confirmDelete) return;
    
    const parentId = this.currentFolder ? this.currentFolder.id : 'root';
    
    if (isFile) {
      this.fileService.deleteFile(item.id).subscribe({
        next: () => {
          this.loadFiles(parentId);
        },
        error: (err) => {
          console.error(`Error deleting ${itemType}:`, err);
          alert(`Failed to delete ${itemType}. Please try again.`);
        }
      });
    } else {
      this.fileService.deleteFolder(item.id).subscribe({
        next: () => {
          this.loadFiles(parentId);
        },
        error: (err) => {
          console.error(`Error deleting ${itemType}:`, err);
          alert(`Failed to delete ${itemType}. Please try again.`);
        }
      });
    }
  }
}
