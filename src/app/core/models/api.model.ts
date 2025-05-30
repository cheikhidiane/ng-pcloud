export interface User {
  _id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
  // Add optional fields that might be in the response
  token?: string; // Some APIs use 'token' instead of 'access'
  detail?: string; // For error messages
}

export interface RegisterRequest {
  username: string; // API expects username for registration
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginRequest {
  username: string; // API expects username instead of email
  password: string;
}

export interface RefreshTokenRequest {
  refresh: string;
}

export interface Folder {
  _id: string;
  name: string;
  owner_id: string;
  parent_id: string;
  created_at: string;
  metadata: {
    consulted_at: string;
    modified_at: string;
    is_trashed: boolean;
  };
  consulted_at: string;
  modified_at: string;
  is_trashed: boolean;
  path?: string;
}

export interface File {
  id: string;
  name: string;
  length: number;
  owner_id: string;
  folder_id: string | null;
  uploaded_at: string;
  metadata: {
    content_type?: string;
    consulted_at: string | null | undefined;
    modified_at: string | null | undefined;
    is_trashed: boolean;
  } | null;
  chunk_size?: number;
  data?: any;
  // These fields might be at the top level in some responses
  content_type?: string;
  consulted_at?: string | null;
  modified_at?: string | null;
  is_trashed?: boolean;
  size?: number;
}

export interface FolderContent {
  folders: Folder[];
  files: File[];
}

export interface Stats {
  user_id: number;
  storage: number;
  used_storage: number;
  nb_files: number;
  nb_documents: number;
  nb_media: number;
  nb_other: number;
  nb_shared_files: number;
}

export interface SearchResult {
  folders: string[];
  files: string[];
  total_files: number;
  total_folders: number;
}

export interface FileUploadResponse {
  id: string;
  name: string;
  length: number;
  folder_id: string;
  uploaded_at: string;
}

export interface FolderCreateRequest {
  name: string;
  parent_id?: string;
}

export interface UpdateRequest {
  name?: string;
  parent_id?: string;
  is_trashed?: boolean;
}
