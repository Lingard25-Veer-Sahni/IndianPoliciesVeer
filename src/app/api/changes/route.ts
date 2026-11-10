import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, type ChangeRow, type PolicyRow } from '@/lib/supabase-admin';

const DEFAULT_LIMIT = 20;
const SUPPORTED_LOCALES = ['en', 'hi', 'ta', 'mr', 'ml', 'bn', 'kn'];

interface FeedItem {
  id: string;
  type: 'add' | 'amend' | 'delete' | 'enacted';
  slug: string | null;
  title: string | null;
  date: string;
  // 'exact': `date` is a real timestamp (a `changes` row was reviewed/staged
  // at that moment). 'year': `date` is synthesized from a policy's
  // `year`-enacted column (year-precision only, no real day/time known), so
  // the UI should render just the year rather than a fabricated full date.
  datePrecision: 'exact' | 'year';
}

function localeOrEn(locale: string): string {
  return SUPPORTED_LOCALES.includes(locale) ? locale : 'en';
}

// GET /api/changes — recent changes feed for the public left-side "recent
// changes" tab. Pass ?status=pending to list pending changes instead (used
// by the admin review UI, via /api/admin/review). Pass ?locale=xx to get
// titles in that language.
//
// This is meant to reflect real government action on a law (a new Act
// passed, an existing one amended or repealed) rather than internal
// bookkeeping, so it draws on two sources:
//   1. Reviewed/approved `changes` rows — genuine add/amend/delete history
//      staged from AI-suggested updates and approved by a human reviewer.
//   2. When that list runs short of `limit` (in practice the `changes`
//      table is often empty since most suggestions sit in pending review),
//      pad the feed with policies from `policies.year` — the actual year
//      each law was enacted, which is a real government date even though
//      it's not a live "just changed" event. This also means the tab never
//      sits empty. These filler items are tagged type "enacted" and shown
//      with year-only precision (see FeedItem.datePrecision) rather than a
//      fabricated day/time, since only the year is known.
export async function GET(req: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'approved';
  const limit = Number.parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
  const locale = localeOrEn(searchParams.get('locale') ?? 'en');

  // Mirrors the previous `ORDER BY COALESCE(reviewedAt, createdAt) DESC, id
  // DESC`: sort by reviewed_at first (nulls last, so pending rows without a
  // reviewed_at fall back to created_at ordering), then created_at, then id.
  const { data, error } = await supabase
    .from('changes')
    .select('*')
    .eq('status', status)
    .order('reviewed_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const changeRows = (data ?? []) as ChangeRow[];
  const changeItems: FeedItem[] = changeRows.map((row) => {
    const content = (row.proposed_content ?? {}) as Record<string, { title?: string; summary?: string }>;
    const localized = content[locale]?.title ?? content.en?.title ?? row.title;
    return {
      id: `change-${row.id}`,
      type: row.type,
      slug: row.slug,
      title: localized,
      date: row.reviewed_at ?? row.created_at,
      datePrecision: 'exact',
    };
  });

  // Only pad with policy-derived filler items on the default (public,
  // approved-changes) feed — the admin "pending" view should show exactly
  // the pending queue, not be padded with unrelated policy rows.
  let filler: FeedItem[] = [];
  if (status === 'approved' && changeItems.length < limit) {
    const excludeSlugs = new Set(changeRows.map((r) => r.slug).filter(Boolean) as string[]);
    const { data: policyData, error: policyError } = await supabase
      .from('policies')
      .select('slug, content, year, updated_at')
      .order('year', { ascending: false, nullsFirst: false })
      .limit(limit + excludeSlugs.size);

    if (!policyError) {
      const policyRows = (policyData ?? []) as Pick<PolicyRow, 'slug' | 'content' | 'year' | 'updated_at'>[];
      filler = policyRows
        .filter((row) => !excludeSlugs.has(row.slug))
        .slice(0, limit - changeItems.length)
        .map((row) => {
          const content = (row.content ?? {}) as Record<string, { title?: string; summary?: string }>;
          const localized = content[locale]?.title ?? content.en?.title ?? row.slug;
          // Year-enacted is the only real government date we have for a
          // policy that hasn't gone through the AI-staged change workflow.
          // Fall back to the DB row's own updated_at (exact precision) only
          // if the year is genuinely unknown.
          const hasYear = typeof row.year === 'number';
          return {
            id: `policy-${row.slug}`,
            type: 'enacted' as const,
            slug: row.slug,
            title: localized,
            date: hasYear ? `${row.year}-01-01T00:00:00.000Z` : row.updated_at,
            datePrecision: hasYear ? ('year' as const) : ('exact' as const),
          };
        });
    }
  }

  const changes = [...changeItems, ...filler]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);

  return NextResponse.json({ changes, count: changes.length });
}
