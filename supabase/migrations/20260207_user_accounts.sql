-- Create profiles table
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  display_name text
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Add user_id to attempts and votes
alter table public.attempts
  add column if not exists user_id uuid references auth.users(id);

alter table public.pairwise_votes
  add column if not exists user_id uuid references auth.users(id);

-- Create user_ratings table
create table if not exists public.user_ratings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rating integer not null default 1000,
  n_attempts integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_ratings enable row level security;

create policy "Users can read own ratings"
  on public.user_ratings for select
  using (auth.uid() = user_id);

-- Create user_rating_history table
create table if not exists public.user_rating_history (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  rating integer not null,
  delta integer not null,
  problem_id text,
  outcome text
);

alter table public.user_rating_history enable row level security;

create policy "Users can read own rating history"
  on public.user_rating_history for select
  using (auth.uid() = user_id);

-- RLS for attempts and votes
-- Allow users to read their own attempts
create policy "Users can read own attempts"
  on public.attempts for select
  using (auth.uid() = user_id);

-- Note: We generally don't expose insert/update policies for attempts/votes to the client
-- because we handle that via secure server-side API routes.
