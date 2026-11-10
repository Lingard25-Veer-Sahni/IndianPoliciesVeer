-- Caches AI search responses so repeated/near-identical questions (e.g.
-- many different users asking "how do I file an RTI") reuse one generated
-- answer instead of burning OpenRouter free-tier quota and added latency
-- on every single request. See src/lib/search-cache.ts.

create table if not exists search_cache (
  query_hash text primary key,
  query text not null,
  locale text not null,
  state text,
  response jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists search_cache_created_at_idx on search_cache (created_at);

alter table search_cache enable row level security;

-- Same permissive-anon pattern as the other tables (see 0002_rls.sql):
-- this app has no service-role key configured, so its own server-side API
-- routes read/write using the anon key.
drop policy if exists "anon full access to search_cache" on search_cache;
create policy "anon full access to search_cache"
  on search_cache for all
  to anon
  using (true)
  with check (true);
