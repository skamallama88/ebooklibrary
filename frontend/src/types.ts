export interface Tag {
  id: number;
  name: string;
  type?: string;
}

export interface Author {
  id: number;
  name: string;
}

export interface Publisher {
  id: number;
  name: string;
}

export interface Book {
  id: number;
  title: string;
  author_id?: number;
  author_name?: string;
  author?: Author;
  description?: string;
  cover_image?: string;
  file_path?: string;
  file_type?: string;
  publication_date?: string;
  publisher_id?: number;
  publisher_name?: string;
  publisher?: Publisher | string; // Handle both object and string name cases
  isbn?: string;
  page_count?: number;
  word_count?: number;
  language?: string;
  tags?: Tag[];
  progress?: number;
  is_read?: boolean;
  last_read?: string;
  created_at?: string;
  added_at?: string;
  collections?: Collection[];
  // Additional fields used in components
  format?: string;
  file_size?: number;
  series?: string;
  series_index?: number;
  rating?: number;
  cover_path?: string;
  published_date?: string; // Alias or alternative to publication_date
  authors?: Author[]; // Helper field often returned by API
  progress_percentage?: number; // Added progress_percentage
}

export interface SortingState {
  id: string;
  desc: boolean;
}

export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
}

export interface AIPromptTemplate {
    id: number;
    name: string;
    type: string;
    template: string;
    is_default: boolean;
    description?: string;
}

export interface Collection {
    id: number;
    name: string;
    books?: Book[];
}
