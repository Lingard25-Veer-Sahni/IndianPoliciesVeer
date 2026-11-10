import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-admin';
import { chatJSON, stripAiTells, NATURAL_WRITING_STYLE } from '@/lib/openrouter';
import { timingSafeEqualStrings } from '@/lib/auth';

// Without this, this route inherits Vercel's platform default serverless
// timeout, which can be shorter than chatJSON's full model-fallback budget
// (TOTAL_BUDGET_MS = 55s — see src/lib/openrouter.ts) and would kill the
// function mid-request before chatJSON gets through its fallback models.
// Set to 60s, matching Vercel Hobby's hard per-function ceiling. See the
// identical comment on /api/search for the user-facing version of this
// same failure mode.
export const maxDuration = 60;

// POST /api/cron/refresh — asks the AI model to look at a slice of the
// site's CENTRAL (nationwide) laws and flag ones that its training data
// suggests are now outdated (amended, repealed, or superseded), as well as
// suggest well-known central laws/amendments that may be missing entirely.
// Staged as pending `changes` rows for a human to approve/reject via
// /[locale]/admin/review — never applied automatically. That's deliberate:
// this calls a free LLM, which can and does hallucinate specific details,
// so auto-writing its output straight into a legal-information database
// without a human check would trade one accuracy problem for another.
//
// IMPORTANT CAVEAT: the model has no live internet/browsing access here —
// it can only reason from what it learned during training, which has a
// cutoff date. So this surfaces "likely stale based on what the model
// knows", not a guaranteed real-time feed of today's Parliament/Gazette
// notifications. Treat its suggestions as a lead for a reviewer to verify
// against the official source, not as a verified fact.
//
// Protected by a shared secret so this can't be triggered publicly.
// Vercel's serverless cron GETs the URL and does not send custom headers,
// so the `?secret=` query param can't be dropped here the way it was for
// the admin route — it's kept as a fallback specifically for that
// constraint, but the header is checked first/preferred, and the
// comparison itself is constant-time (see src/lib/auth.ts) instead of a
// plain `===`.
function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('x-cron-secret');
  if (header && timingSafeEqualStrings(header, expected)) return true;
  const query = new URL(req.url).searchParams.get('secret');
  if (query && timingSafeEqualStrings(query, expected)) return true;
  return false;
}

interface SuggestedChange {
  type: 'add' | 'amend' | 'delete';
  slug: string;
  title: string;
  summary: string;
  proposedContent?: unknown;
}

// Vercel's serverless cron issues a GET request to the configured path (see
// vercel.json) and cannot send custom headers, so GET is supported here too
// (authorized via the `?secret=` query param fallback) in addition to POST.
export async function GET(req: NextRequest) {
  return handleRefresh(req);
}

export async function POST(req: NextRequest) {
  return handleRefresh(req);
}

