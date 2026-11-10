import { NextRequest, NextResponse } from 'next/server';
import Fuse from 'fuse.js';
import { getSupabase, type PolicyRow } from '@/lib/supabase-admin';
import { chatJSON, stripAiTells, NATURAL_WRITING_STYLE } from '@/lib/openrouter';
import { policies as staticPolicies } from '@/data/policies';
import { indianStates } from '@/data/states';
import { createSearchIndex, search as searchStatic, rankFuseByTokens } from '@/lib/search';
import {
  buildCacheKey,
  getCachedSearchResponse,
  setCachedSearchResponse,
  type CachedSearchResponse,
} from '@/lib/search-cache';
import type { Locale } from '@/i18n/routing';
import { searchIndianActs, dedupeByAct } from '@/lib/vaquill';

// Without this, the route inherits Vercel's platform default serverless
// timeout (10s on the Hobby plan), which is often shorter than chatJSON's
// own request budget. When that happens Vercel kills the function
// mid-request before chatJSON even gets a chance to try its fallback
// models, and the client just sees a failed fetch — a common cause of the
// "AI ranking is temporarily unavailable" message showing up more than it
// should. Set to 60s, Vercel Hobby's hard per-function ceiling, to give
// chatJSON's full TOTAL_BUDGET_MS (55s, see src/lib/openrouter.ts) room to
// run without the platform killing the function first.
export const maxDuration = 60;

const CANDIDATE_LIMIT = 30;

// English names for each supported locale, used to tell the AI model which
// language to write its answer in. Kept separate from the native-script
// `localeNames` map in src/i18n/routing.ts (e.g. 'हिन्दी') since an explicit
// English language name is a clearer, less ambiguous instruction for the
// model than a native-script label mixed into an otherwise-English prompt.
const LOCALE_LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  mr: 'Marathi',
  ml: 'Malayalam',
  bn: 'Bengali',
  kn: 'Kannada',
};

interface CandidateEntry {
  slug: string;
  title: string;
  summary: string;
  keywords: string;
}

