-- These two tables (`policies`, `changes`) are written to only by this
-- app's own server-side API routes (never directly by end users), using
-- the anon/publishable key since no service-role key is configured.
-- Enable RLS (good practice) but add permissive policies for the anon
-- role so the app's API routes can read/write. If you later add a
-- service-role key server-side, you can tighten these and drop the
-- anon write policies.

alter table policies enable row level security;
alter table changes enable row level security;

drop policy if exists "anon full access to policies" on policies;
create policy "anon full access to policies"
  on policies for all
  to anon
  using (true)
  with check (true);

drop policy if exists "anon full access to changes" on changes;
create policy "anon full access to changes"
  on changes for all
  to anon
  using (true)
  with check (true);