async function handleRefresh(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  // Focus specifically on CENTRAL (nationwide) laws — state/local entries
  // are excluded here since the model has no reliable way to reason about
  // 28+ separate state legislatures from training data alone, and central
  // law changes affect the most users.
  //
  // Ordered by `updated_at` ascending (least-recently-touched first) rather
  // than randomly, so repeated hourly runs naturally rotate through the
  // whole central-law set over time instead of re-showing the same lucky
  // random slice — every entry eventually gets a periodic "is this still
  // accurate?" pass, not just the ones that happen to get sampled.
  const { data: sampleData, error: sampleError } = await supabase
    .from('policies')
    .select('slug, category, year, updated_at')
    .eq('level', 'central')
    .order('updated_at', { ascending: true })
    .limit(40);
  if (sampleError) {
    return NextResponse.json({ staged: 0, error: sampleError.message }, { status: 200 });
  }
  const sampleRows = (sampleData ?? []) as { slug: string; category: string; year: number | null }[];
  const existingSample = sampleRows
    .map((r) => `${r.slug} (${r.category}${r.year ? `, ${r.year}` : ''})`)
    .join(', ');

  // The model only ever sees a 40-row sample above (keeps the prompt small),
  // so it frequently re-proposes laws that already exist under the same or
  // a near-identical slug. Fetch the FULL existing slug set (cheap — just
  // one column) to filter those out server-side before anything is staged,
  // rather than relying on a human/reviewer to reject the same duplicates
  // every single hour.
  const { data: allSlugData } = await supabase.from('policies').select('slug');
  const existingSlugs = new Set(
    ((allSlugData ?? []) as { slug: string }[]).map((r) => r.slug.toLowerCase())
  );
  // Also catch near-duplicates where the AI appended/changed a year suffix
  // or similar (e.g. "goods-and-services-tax-act-2017" vs the existing
  // "goods-and-services-tax") by comparing normalized slug stems.
  const stem = (slug: string) =>
    slug
      .toLowerCase()
      .replace(/-(act|rules?|code|bill)?-?\d{4}$/, '')
      .replace(/-act$|-rules?$|-code$/, '');
  const existingStems = new Set(Array.from(existingSlugs).map(stem));

  try {
    const raw = await chatJSON<{ suggestions: SuggestedChange[] }>([
      {
        role: 'system',
        content:
          'You are helping maintain an Indian CENTRAL (nationwide) law and policy encyclopedia. ' +
          'You do not have real-time browsing access, so do not claim to know about breaking news or ' +
          'invent a specific date/section you are not confident about. Given a sample of entries already ' +
          'in the database, do BOTH of the following, not just one:\n' +
          '1. UPDATES to existing entries: for any listed entry that you are confident, based on your ' +
          'training knowledge, has since been amended, repealed, replaced, or consolidated into a newer ' +
          'law (for example: a law superseded by one of the four Labour Codes, a scheme renamed/merged, ' +
          'a rate/threshold that changed), propose an "amend" (update the summary to reflect the current ' +
          'law) or "delete" (only if fully repealed with no replacement) suggestion referencing that ' +
          'exact existing slug. Only do this when reasonably confident — skip an entry rather than guess.\n' +
          '2. ADDITIONS: separately, suggest up to 3 important Indian central laws, rules, schemes, or ' +
          'well-known amendments that seem to be missing entirely from the sample shown (do not assume ' +
          'they are missing from the WHOLE database, only from this sample, so favor well-known ' +
          'nationwide laws over obscure ones to reduce duplicate suggestions).\n' +
          'It is fine to return zero suggestions of either kind if nothing meets the confidence bar. ' +
          'Respond with STRICT JSON only, in this exact shape: ' +
          '{"suggestions": [{"type": "add|amend|delete", "slug": "kebab-case-slug", "title": "...", ' +
          '"summary": "...", "proposedContent": {"en": {"title": "...", "summary": "..."}}}]}. ' +
          'For "amend"/"delete", "slug" MUST exactly match one of the existing slugs given below. ' +
          'No markdown, no extra text.\n\n' +
          NATURAL_WRITING_STYLE,
      },
      {
        role: 'user',
        content:
          `A sample of existing CENTRAL entries already in the database (not the full list, and not ` +
          `necessarily representative of what's missing site-wide): ${existingSample}`,
      },
    ]);

    const allSuggestions = raw.suggestions ?? [];

    // 'add' suggestions whose slug (or normalized stem) already exists are
    // near-certainly duplicates — auto-drop them rather than staging noise
    // for review. 'amend'/'delete' suggestions are expected to reference an
    // existing slug, so they're exempt from this filter.
    const suggestions = allSuggestions.filter((s) => {
      if (s.type === 'add') {
        const slugLower = s.slug.toLowerCase();
        if (existingSlugs.has(slugLower)) return false;
        if (existingStems.has(stem(slugLower))) return false;
        return true;
      }
      // 'amend'/'delete' only make sense against a real existing slug — the
      // model occasionally invents a plausible-looking one instead of using
      // an exact match, which would otherwise silently no-op (Supabase's
      // `.update()`/`.delete()` with a non-matching `.eq('slug', ...)`
      // filter just affects 0 rows rather than erroring) and waste a
      // reviewer's time approving a change that does nothing.
      return existingSlugs.has(s.slug.toLowerCase());
    });
    const duplicatesDropped = allSuggestions.length - suggestions.length;

    // Strip em/en dashes and other AI writing tells from any free-text the
    // model produced before it's staged for human review, so what a
    // reviewer (or the live site, once approved) sees is already clean
    // even if the model didn't fully follow NATURAL_WRITING_STYLE.
    function sanitizeProposedContent(content: unknown): unknown {
      if (!content || typeof content !== 'object') return content ?? null;
      const out: Record<string, unknown> = {};
      for (const [locale, val] of Object.entries(content as Record<string, unknown>)) {
        if (val && typeof val === 'object') {
          const v = val as Record<string, unknown>;
          out[locale] = {
            ...v,
            ...(typeof v.title === 'string' ? { title: stripAiTells(v.title) } : {}),
            ...(typeof v.summary === 'string' ? { summary: stripAiTells(v.summary) } : {}),
          };
        } else {
          out[locale] = val;
        }
      }
      return out;
    }

    if (suggestions.length > 0) {
      const rows = suggestions.map((s) => ({
        type: s.type,
        slug: s.slug,
        title: stripAiTells(s.title),
        summary: stripAiTells(s.summary),
        proposed_content: sanitizeProposedContent(s.proposedContent),
        status: 'pending' as const,
        source: 'ai' as const,
      }));
      const { error: insertError } = await supabase.from('changes').insert(rows);
      if (insertError) {
        return NextResponse.json({ staged: 0, error: insertError.message }, { status: 200 });
      }
    }

    return NextResponse.json({ staged: suggestions.length, duplicatesDropped });
  } catch (err) {
    console.error('cron/refresh: OpenRouter call failed:', err);
    return NextResponse.json({ staged: 0, error: String(err) }, { status: 200 });
  }
}
