-- Migration: Create problems_public table for search
-- Run in Supabase SQL Editor

-- 1. Create the public search index table (NO answers!)
create table if not exists public.problems_public (
  id text primary key check (id ~ '^aom_[a-z0-9_]+$'),
  topic text not null,
  topic_slug text not null,
  prompt text not null,
  prompt_plain text not null, -- LaTeX stripped for FTS
  seed_difficulty int not null default 1,

  status text not null,
  source text not null,
  license text not null,
  author text not null,

  solution_video_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Generated search vector for FTS
  search_tsv tsvector generated always as (
    to_tsvector('english', coalesce(topic,'') || ' ' || coalesce(prompt_plain,''))
  ) stored
);

-- 2. Create GIN index for full-text search
create index if not exists problems_public_search_idx
  on public.problems_public using gin (search_tsv);

-- 3. Enable pg_trgm for fuzzy/short queries
create extension if not exists pg_trgm;

-- 4. Trigram indexes for substring matching
create index if not exists problems_public_prompt_plain_trgm
  on public.problems_public using gin (prompt_plain gin_trgm_ops);

create index if not exists problems_public_id_trgm
  on public.problems_public using gin (id gin_trgm_ops);

-- 5. Topic index for filtering
create index if not exists problems_public_topic_idx
  on public.problems_public (topic);

-- 6. Enable RLS
alter table public.problems_public enable row level security;

-- 7. Public read policy (this is intentionally public - no answers)
create policy "Anyone can read problems_public"
  on public.problems_public for select
  using (true);
