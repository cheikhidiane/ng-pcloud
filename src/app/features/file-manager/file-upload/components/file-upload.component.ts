import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { FileService } from '../../../../core/services/file.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class FileUploadComponent implements OnInit {
  @Input() currentFolderId: string = 'root';
  
  files: File[] = [];
  uploadProgress: { [key: string]: number } = {};
  uploadStatus: { [key: string]: 'pending' | 'uploading' | 'success' | 'error' } = {};
  dragOver = false;

  constructor(private fileService: FileService) {}

  ngOnInit(): void {}
  
  hasPendingFiles(): boolean {
    return this.files.some(file => this.uploadStatus[file.name] === 'pending');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
    
    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  addFiles(fileList: File[]): void {
    for (const file of fileList) {
      if (!this.files.some(f => f.name === file.name && f.size === file.size)) {
        this.files.push(file);
        this.uploadStatus[file.name] = 'pending';
      }
    }
  }

  removeFile(index: number): void {
    const file = this.files[index];
    delete this.uploadProgress[file.name];
    delete this.uploadStatus[file.name];
    this.files.splice(index, 1);
  }

  uploadFile(file: File): void {
    this.uploadStatus[file.name] = 'uploading';
    this.uploadProgress[file.name] = 0;
    
    this.fileService.uploadFile(file, this.currentFolderId).subscribe({
      next: (event: HttpEvent<any>) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.uploadProgress[file.name] = Math.round(100 * event.loaded / event.total);
        } else if (event.type === HttpEventType.Response) {
          this.uploadStatus[file.name] = 'success';
        }
      },
      error: (error) => {
        console.error('Upload error:', error);
        this.uploadStatus[file.name] = 'error';
      }
    });
  }

  uploadAll(): void {
    this.files.forEach(file => {
      if (this.uploadStatus[file.name] === 'pending') {
        this.uploadFile(file);
      }
    });
  }

  cancelUpload(index: number): void {
    // In a real implementation, you would cancel the HTTP request
    this.removeFile(index);
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
}
