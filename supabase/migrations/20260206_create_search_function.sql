-- Migration: Create search_problems RPC function
-- Run in Supabase SQL Editor after problems_public table exists

create or replace function public.search_problems(
  q text,
  topic_filter text default null,
  lim int default 20,
  off int default 0
)
returns table (
  id text,
  topic text,
  prompt text,
  seed_difficulty int,
  solution_video_url text,
  rank real
)
language sql
stable
security definer
as $$
  with cleaned as (
    select trim(coalesce(q, '')) as query
  ),
  -- Full-text search for longer queries
  fts_results as (
    select
      p.id,
      p.topic,
      p.prompt,
      p.seed_difficulty,
      p.solution_video_url,
      ts_rank_cd(p.search_tsv, websearch_to_tsquery('english', c.query)) as rank
    from public.problems_public p, cleaned c
    where c.query <> ''
      and length(c.query) >= 3
      and (topic_filter is null or p.topic = topic_filter)
      and p.search_tsv @@ websearch_to_tsquery('english', c.query)
  ),
  -- Trigram search for short queries (< 3 chars) or fallback
  trgm_results as (
    select
      p.id,
      p.topic,
      p.prompt,
      p.seed_difficulty,
      p.solution_video_url,
      similarity(p.prompt_plain, c.query)::real as rank
    from public.problems_public p, cleaned c
    where c.query <> ''
      and length(c.query) < 3
      and (topic_filter is null or p.topic = topic_filter)
      and (p.prompt_plain % c.query or p.id % c.query)
  ),
  -- Combine results, preferring FTS
  combined as (
    select * from fts_results
    union all
    select * from trgm_results
    where not exists (select 1 from fts_results)
  )
  select distinct on (combined.id)
    combined.id,
    combined.topic,
    combined.prompt,
    combined.seed_difficulty,
    combined.solution_video_url,
    combined.rank
  from combined
  order by combined.id, combined.rank desc
  limit lim offset off
$$;

-- Grant execute to anon and authenticated
grant execute on function public.search_problems to anon, authenticated;
