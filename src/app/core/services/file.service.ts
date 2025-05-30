import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpHeaders, HttpParams, HttpRequest } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { FileItem, FolderItem, mapApiFileToFileItem, mapApiFolderToFolderItem } from '../models/file.model';
import { FileUploadResponse, Folder, FolderContent, FolderCreateRequest, Stats, UpdateRequest, File as ApiFile } from '../models/api.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  // Using relative path for proxy to avoid CORS issues
  private readonly API_URL = 'http://127.0.0.1:8000/api';
  
  // Pinned files functionality removed
  
  private selectedFileSubject = new BehaviorSubject<FileItem | null>(null);
  public selectedFile$ = this.selectedFileSubject.asObservable();
  
  private currentFolderSubject = new BehaviorSubject<FolderItem | null>(null);
  public currentFolder$ = this.currentFolderSubject.asObservable();
  
  // Refresh trigger for file operations
  private fileUpdateSubject = new BehaviorSubject<boolean>(false);
  public fileUpdate$ = this.fileUpdateSubject.asObservable();
  
  private folderPathMapSubject = new BehaviorSubject<Map<string, string>>(new Map());
  private folderPathMap$ = this.folderPathMapSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Initialization
  }

  public getFiles(folderId: string = 'root'): Observable<FileItem[]> {
    return this.getFolderContents(folderId).pipe(
      map(content => {
        if (!content.files) return [];
        return content.files.map((file: ApiFile) => {
          // Handle null folder_id safely
          const path = file.folder_id ? this.getFolderPath(file.folder_id) : '/';
          return mapApiFileToFileItem(file, path);
        });
      })
    );
  }

  public getFileById(id: string): Observable<FileItem | undefined> {
    return this.http.get<ApiFile>(`${this.API_URL}/files/${id}/`).pipe(
      map(file => {
        // Handle null folder_id safely
        const path = file.folder_id ? this.getFolderPath(file.folder_id) : '/';
        return mapApiFileToFileItem(file, path);
      }),
      catchError(error => {
        console.error('Error fetching file:', error);
        return throwError(() => new Error(`Failed to fetch file with ID ${id}: ${error.message}`));
      })
    );
  }
  
  public uploadFile(file: Blob, folderId: string): Observable<HttpEvent<any>> {
    const formData = new FormData();
    const fileName = file instanceof File ? file.name : 'file';
    formData.append('file', file, fileName);
    formData.append('parent_id', folderId);
    console.log(`Uploading file: ${fileName} to folder IDDDD: ${formData.get('parent_id')}`);
    
    // Get the authentication token
    const token = this.authService.getToken();
    
    if (!token) {
      console.error('No authentication token available for upload');
      return throwError(() => new Error('Authentication required. Please log in again.'));
    }
    
    console.log('Uploading file with token:', token.substring(0, 10) + '...');
    
    // Create the request - the auth interceptor will add the token
    const req = new HttpRequest('POST', `${this.API_URL}/upload/`, formData, {
      reportProgress: true,
      // Add the token explicitly as a backup
      headers: new HttpHeaders({
        'Authorization': `Bearer ${token}`
      })
    });
    
    return this.http.request(req).pipe(
      tap(event => {
        // When the request is complete, trigger a refresh
        if (event.type === HttpEventType.Response) {
          this.fileUpdateSubject.next(true);
        }
      }),
      catchError(error => {
        console.error('Error uploading file:', error);
        return throwError(() => new Error('Failed to upload file. Please try again.'));
      })
    );
  }
  
  public downloadFile(fileId: string): Observable<Blob> {
    return this.http.get(`${this.API_URL}/download/${fileId}/`, {
      responseType: 'blob'
    });
  }
  
  public updateFile(fileId: string, updateData: UpdateRequest): Observable<File> {
    return this.http.put<File>(`${this.API_URL}/files/${fileId}/`, updateData);
  }
  
  public deleteFile(fileId: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/files/${fileId}/`);
  }
  
  // Folder Operations
  public getFolderContents(folderId: string = 'root'): Observable<any> {
    console.log(`Fetching folder contents for folder ID: ${folderId}`);
    console.log(`Using API URL: ${this.API_URL}/folders/${folderId}/contents/`);
    
    // Check if the user is authenticated
    const token = this.authService.getToken();
    if (!token) {
      console.error('No authentication token available for folder contents request');
      console.log('Attempting to fetch folder contents without authentication');
    } else {
      console.log('Auth token available:', token.substring(0, 10) + '...');
    }
    
    // Create headers to debug request
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
    
    if (token) {
      // Add token explicitly for debugging
      headers.append('Authorization', `Bearer ${token}`);
    }
    
    // Add debug request options
    const requestOptions = {
      headers: headers,
      withCredentials: false,  // Set to false for API compatibility
      observe: 'response' as const  // To get full response with headers
    };
    
    return this.http.get<any>(`${this.API_URL}/folders/${folderId}/contents/`, requestOptions).pipe(
      map(response => {
        console.log('Full API response:', response);
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        const content = response.body;
        console.log('API response body:', JSON.parse(content) as {"files": any[], "folders": any[]});
        
        return content;
      }),
      catchError(error => {
        console.error('Error fetching folder contents:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error details:', error.error);
        
        // If unauthorized, prompt for login
        if (error.status === 401) {
          console.error('Authentication error. Token may be invalid or expired.');
          // Return empty folder content on error
          return of({ files: [], folders: [] } as FolderContent);
        }
        
        // Return empty folder content on error
        return of({ files: [], folders: [] } as FolderContent);
      })
    );
  }
  
  // Trash Operations
  public getTrashContents(): Observable<FolderContent> {
    console.log('Fetching trash contents');
    
    return this.http.get<FolderContent>(`${this.API_URL}/trash/`).pipe(
      tap(content => {
        console.log('API response for trash contents:', content);
      }),
      catchError(error => {
        console.error('Error fetching trash contents:', error);
        return throwError(() => new Error(`Failed to fetch trash contents: ${error.message}`));
      })
    );
  }
  
  public getFolderById(folderId: string): Observable<FolderItem> {
    return this.http.get<Folder>(`${this.API_URL}/folders/${folderId}/`).pipe(
      map(folder => {
        const path = this.buildFolderPath(folder);
        return mapApiFolderToFolderItem(folder, path);
      }),
      tap(folderItem => {
        this.currentFolderSubject.next(folderItem);
      }),
      catchError(error => {
        console.error('Error fetching folder:', error);
        return throwError(() => error);
      })
    );
  }
  
  public createFolder(folderData: FolderCreateRequest): Observable<Folder> {
    return this.http.post<Folder>(`${this.API_URL}/folders/`, folderData);
  }
  
  public updateFolder(folderId: string, updateData: UpdateRequest): Observable<Folder> {
    return this.http.put<Folder>(`${this.API_URL}/folders/${folderId}/`, updateData);
  }
  
  public deleteFolder(folderId: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/folders/${folderId}/`);
  }
  
  // The empty trash functionality
  // Note: getTrashContents is implemented above
  
  public emptyTrash(): Observable<any> {
    return this.http.delete(`${this.API_URL}/trash/`);
  }
  
  // Stats
  public getStats(): Observable<Stats> {
    return this.http.get<Stats>(`${this.API_URL}/stats/`);
  }
  
  // Helper methods for folder paths
  private buildFolderPath(folder: Folder): string {
    if (!folder.parent_id || folder.parent_id === 'root') {
      return `/${folder.name}`;
    }
    
    const parentPath = this.getFolderPath(folder.parent_id);
    return `${parentPath}/${folder.name}`;
  }
  
  private updateFolderPath(folderId: string, path: string): void {
    const currentMap = this.folderPathMapSubject.value;
    currentMap.set(folderId, path);
    this.folderPathMapSubject.next(currentMap);
  }
  
  private getFolderPath(folderId: string | null | undefined): string {
    if (!folderId || folderId === 'root') {
      return '/';
    }
    
    const path = this.folderPathMapSubject.value.get(folderId);
    return path || '/';
  }
  
  public setCurrentFolder(folder: FolderItem | null): void {
    this.currentFolderSubject.next(folder);
  }
  
  public getCurrentFolder(): FolderItem | null {
    return this.currentFolderSubject.value;
  }

  public selectFile(file: FileItem | null): void {
    this.selectedFileSubject.next(file);
  }

  public getFileIcon(fileType: string): string {
    switch (fileType.toLowerCase()) {
      case 'pdf':
        return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15v-2h6v2"></path></svg>';
      case 'docx':
      case 'doc':
        return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>';
      case 'xlsx':
      case 'xls':
        return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><rect x="8" y="10" width="8" height="8"></rect></svg>';
      case 'pptx':
      case 'ppt':
        return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><circle cx="10" cy="13" r="2"></circle><path d="M10 15v3"></path></svg>';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
      case 'mp4':
      case 'avi':
      case 'mov':
        return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>';
      case 'mp3':
      case 'wav':
        return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>';
      case 'zip':
      case 'rar':
        return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>';
      default:
        return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>';
    }
  }
}
