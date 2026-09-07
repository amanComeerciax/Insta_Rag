export type MediaType = 'photo' | 'video' | 'carousel' | 'reel';

export interface SavedPost {
  id: string;
  user_id: string;
  instagram_post_id: string;
  post_url: string;
  caption?: string | null;
  media_type: MediaType;
  thumbnail_url?: string | null;
  carousel_media_urls?: string[];
  ocr_text?: string | null;
  ai_summary?: string | null;
  category: string;
  embedding?: number[] | null;
  extracted_knowledge?: string | null;
  audio_transcript?: string | null;
  code_snippet?: { html?: string; css?: string; js?: string } | null;
  saved_at: string;
  created_at: string;
  similarity?: number;
}

export interface RAGMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface RAGCitation {
  id: string;
  instagram_post_id: string;
  post_url: string;
  thumbnail_url?: string | null;
  caption?: string | null;
  ai_summary?: string | null;
  category: string;
  similarity?: number;
}

export interface RAGResponse {
  answer: string;
  sources: RAGCitation[];
  modelUsed: string;
}

export interface RawExportPost {
  href: string;
  title?: string;
  caption?: string;
  timestamp?: number;
  media_type?: MediaType;
  thumbnail_url?: string;
}

export interface ParsedInstagramPost {
  instagram_post_id: string;
  post_url: string;
  caption: string;
  media_type: MediaType;
  thumbnail_url?: string;
  carousel_media_urls?: string[];
  saved_at: string;
}

export interface AICategorizationResult {
  summary: string;
  category: string;
  tags?: string[];
}

export interface SyncLog {
  id: string;
  user_id: string;
  source: 'manual_export' | 'extension' | 'mock_demo';
  posts_added: number;
  posts_skipped?: number;
  status: 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  created_at: string;
}

export interface SearchFilters {
  query: string;
  category?: string;
  media_type?: MediaType | 'all';
  sort_by?: 'relevance' | 'newest' | 'oldest';
}

export interface SearchResult {
  posts: SavedPost[];
  total: number;
  mode: 'semantic' | 'keyword' | 'all';
  execution_time_ms: number;
}

export interface ExtensionIngestPayload {
  posts: {
    post_url: string;
    caption?: string;
    thumbnail_url?: string;
    media_type?: MediaType;
    saved_at?: string;
  }[];
}
