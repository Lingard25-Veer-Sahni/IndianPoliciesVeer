-- Stores the single, site-wide custom-cloned narration voice (see
-- src/app/api/admin/voice/route.ts). Uploading a sample via the admin
-- voice page creates a Voicebox profile and records its id here so /api/tts
-- can pick it up on the next request without a redeploy (unlike
-- VOICEBOX_PROFILE_ID, which is a static env var). A single fixed-id row
-- (id = 1) rather than a real table of rows, since this app has no user
-- accounts — there is exactly one narrator voice for the whole site.

create table if not exists voice_config (
  id smallint primary key default 1,
  voicebox_profile_id text,
  name text,
  status text check (status in ('pending', 'ready', 'failed')),
  error_message text,
  updated_at timestamptz not null default now(),
  constraint voice_config_singleton check (id = 1)
);

alter table voice_config enable row level security;

-- Same permissive-anon pattern as the other tables (see 0002_rls.sql):
-- this app has no service-role key configured, so its own server-side API
-- routes read/write using the anon key.
drop policy if exists "anon full access to voice_config" on voice_config;
create policy "anon full access to voice_config"
  on voice_config for all
  to anon
  using (true)
  with check (true);