// The Supabase `policies` table only exists once the project owner has run
// `supabase/migrations/0001_init.sql` and `npm run seed`. Until then (or if
// Supabase is briefly unreachable), fall back to the static, already-curated
// dataset in src/data/policies.ts so AI search keeps working regardless of
// whether the DB migration step has been completed.
async function loadCandidates(
  query: string,
  locale: Locale
): Promise<{ entry: CandidateEntry; row: PolicyRow | null }[]> {
  let rows: PolicyRow[] = [];
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('policies').select('*');
    if (error) throw new Error(error.message);
    rows = (data ?? []) as PolicyRow[];
  } catch (err) {
    console.error('Supabase policies fetch failed, falling back to static dataset:', err);
    rows = [];
  }

  // Only central (nationwide) laws go into the general candidate pool that
  // gets shown to the AI as "the" answer. A `level: 'state'` DB row can't be
  // trusted to apply to whichever state the user has selected (Supabase's
  // schema doesn't currently track *which* states a state-level law applies
  // to), so those are excluded here entirely and left to the separate
  // state-specific lookup below (which uses src/data/states.ts as the
  // source of truth for state applicability).
  const entries =
    rows.length > 0
      ? rows
          .filter((row) => row.level !== 'state')
          .map((row) => {
            const content = (row.content ?? {}) as Record<string, { title: string; summary: string }>;
            const localeContent = content[locale] ?? content.en ?? { title: row.slug, summary: '' };
            const keywords = (row.keywords ?? []) as string[];
            return {
              row: row as PolicyRow | null,
              entry: {
                slug: row.slug,
                title: localeContent.title,
                summary: localeContent.summary,
                keywords: keywords.join(' '),
              },
            };
          })
      : staticPolicies
          .filter((p) => p.applicability !== 'state')
          .map((p) => {
            const localeContent = p.content[locale] ?? p.content.en;
            return {
              row: null,
              entry: {
                slug: p.slug,
                title: localeContent.title,
                summary: localeContent.summary,
                keywords: p.keywords.join(' '),
              },
            };
          });

  // Reuses the same forgiving, weighted Fuse.js approach as
  // src/lib/search.ts (title/keywords weighted higher than summary),
  // applied to DB-loaded rows instead of the static dataset, so the AI
  // search feature stays decoupled from src/data/policies.ts.
  const fuse = new Fuse(entries, {
    keys: [
      { name: 'entry.keywords', weight: 0.45 },
      { name: 'entry.title', weight: 0.4 },
      { name: 'entry.summary', weight: 0.15 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
    includeScore: true,
  });

  // Uses the same tokenized multi-word ranking as src/lib/search.ts
  // (rankFuseByTokens) rather than a single fuse.search(query) call on the
  // whole phrase. A single-phrase fuzzy match scores badly on real
  // conversational queries: e.g. "gst rules" as one fuzzy phrase barely
  // resembles "Goods and Services Tax" (its actual title), so the real GST
  // entry ranked ~98th out of ~105 candidates and never made it into the
  // top CANDIDATE_LIMIT shown to the AI, even though "gst" is a literal
  // keyword on that entry. Scoring each word independently and ranking by
  // (word-match-count, then quality) fixes that class of miss.
  const results = rankFuseByTokens(fuse, query, (r) => r.entry.slug);
  const ranked = results.length > 0 ? results.map((r) => r.item) : entries.slice(0, CANDIDATE_LIMIT);
  return ranked.slice(0, CANDIDATE_LIMIT);
}

// State-specific laws (i.e. those with `applicability: 'state'` in
// src/data/policies.ts) that list the given state, ranked against the
// query using the same forgiving multi-word Fuse search the "By State"
// page uses. Kept separate from the general AI-ranked candidate pool so
// they can be surfaced as their own "state-specific" section rather than
// mixed in with central laws. Static-data-only for now (see the note in
// loadCandidates above about Supabase not tracking per-state applicability
// yet) — returns [] once no state is selected or none match, which is
// expected today since no state-specific entries exist in policies.ts yet.
function loadStateCandidates(query: string, locale: Locale, stateSlug: string) {
  const fuse = createSearchIndex(locale);
  const trimmed = query.trim();
  const matches = trimmed ? searchStatic(fuse, trimmed).map((r) => r.item.policy) : staticPolicies;
  return matches
    .filter((p) => p.applicability === 'state' && (p.states?.includes(stateSlug) ?? false))
    .slice(0, 10);
}

export async function POST(req: NextRequest) {
  let body: { query?: string; locale?: string; state?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const query = (body.query ?? '').trim();
  const locale = (body.locale ?? 'en') as Locale;
  const stateSlug = (body.state ?? '').trim();
  const isValidState = stateSlug && indianStates.some((s) => s.slug === stateSlug);

  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  // Many different users tend to ask near-identical questions (e.g. "how do
  // I file an RTI"). Reuse a previously generated answer for the same
  // question+locale+state instead of burning OpenRouter free-tier quota and
  // added latency on every single request. See src/lib/search-cache.ts —
  // fails open (treated as a cache miss) on any error, so this can never
  // block a search from completing.
  const cacheKey = buildCacheKey(query, locale, stateSlug);
  const cached = await getCachedSearchResponse(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const candidates = await loadCandidates(query, locale);

  const stateMatches = isValidState ? loadStateCandidates(query, locale, stateSlug) : [];
  const stateResults = stateMatches.map((p) => ({
    slug: p.slug,
    title: (p.content[locale] ?? p.content.en).title,
    reason: null as string | null,
  }));

  // Live lookup against the real Indian legislation corpus (Vaquill), only
  // for a selected state — this is what fills in the states that
  // src/data/policies.ts has no hand-curated entries for. Only runs once
  // per unique (query, locale, state) thanks to the cache check above, since
  // each call costs real money. Fails safe to [] (see src/lib/vaquill.ts),
  // so it can never turn a working search into a broken one.
  const liveActs = isValidState ? dedupeByAct(await searchIndianActs(query, { state: stateSlug })) : [];
  const liveResults = liveActs.map((a) => ({
    actId: a.actId,
    title: a.title,
    sectionNumber: a.sectionNumber,
    sectionTitle: a.sectionTitle,
    citation: a.citation?.citationShort || a.citation?.citation || a.title,
    content: a.content,
    sourceUrl: a.sourceUrl,
    pdfUrl: a.pdfUrl,
  }));

  if (candidates.length === 0) {
    const response: CachedSearchResponse = { answer: null, results: [], stateResults, liveResults, aiPowered: false };
    await setCachedSearchResponse(cacheKey, query, locale, stateSlug, response);
    return NextResponse.json(response);
  }

  // Try the AI-ranked path first; fall back to the plain Fuse ranking (no
  // AI reasoning, no answer paragraph) on any failure, so this route never
  // hard-fails.
  try {
    const list = candidates
      .map((c, i) => `${i + 1}. slug: ${c.entry.slug} | title: ${c.entry.title} | summary: ${c.entry.summary}`)
      .join('\n');

    const languageName = LOCALE_LANGUAGE_NAMES[locale] ?? 'English';

    const raw = await chatJSON<{ answer: string; results: { slug: string; reason: string }[] }>([
      {
        role: 'system',
        content:
          'You are a research assistant for an Indian law/policy encyclopedia. Given a user\'s ' +
          'plain-language question and a numbered list of candidate laws/policies from the site\'s ' +
          'database, do two things:\n' +
          `0. IMPORTANT: Write the "answer" paragraph and every "reason" string ENTIRELY in ` +
          `${languageName} (locale "${locale}"), regardless of what language the question was asked ` +
          `in. This is a hard requirement, not a preference. Proper nouns that don't have a common ` +
          `${languageName} equivalent (e.g. the official English name of an Act, or an English acronym ` +
          `like "FIR" or "RTI") may stay in English/Roman script within the ${languageName} sentence, ` +
          'but the surrounding sentence structure and all other words must be in ' +
          `${languageName}${locale !== 'en' ? ', written in its native script (not transliterated into Roman letters)' : ''}.\n` +
          '1. Write a genuinely helpful, well-organized paragraph (4-7 sentences) that directly ' +
          'answers the question using your general knowledge of Indian law — do not artificially ' +
          'narrow the answer to only what the candidate list happens to contain.\n' +
          'IMPORTANT — do not default to a gender, relationship, or setting (e.g. workplace, home, ' +
          'online, public) that the user did not mention. Many candidate laws in the list are titled ' +
          'around "women" specifically (e.g. workplace harassment of women, domestic violence against ' +
          'women) because those are the named protection Acts — but the underlying question (e.g. about ' +
          'harassment, violence, or abuse in general) applies to anyone regardless of gender. So: START ' +
          'the answer with the generally-applicable law that protects ANY person (e.g. the relevant ' +
          'Bharatiya Nyaya Sanhita / Indian Penal Code provisions on criminal intimidation, insult, ' +
          'defamation, stalking, or assault, and how/where to file a police complaint — an FIR), THEN ' +
          'mention any additional gender-specific or context-specific protections (like the POSH Act or ' +
          'Domestic Violence Act) as extra options that exist ONLY IF the situation happens to involve ' +
          'those specific contexts, explicitly noting they are gender/context-specific rather than ' +
          'presenting them as the primary or only answer. Do not invent specific section numbers or case ' +
          'law you are not confident about — speak in terms of the named Acts instead where precision ' +
          'matters.\n' +
          '2. Pick and rank the most relevant candidates from the given list (most relevant first) with ' +
          'a one-sentence reason each. Only choose from the given candidate slugs — never invent a slug. ' +
          'It is fine to return zero results if truly none of the candidates are relevant.\n' +
          'Respond with STRICT JSON only, in this exact shape: ' +
          '{"answer": "<paragraph>", "results": [{"slug": "<slug>", "reason": "<short reason>"}]}. ' +
          'No markdown, no extra text outside the JSON.\n\n' +
          NATURAL_WRITING_STYLE,
      },
      {
        role: 'user',
        content:
          `Question: "${query}"` +
          (isValidState
            ? `\n\nThe user has selected the state/UT "${stateSlug.replace(/-/g, ' ')}" as a filter. ` +
              'Briefly note in the answer where state-specific rules could differ from the general/central ' +
              "law (without inventing specific state law details you don't know), but keep the primary " +
              'answer focused on the generally-applicable central law.'
            : '') +
          `\n\nCandidate laws/policies from the site's database:\n${list}` +
          `\n\nReminder: write the "answer" field and every "reason" field in ${languageName}` +
          `${locale !== 'en' ? ' (native script, not Roman transliteration)' : ''}, regardless of the ` +
          'language the question above happens to be written in, and regardless of the language of ' +
          'this instruction text.',
      },
    ]);

    const candidateBySlug = new Map(candidates.map((c) => [c.entry.slug, c]));
    let results: { slug: string; title: string; reason: string | null }[] = (raw.results ?? [])
      .filter((r) => candidateBySlug.has(r.slug))
      .map((r) => {
        const c = candidateBySlug.get(r.slug)!;
        return { slug: r.slug, title: c.entry.title, reason: r.reason ? stripAiTells(r.reason) : r.reason };
      });

    // The model quite often writes a genuinely good freeform "answer" but
    // leaves its own "results" ranking empty (or picks a slug that doesn't
    // match the candidate list) — previously this was masked because the
    // UI showed the answer paragraph regardless, so an empty results list
    // wasn't very noticeable. Now that the answer paragraph is hidden (see
    // SHOW_AI_ANSWER in the ai-search page), an empty results list means
    // the user sees nothing but "No matching policies found" even though
    // relevant laws were right there in the candidate list. Backfill from
    // the plain Fuse-ranked candidates (the same ones handed to the model)
    // in that case, so "related policies" reliably shows something instead
    // of silently going empty whenever the model skips its own ranking
    // step.
    if (results.length === 0) {
      results = candidates
        .slice(0, 5)
        .map((c) => ({ slug: c.entry.slug, title: c.entry.title, reason: null as string | null }));
    }

    const answer = stripAiTells((raw.answer ?? '').trim());
    if (answer || results.length > 0) {
      const response: CachedSearchResponse = {
        answer: answer || null,
        results,
        stateResults,
        liveResults,
        aiPowered: true,
      };
      await setCachedSearchResponse(cacheKey, query, locale, stateSlug, response);
      return NextResponse.json(response);
    }
    // AI returned nothing usable — fall through to Fuse fallback below.
    throw new Error('AI returned no answer or matching candidates');
  } catch (err) {
    console.error('AI search failed, falling back to Fuse ranking:', err);
    const results = candidates.map((c) => ({
      slug: c.entry.slug,
      title: c.entry.title,
      reason: null,
    }));
    // Deliberately NOT cached: this is the degraded/no-AI fallback path
    // (e.g. a transient OpenRouter outage), so caching it would risk
    // serving the low-quality fallback to other users for days even after
    // the AI path recovers.
    return NextResponse.json({ answer: null, results, stateResults, liveResults, aiPowered: false });
  }
}
