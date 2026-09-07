-- ==============================================================================
-- SaveSort AI: Database Schema & Vector Search Configuration
-- Supabase Postgres + pgvector
-- ==============================================================================

-- 1. Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 2. Create saved_posts table
-- Note: Google Gemini's text-embedding-004 model generates 768-dimensional embeddings.
-- If you choose a 1536-dim model or MRL truncation, adjust the vector dimension here accordingly.
create table if not exists saved_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  instagram_post_id text not null, -- Shortcode or unique identifier from Instagram, used for deduplication
  post_url text not null,
  caption text,
  media_type text default 'photo', -- 'photo', 'video', 'carousel', 'reel'
  thumbnail_url text,
  ocr_text text, -- Extracted text from media if available
  ai_summary text, -- Short 1-sentence AI generated summary
  category text default 'General', -- AI assigned category e.g. "Fonts", "Recipes", "Design"
  embedding vector(768), -- pgvector embedding for semantic search
  saved_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id, instagram_post_id)
);

-- 3. Create indices for high performance queries
create index if not exists idx_saved_posts_user on saved_posts(user_id);
create index if not exists idx_saved_posts_category on saved_posts(user_id, category);
create index if not exists idx_saved_posts_saved_at on saved_posts(user_id, saved_at desc);

-- Vector index for cosine similarity search
-- HNSW is modern, works without requiring pre-trained clusters, and delivers fast search results
create index if not exists idx_saved_posts_embedding on saved_posts 
using hnsw (embedding vector_cosine_ops);

-- 4. Create sync_logs table to track export ZIP uploads & Chrome extension syncs
create table if not exists sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  source text not null check (source in ('manual_export', 'extension', 'mock_demo')),
  posts_added int default 0,
  posts_skipped int default 0,
  status text default 'completed', -- 'processing', 'completed', 'failed'
  error_message text,
  created_at timestamptz default now()
);

create index if not exists idx_sync_logs_user on sync_logs(user_id, created_at desc);

-- 5. Row Level Security (RLS) Policies
-- Ensure users can only access their own saved posts and logs
alter table saved_posts enable row level security;
alter table sync_logs enable row level security;

-- Policies for saved_posts
create policy "Users can view their own saved posts"
  on saved_posts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own saved posts"
  on saved_posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own saved posts"
  on saved_posts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own saved posts"
  on saved_posts for delete
  using (auth.uid() = user_id);

-- Policies for sync_logs
create policy "Users can view their own sync logs"
  on sync_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sync logs"
  on sync_logs for insert
  with check (auth.uid() = user_id);

-- 6. Semantic Vector Search RPC function (match_saved_posts)
-- Performs cosine similarity matching against the embedding column
create or replace function match_saved_posts (
  query_embedding vector(768),
  match_threshold float default 0.2,
  match_count int default 20,
  filter_user_id uuid default null,
  filter_category text default null
)
returns table (
  id uuid,
  user_id uuid,
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
