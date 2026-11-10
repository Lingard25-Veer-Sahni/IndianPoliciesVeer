-- Tracks AI search requests per IP address so /api/search can enforce a
-- rolling 24-hour cap (2 requests per IP). One row per request; old rows
-- can be pruned by the cron job (see src/app/api/cron/refresh/route.ts) or
-- simply left to accumulate since each row is tiny.

create table if not exists search_rate_limit (
  id bigint generated always as identity primary key,
  ip text not null,
  requested_at timestamptz not null default now()
);

create index if not exists search_rate_limit_ip_requested_at_idx
  on search_rate_limit (ip, requested_at);

alter table search_rate_limit enable row level security;

-- Same permissive-anon pattern as 0002_rls.sql: this app has no
-- service-role key configured, so its own server-side API routes read/write
-- using the anon key.
drop policy if exists "anon full access to search_rate_limit" on search_rate_limit;
create policy "anon full access to search_rate_limit"
  on search_rate_limit for all
  to anon
  using (true)
  with check (true);
