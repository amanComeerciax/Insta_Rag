-- ==============================================================================
-- SaveSort AI / Insta_Rag: Database Schema & Vector Search Configuration
-- Supabase Postgres + pgvector (Configured for Clerk Authentication)
-- ==============================================================================

-- 1. Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 2. Create saved_posts table
create table if not exists saved_posts (
  id text primary key,
  user_id text not null, -- Clerk User ID (e.g. user_2tX...)
  instagram_post_id text not null,
  post_url text not null,
  caption text,
  media_type text default 'photo', -- 'photo', 'video', 'carousel', 'reel'
  thumbnail_url text,
  video_url text,
  carousel_media_urls text[],
  ocr_text text,
  ai_summary text,
  category text default 'General',
  embedding vector(768), -- Gemini text-embedding-004 768-D vectors
  saved_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id, instagram_post_id)
);

-- 3. Create indices for high performance queries
create index if not exists idx_saved_posts_user on saved_posts(user_id);
create index if not exists idx_saved_posts_category on saved_posts(user_id, category);
create index if not exists idx_saved_posts_saved_at on saved_posts(user_id, saved_at desc);

-- Vector index for cosine similarity search (HNSW index)
create index if not exists idx_saved_posts_embedding on saved_posts 
using hnsw (embedding vector_cosine_ops);

-- 4. Create sync_logs table
create table if not exists sync_logs (
  id text primary key,
  user_id text not null,
  source text not null check (source in ('manual_export', 'extension', 'mock_demo')),
  posts_added int default 0,
  posts_skipped int default 0,
  status text default 'completed',
  error_message text,
  created_at timestamptz default now()
);

create index if not exists idx_sync_logs_user on sync_logs(user_id, created_at desc);

-- 5. Semantic Vector Search RPC function (match_saved_posts)
create or replace function match_saved_posts (
  query_embedding vector(768),
  match_threshold float default 0.2,
  match_count int default 20,
  filter_user_id text default null,
  filter_category text default null
)
returns table (
  id text,
  user_id text,
  instagram_post_id text,
  post_url text,
  caption text,
  media_type text,
  thumbnail_url text,
  ocr_text text,
  ai_summary text,
  category text,
  saved_at timestamptz,
  created_at timestamptz,
  similarity float
)
language plpgsql
stable
as $$
begin
  return query
  select
    p.id,
    p.user_id,
    p.instagram_post_id,
    p.post_url,
    p.caption,
    p.media_type,
    p.thumbnail_url,
    p.ocr_text,
    p.ai_summary,
    p.category,
    p.saved_at,
    p.created_at,
    (1 - (p.embedding <=> query_embedding)) as similarity
  from saved_posts p
  where
    (filter_user_id is null or p.user_id = filter_user_id)
    and (filter_category is null or p.category = filter_category)
    and p.embedding is not null
    and (1 - (p.embedding <=> query_embedding)) > match_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
end;
$$;
