import { File as ApiFile, Folder } from './api.model';

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  lastModified: Date;
  path: string;
  isShared: boolean;
  isNew?: boolean;
  folder_id?: string | null;
  is_trashed?: boolean;
}

// PinnedFile interface removed

// Mapper functions to convert API models to UI models
export function mapApiFileToFileItem(file: ApiFile, path: string = '/'): FileItem {
  console.log('Mapping file:', file); // Debug log
  
  // Handle null values and extract content type safely
  let contentType = 'application/octet-stream';
  if (file.metadata && file.metadata.content_type) {
    contentType = file.metadata.content_type;
  } else if (file.content_type) {
    contentType = file.content_type;
  }
  
  // Get file type (extension) from content type or filename
  let fileType = 'unknown';
  if (contentType.includes('/')) {
    fileType = contentType.split('/')[1] || 'unknown';
  } else if (file.name.includes('.')) {
    fileType = file.name.split('.').pop() || 'unknown';
  }
  
  // Safely handle date strings that might be null
  let modifiedDate: Date;
  try {
    const dateString = file.uploaded_at || 
                       file.modified_at || 
                       (file.metadata && file.metadata.modified_at) || 
                       new Date().toISOString();
    modifiedDate = new Date(dateString);
  } catch (e) {
    console.error('Error parsing date, using current date:', e);
    modifiedDate = new Date();
  }
  
  return {
    id: file.id,
    name: file.name,
    type: fileType,
    size: file.length || file.size || 0,
    lastModified: modifiedDate,
    path: path,
    isShared: false,
    folder_id: file.folder_id,
    is_trashed: file.metadata ? file.metadata.is_trashed || false : (file.is_trashed || false)
  };
}

export interface FolderItem {
  id: string;
  name: string;
  parent_id: string;
  created_at: Date;
  modified_at: Date;
  is_trashed: boolean;
  path: string;
}

export function mapApiFolderToFolderItem(folder: Folder, path: string = '/'): FolderItem {
  return {
    id: folder._id,
    name: folder.name,
    parent_id: folder.parent_id,
    created_at: new Date(folder.created_at),
    modified_at: new Date(folder.modified_at || (folder.metadata?.modified_at || new Date().toISOString())),
    is_trashed: folder.is_trashed || (folder.metadata?.is_trashed || false),
    path: folder.path || path
  };
}
