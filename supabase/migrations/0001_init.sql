-- Schema for the DB-backed "recent changes" / AI review system.
-- Run this once in the Supabase SQL Editor for this project:
--   https://supabase.com/dashboard/project/etzdykyqbdrowygdwqmx/sql/new

create table if not exists policies (
  slug text primary key,
  category text,
  year integer,
  ministry text,
  level text default 'central',
  official_source_url text,
  official_source_name text,
  keywords jsonb,
  content jsonb,
  updated_at timestamptz default now()
);

create table if not exists changes (
  id bigint generated always as identity primary key,
  type text check (type in ('add','amend','delete')),
  slug text,
  title text,
  summary text,
  proposed_content jsonb,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  source text check (source in ('ai','manual')),
  created_at timestamptz default now(),
  reviewed_at timestamptz
);
