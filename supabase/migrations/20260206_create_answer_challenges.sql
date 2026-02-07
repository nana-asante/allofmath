-- Migration: Create answer_challenges table
-- Run this in Supabase SQL Editor

create table if not exists public.answer_challenges (
  id serial primary key,
  
  -- Problem being challenged
  problem_id text not null check (problem_id ~ '^aom_[a-z0-9_]+$'),
  
  -- Session that submitted the challenge (anonymous)
  session_hash text not null,
  
  -- What the user submitted vs what was expected
  user_answer text not null,
  expected_answer text not null,
  
  -- Optional explanation from user
  reason text,
  
  -- Review status: pending, accepted (answer was wrong), rejected (answer was correct)
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  
  -- Timestamps
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  
  -- Prevent duplicate challenges from same session for same problem
  constraint unique_challenge_per_session unique (problem_id, session_hash)
);

-- Index for finding pending challenges
create index if not exists answer_challenges_status_idx
  on public.answer_challenges(status)
  where status = 'pending';

-- RLS: No public access (server-side only)
alter table public.answer_challenges enable row level security;
