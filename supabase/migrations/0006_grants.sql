-- RLS policies (0002/0003/0004/0005) alone are not enough for the
-- anon/authenticated roles to read/write these tables — Postgres checks
-- table-level GRANTs first, and newly-created tables in a fresh Supabase
-- project don't automatically have them for every table. Confirmed by a
-- live "permission denied for table policies" error when seeding a brand
-- new project that had only run 0001-0005. Run this once, after 0001-0005,
-- on any new Supabase project used for this app.

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.policies to anon, authenticated;
grant select, insert, update, delete on public.changes to anon, authenticated;
grant select, insert, update, delete on public.search_rate_limit to anon, authenticated;
grant select, insert, update, delete on public.search_cache to anon, authenticated;
grant select, insert, update, delete on public.voice_config to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
