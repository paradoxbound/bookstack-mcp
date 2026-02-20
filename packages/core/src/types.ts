export interface BookStackConfig {
  baseUrl: string;
  tokenId: string;
  tokenSecret: string;
  enableWrite?: boolean;
}

export interface Book {
  id: number;
  name: string;
  slug: string;
  description: string;
  created_at: string;
  updated_at: string;
  owned_by: number;
}

export interface Page {
  id: number;
  book_id: number;
  chapter_id?: number;
  name: string;
  slug: string;
  html: string;
  markdown: string;
  text: string;
  created_at: string;
  updated_at: string;
  owned_by: number;
}

export interface Chapter {
  id: number;
  book_id: number;
  name: string;
  slug: string;
  description: string;
  created_at: string;
  updated_at: string;
  owned_by: number;
}

export interface Shelf {
  id: number;
  name: string;
  slug: string;
  description: string;
  created_at: string;
  updated_at: string;
  owned_by: number;
  books: Book[];
  tags: Tag[];
}

export interface Tag {
  name: string;
  value: string;
}

export interface Attachment {
  id: number;
  name: string;
  extension: string;
  uploaded_to: number;
  external: boolean;
  order: number;
  created_at: string;
  updated_at: string;
  created_by: number;
  updated_by: number;
  links?: { html: string; markdown: string };
}

export interface Comment {
  id: number;
  commentable_id: number;
  commentable_type: string;
  html?: string;
  parent_id: number | null;
  local_id: number;
  content_ref: string;
  archived: boolean;
  created_by: number | { id: number; name: string; slug: string };
  updated_by: number | { id: number; name: string; slug: string };
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

export interface SearchResult {
  type: string;
  id: number;
  name: string;
  slug: string;
  book_id?: number;
  chapter_id?: number;
  created_at?: string;
  updated_at?: string;
  preview_content?: { name: string; content: string };
}

export interface ListResponse<T> {
  data: T[];
  total: number;
}

export interface AuditLogEntry {
  id: number;
  type: string;
  detail: string;
  user_id: number;
  loggable_id: number | null;
  loggable_type: string | null;
  ip: string;
  created_at: string;
  user?: { id: number; name: string; slug: string };
}

export interface SystemInfo {
  version: string;
  instance_id: string;
  app_name: string;
  app_logo?: string;
  base_url: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  slug: string;
  created_at: string;
  updated_at: string;
  last_activity_at?: string;
  profile_url?: string;
  edit_url?: string;
  avatar_url?: string;
  external_auth_id?: string;
}

export interface RecycleBinEntry {
  id: number;
  deleted_by: number;
  created_at: string;
  updated_at: string;
  deletable_type: string;
  deletable_id: number;
  deletable: Record<string, unknown>;
}

export interface ImageGalleryEntry {
  id: number;
  name: string;
  url: string;
  path: string;
  type: string;
  uploaded_to: number;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;
}

export interface ApiError extends Error {
  status?: number;
  response?: { status: number; data?: unknown };
}
