// Thin client for the Vaquill Indian legislation API
// (https://platform.experientiallabs.ai is unrelated — this is
// https://app.vaquill.ai, a separate paid, metered API that indexes the
// actual text of ~64k Central/State/regulatory Indian enactments down to
// individual sections). Used to plug a real gap in this site's own
// "By State" search: src/data/policies.ts only has a small hand-curated set
// of state-specific laws (see the comment on loadStateCandidates in
// src/app/api/search/route.ts), so most states return zero state-specific
// results there. This module lets AI search fall back to a live, sourced
// lookup against the real legislation text for whichever state the user
// selected, instead of just coming up empty.
//
// This is a metered API (see https://api.vaquill.ai/api/v1/in/acts/pricing)
// — a single /in/acts/search call costs 2 credits (~$0.02). Callers MUST
// cache responses (the AI search route already does, via
// src/lib/search-cache.ts) rather than calling this on every keystroke or
// every repeated identical query.

const VAQUILL_BASE_URL = 'https://api.vaquill.ai/api/v1';

// Per-attempt timeout. Generous but bounded so a slow/hung Vaquill request
// never blocks the rest of the AI search response — callers should treat
// any failure here (timeout, non-2xx, network error) as "no live results",
// never as a hard failure of the whole search request.
const REQUEST_TIMEOUT_MS = 8_000;

export interface VaquillSearchResult {
  actId: string;
  title: string;
  sectionNumber: string | null;
  sectionTitle: string | null;
  year: number | null;
  state: string | null;
  actStatus: string | null;
  content: string;
  sourceUrl: string | null;
  pdfUrl: string | null;
  textUrl: string | null;
  relevanceScore: number;
  citation: {
    citation: string;
    citationShort: string;
  };
}

interface VaquillSearchResponse {
  data?: { results?: VaquillSearchResult[]; totalReturned?: number };
}

// Searches the live Indian legislation corpus, optionally narrowed to one
// state/UT (use the same slug convention as src/data/states.ts, e.g.
// 'tamil-nadu', 'west-bengal'). Returns [] on any failure (missing API key,
// timeout, non-2xx, bad JSON) rather than throwing, since this is always
// meant to be an optional enrichment, never a hard dependency for AI search.
export async function searchIndianActs(
  query: string,
  opts: { state?: string; pageSize?: number } = {}
): Promise<VaquillSearchResult[]> {
  const apiKey = process.env.VAQUILL_API_KEY;
  if (!apiKey || !query.trim()) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${VAQUILL_BASE_URL}/in/acts/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query.trim(),
        ...(opts.state ? { state: opts.state } : {}),
        pageSize: opts.pageSize ?? 6,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`Vaquill search failed (${res.status}): ${await res.text().catch(() => '')}`);
      return [];
    }
    const data = (await res.json()) as VaquillSearchResponse;
    return data.data?.results ?? [];
  } catch (err) {
    console.error('Vaquill search request failed:', err);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

// Vaquill returns individual matching sections, so the same act commonly
// appears multiple times (once per matching section). Collapses that down
// to one entry per act (keeping the highest-relevance section) before
// showing results to a user, who wants "here's the relevant law" rather
// than five hits against the same act.
export function dedupeByAct(results: VaquillSearchResult[]): VaquillSearchResult[] {
  const bestByAct = new Map<string, VaquillSearchResult>();
  for (const r of results) {
    const existing = bestByAct.get(r.actId);
    if (!existing || r.relevanceScore > existing.relevanceScore) {
      bestByAct.set(r.actId, r);
    }
  }
  return Array.from(bestByAct.values()).sort((a, b) => b.relevanceScore - a.relevanceScore);
}
