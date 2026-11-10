import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, policyRowToCamel, type PolicyRow } from '@/lib/supabase-admin';

// GET /api/policies — list policies from the DB.
// Optional query params: ?level=, ?category=, ?q= (simple substring match
// against slug/ministry/content JSON).
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const level = searchParams.get('level');
  const category = searchParams.get('category');
  const q = searchParams.get('q');

  let query = supabase.from('policies').select('*').order('slug', { ascending: true });

  if (level) {
    query = query.eq('level', level);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (q) {
    // Note: `keywords`/`content` are jsonb columns, not text, so PostgREST's
    // ilike filter (which only works on text/varchar columns) can't be
    // applied to them directly here — substring matching is limited to the
    // text columns (slug, ministry). This mirrors a narrower version of the
    // previous SQLite behaviour.
    const like = `%${q}%`;
    query = query.or(`slug.ilike.${like},ministry.ilike.${like}`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const policies = (data as PolicyRow[]).map(policyRowToCamel);

  return NextResponse.json({ policies, count: policies.length });
}
