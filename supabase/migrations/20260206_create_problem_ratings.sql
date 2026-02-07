-- Migration: Create Elo-based problem ratings system
-- Run this in Supabase SQL Editor

-- 1. Create problem_ratings table for Elo-based difficulty
create table if not exists public.problem_ratings (
  problem_id text primary key check (problem_id ~ '^aom_[a-z0-9_]+$'),
  rating integer not null default 1000,
  n_votes integer not null default 0,
  n_attempts integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists problem_ratings_rating_idx
  on public.problem_ratings(rating);

alter table public.problem_ratings enable row level security;

-- 2. Add processed_at to pairwise_votes for incremental processing
alter table public.pairwise_votes
  add column if not exists processed_at timestamptz;

create index if not exists pairwise_votes_unprocessed_idx
  on public.pairwise_votes(processed_at)
  where processed_at is null;

-- 3. Add processed_at to attempts for incremental processing  
alter table public.attempts
  add column if not exists processed_at timestamptz;

create index if not exists attempts_unprocessed_idx
  on public.attempts(processed_at)
  where processed_at is null;
