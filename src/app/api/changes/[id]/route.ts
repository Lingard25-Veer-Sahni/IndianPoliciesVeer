import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, type ChangeRow, type PolicyRow } from '@/lib/supabase-admin';

const SUPPORTED_LOCALES = ['en', 'hi', 'ta', 'mr', 'ml', 'bn', 'kn'];

function localeOrEn(locale: string): string {
  return SUPPORTED_LOCALES.includes(locale) ? locale : 'en';
}

// GET /api/changes/[id] — full detail for a single item in the "recent
// changes" feed (see /api/changes for the list this is drilled into from).
// The feed mixes two kinds of ids, so this route understands both:
//   - "change-<numeric id>" — a real reviewed row from the `changes` table
//     (has its own title/summary/proposed_content describing what changed).
//   - "policy-<slug>" — a filler item synthesized from the `policies` table
//     (used to pad the feed out to a full page when there aren't enough
//     approved `changes` rows yet); its "explanation" is just that policy's
//     own current summary, since there's no separate change record for it.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const locale = localeOrEn(searchParams.get('locale') ?? 'en');
  const supabase = getSupabase();

  if (id.startsWith('change-')) {
    const numericId = Number.parseInt(id.slice('change-'.length), 10);
    if (Number.isNaN(numericId)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { data, error } = await supabase.from('changes').select('*').eq('id', numericId).maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const row = data as ChangeRow;
    const content = (row.proposed_content ?? {}) as Record<string, { title?: string; summary?: string }>;
    const localized = content[locale] ?? content.en;
    return NextResponse.json({
      item: {
        id,
        type: row.type,
        slug: row.slug,
        title: localized?.title ?? row.title,
        summary: localized?.summary ?? row.summary,
        date: row.reviewed_at ?? row.created_at,
        datePrecision: 'exact' as const,
      },
    });
  }

  if (id.startsWith('policy-')) {
    const slug = id.slice('policy-'.length);
    const { data, error } = await supabase
      .from('policies')
      .select('slug, content, year, updated_at')
      .eq('slug', slug)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const row = data as Pick<PolicyRow, 'slug' | 'content' | 'year' | 'updated_at'>;
    const content = (row.content ?? {}) as Record<string, { title?: string; summary?: string }>;
    const localized = content[locale] ?? content.en;
    const hasYear = typeof row.year === 'number';
    return NextResponse.json({
      item: {
        id,
        type: 'enacted' as const,
        slug: row.slug,
        title: localized?.title ?? row.slug,
        summary: localized?.summary ?? null,
        date: hasYear ? `${row.year}-01-01T00:00:00.000Z` : row.updated_at,
        datePrecision: hasYear ? ('year' as const) : ('exact' as const),
      },
    });
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
