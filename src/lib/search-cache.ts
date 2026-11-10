import { createHash } from 'crypto';
import { getSupabase } from '@/lib/supabase-admin';

// How long a cached AI search answer stays valid. Laws don't change hour
// to hour, so reusing an answer for a few days is safe, and it cuts
// repeated OpenRouter calls (and latency) for popular questions like "how
// do I file an RTI" down from N calls to 1 per this window.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface CachedSearchResponse {
  answer: string | null;
  results: { slug: string; title: string; reason: string | null }[];
  stateResults: { slug: string; title: string; reason: string | null }[];
  aiPowered: boolean;
  // Live results from the Vaquill Indian legislation API (src/lib/vaquill.ts),
  // covering whichever state the user selected. Optional/possibly-undefined
  // so older cache rows written before this field existed still deserialize
  // fine (they just render as "no live results" rather than breaking).
  // Deliberately a separate array from `stateResults` above (which only ever
  // holds entries from the static src/data/policies.ts dataset with a real
  // internal /policies/[slug] page) since these entries have no internal
  // slug and must link out to their original source instead.
  liveResults?: {
    actId: string;
    title: string;
    sectionNumber: string | null;
    sectionTitle: string | null;
    citation: string;
    content: string;
    sourceUrl: string | null;
    pdfUrl: string | null;
  }[];
}

// Normalizes a query into a stable cache key: same underlying question
// asked with different casing/spacing/punctuation should hit the same
// cache entry. Intentionally simple (not stemming/fuzzy) so it only
// collapses near-identical phrasing, not merges unrelated questions.
export function buildCacheKey(query: string, locale: string, stateSlug: string): string {
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[?.!,]+$/g, '');
  const raw = `${normalizedQuery}|${locale}|${stateSlug || ''}`;
  return createHash('sha256').update(raw).digest('hex');
}

// Fails closed to "no cache entry" (never throws) so a DB hiccup or the
// migration not having been run yet just means every request falls
// through to a fresh AI call, exactly like today.
export async function getCachedSearchResponse(hash: string): Promise<CachedSearchResponse | null> {
  try {
    const supabase = getSupabase();
    const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
    const { data, error } = await supabase
      .from('search_cache')
      .select('response, created_at')
      .eq('query_hash', hash)
      .gte('created_at', cutoff)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return data.response as CachedSearchResponse;
  } catch (err) {
    console.error('Search cache lookup failed, proceeding without cache:', err);
    return null;
  }
}

// Best-effort write; a failure here should never break the actual search
// response the user is waiting on.
export async function setCachedSearchResponse(
  hash: string,
  query: string,
  locale: string,
  stateSlug: string,
  response: CachedSearchResponse
): Promise<void> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('search_cache').upsert(
      {
        query_hash: hash,
        query,
        locale,
        state: stateSlug || null,
        response,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'query_hash' }
    );
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('Search cache write failed (non-fatal):', err);
  }
}
