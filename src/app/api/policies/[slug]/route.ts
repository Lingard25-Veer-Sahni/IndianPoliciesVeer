import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, policyRowToCamel, type PolicyRow } from '@/lib/supabase-admin';

// GET /api/policies/[slug] — single policy by slug.
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('policies')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  return NextResponse.json({ policy: policyRowToCamel(data as PolicyRow) });
}
