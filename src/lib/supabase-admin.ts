import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client for API routes (list/detail, changes feed,
// AI search, cron refresh, admin review). Uses the public URL + the
// publishable/anon key — this is safe because these API routes only ever
// run server-side, never bundled into client JS.
//
// NOTE: If Row Level Security (RLS) is enabled on the `policies` or
// `changes` tables with restrictive (default-deny) policies, writes made
// here with the anon/publishable key will be rejected. If that happens,
// either disable RLS on these two tables or add permissive policies (e.g.
// allow all for the `anon` role) since there's no separate service-role key
// configured in this project.
declare global {
  // eslint-disable-next-line no-var
  var __supabaseAdmin: SupabaseClient | undefined;
}

function createConnection(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY env vars'
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

export function getSupabase(): SupabaseClient {
  if (!global.__supabaseAdmin) {
    global.__supabaseAdmin = createConnection();
  }
  return global.__supabaseAdmin;
}

// --- Row shapes as stored in Postgres (snake_case columns) ---

export interface PolicyRow {
  slug: string;
  category: string | null;
  year: number | null;
  ministry: string | null;
  level: 'central' | 'state' | 'local';
  official_source_url: string | null;
  official_source_name: string | null;
  keywords: unknown; // jsonb array
  content: unknown; // jsonb blob
  updated_at: string;
}

export interface ChangeRow {
  id: number;
  type: 'add' | 'amend' | 'delete';
  slug: string | null;
  title: string | null;
  summary: string | null;
  proposed_content: unknown | null; // jsonb, nullable
  status: 'pending' | 'approved' | 'rejected';
  source: 'ai' | 'manual';
  created_at: string;
  reviewed_at: string | null;
}

// --- camelCase <-> snake_case mapping helpers, so API response shapes stay
// identical to the previous SQLite-backed contract that the frontend
// already relies on. ---

export function policyRowToCamel(row: PolicyRow) {
  return {
    slug: row.slug,
    category: row.category,
    year: row.year,
    ministry: row.ministry,
    level: row.level,
    officialSourceUrl: row.official_source_url,
    officialSourceName: row.official_source_name,
    keywords: row.keywords ?? [],
    content: row.content ?? {},
    updatedAt: row.updated_at,
  };
}

export interface SearchRateLimitRow {
  id: number;
  ip: string;
  requested_at: string;
}

export interface VoiceConfigRow {
  id: number;
  voicebox_profile_id: string | null;
  name: string | null;
  status: 'pending' | 'ready' | 'failed' | null;
  error_message: string | null;
  updated_at: string;
}

export function voiceConfigRowToCamel(row: VoiceConfigRow) {
  return {
    voiceboxProfileId: row.voicebox_profile_id,
    name: row.name,
    status: row.status,
    errorMessage: row.error_message,
    updatedAt: row.updated_at,
  };
}

export function changeRowToCamel(row: ChangeRow) {
  return {
    id: row.id,
    type: row.type,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    proposedContent: row.proposed_content ?? null,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}
