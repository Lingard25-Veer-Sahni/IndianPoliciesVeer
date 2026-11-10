import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, changeRowToCamel, type ChangeRow } from '@/lib/supabase-admin';
import { timingSafeEqualStrings } from '@/lib/auth';

// Header-only: the admin review UI (src/app/[locale]/admin/review/page.tsx)
// already only ever sends the secret via the x-admin-secret header, never a
// query param, so there's no reason to also accept ?secret= here — query
// params get written to server/proxy access logs and browser history,
// which is a needlessly leaky place for a password to end up. Comparison
// is constant-time (see src/lib/auth.ts) instead of plain `===`.
function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return false;
  const header = req.headers.get('x-admin-secret');
  if (!header) return false;
  return timingSafeEqualStrings(header, expected);
}

// GET /api/admin/review — list pending changes (alias of /api/changes?status=pending).
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('changes')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const changes = (data as ChangeRow[]).map(changeRowToCamel);

  return NextResponse.json({ changes, count: changes.length });
}

// POST /api/admin/review — approve or reject a pending change.
// Body: { id, action: 'approve' | 'reject', editedContent?: object }
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { id?: number; action?: 'approve' | 'reject'; editedContent?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id, action, editedContent } = body;
  if (!id || (action !== 'approve' && action !== 'reject')) {
    return NextResponse.json({ error: 'id and a valid action are required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data: change, error: fetchError } = await supabase
    .from('changes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!change) {
    return NextResponse.json({ error: 'Change not found' }, { status: 404 });
  }
  const changeRow = change as ChangeRow;
  if (changeRow.status !== 'pending') {
    return NextResponse.json({ error: 'Change has already been reviewed' }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (action === 'approve') {
    const proposed = changeRow.proposed_content ?? null;
    const finalContent = editedContent ?? proposed;

    if (changeRow.type === 'add') {
      if (!changeRow.slug) {
        return NextResponse.json({ error: 'Change is missing a slug' }, { status: 400 });
      }
      const { error: upsertError } = await supabase.from('policies').upsert(
        {
          slug: changeRow.slug,
          category: 'general',
          year: null,
          ministry: '',
          level: 'central',
          official_source_url: '',
          official_source_name: '',
          keywords: [],
          content: finalContent ?? {},
          updated_at: now,
        },
        { onConflict: 'slug' }
      );
      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }
    } else if (changeRow.type === 'amend') {
      if (!changeRow.slug) {
        return NextResponse.json({ error: 'Change is missing a slug' }, { status: 400 });
      }
      const { error: updateError } = await supabase
        .from('policies')
        .update({ content: finalContent ?? {}, updated_at: now })
        .eq('slug', changeRow.slug);
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else if (changeRow.type === 'delete') {
      if (changeRow.slug) {
        const { error: deleteError } = await supabase
          .from('policies')
          .delete()
          .eq('slug', changeRow.slug);
        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 500 });
        }
      }
    }
  }

  const { error: statusError } = await supabase
    .from('changes')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: now,
    })
    .eq('id', id);

  if (statusError) {
    return NextResponse.json({ error: statusError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, status: action === 'approve' ? 'approved' : 'rejected' });
}
