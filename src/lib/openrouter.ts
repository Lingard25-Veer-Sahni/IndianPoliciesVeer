// Thin wrapper around OpenRouter's chat completions endpoint. Used by the
// AI search route and the cron/refresh route. Always wrap calls to
// `chatJSON` in a try/catch at the call site — this module intentionally
// throws on failure rather than swallowing errors, so callers can decide
// their own fallback behaviour.

const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Experiential Labs (https://platform.experientiallabs.ai) — the primary
// model gateway, OpenAI-wire-protocol-compatible. Tried first; OpenRouter
// (with its own primary + fallback model chain, see getProviderChain below)
// only gets used if every Experiential Labs attempt fails, so a full
// Experiential Labs outage doesn't take down AI search / the cron refresh
// job — it fails over to a completely separate upstream.
const EXPLABS_ENDPOINT = 'https://api.experientiallabs.ai/v1/chat/completions';

export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL || 'minimax/minimax-m2.7:free';
}

export function getExplabsModel(): string {
  return process.env.EXPLABS_MODEL || 'qwen3.8-27b';
}

// Fallback models tried in order if the primary model above fails. This is
// the actual fix for the "AI ranking is temporarily unavailable" message
// showing up: live testing (Aug 2026) confirmed the primary free model
// (minimax/minimax-m2.7:free) fails with an immediate HTTP 429 "temporarily
// rate-limited upstream" from OpenRouter's shared free-tier pool for that
// specific model — not a slow response. No per-attempt timeout, however
// generous, and no same-model retry can fix that: the whole shared pool for
// that model is momentarily out of capacity, so retrying the same model just
// gets the same 429 again. Trying a *different* free model (each has its own
// independent shared pool) is what actually routes around a 429, the same
// way this app already falls back to a different data source when Supabase
// is unreachable elsewhere in the codebase.
// Each of these was live-verified (via a direct curl to OpenRouter) to be
// currently available and to honor `response_format: {type: "json_object"}`
// before being added here. If OpenRouter deprecates one of these free
// slugs, requests just silently skip it (see the 404 handling below) and
// move to the next entry, so this list doesn't need to be perfectly
// up-to-date to keep working, but it should be spot-checked occasionally
// since free-tier slugs churn faster than paid ones.
const DEFAULT_FALLBACK_MODELS = [
  'minimax/minimax-m3:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-31b-it:free',
];

// The full ordered list of models to try for one logical request: the
// configured primary model first, then the fallbacks above (or an
// operator-supplied override via OPENROUTER_FALLBACK_MODELS, comma
// separated, for swapping in different free slugs without a code change).
// Deduplicated in case the primary happens to also appear in the fallback
// list.
function getOpenRouterModelChain(): string[] {
  const primary = getOpenRouterModel();
  const fallbackEnv = process.env.OPENROUTER_FALLBACK_MODELS;
  const fallbacks = fallbackEnv
    ? fallbackEnv.split(',').map((m) => m.trim()).filter(Boolean)
    : DEFAULT_FALLBACK_MODELS;
  return Array.from(new Set([primary, ...fallbacks]));
}

interface ProviderAttempt {
  endpoint: string;
  apiKey: string;
  model: string;
  provider: string;
}

// Builds the full ordered list of (endpoint, key, model) attempts across
// *both* providers: Experiential Labs first (the primary), then every
// OpenRouter model (primary + fallbacks) as the fallback chain if
// Experiential Labs fails. Each provider is skipped entirely if its API key
// isn't configured, so setting only one of the two envs still works.
function getProviderChain(): ProviderAttempt[] {
  const attempts: ProviderAttempt[] = [];

  const explabsKey = process.env.EXPLABS_API_KEY;
  if (explabsKey) {
    attempts.push({ endpoint: EXPLABS_ENDPOINT, apiKey: explabsKey, model: getExplabsModel(), provider: 'Experiential Labs' });
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    for (const model of getOpenRouterModelChain()) {
      attempts.push({ endpoint: OPENROUTER_ENDPOINT, apiKey: openRouterKey, model, provider: 'OpenRouter' });
    }
  }

  return attempts;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Shared style instruction appended to every system prompt that asks the
// model to write prose for end users (the AI search answer paragraph, the
// cron/refresh suggestion summaries). Free-tier models default to a
// recognizably "AI-written" register — em dashes, "it's not just X, it's
// Y" contrast framing, contradiction-then-resolution rhetoric, and
// rule-of-three (triad) lists. Called out explicitly here since generic
// "write naturally" instructions don't reliably suppress them.
export const NATURAL_WRITING_STYLE =
  'Writing style rules — follow ALL of these exactly. These are hard requirements, not style ' +
  'preferences:\n' +
  '- NEVER use an em dash (—), en dash (–), horizontal bar (―), minus sign (−), or a "--" double ' +
  'hyphen anywhere in your output, not even one. Use a period, comma, colon, or semicolon instead.\n' +
  '- NEVER use a "not just X, but Y" / "not only X, but also Y" / "it\'s not X, it\'s Y" contrast ' +
  'construction, in ANY phrasing or with ANY synonyms of "not"/"just"/"but". ' +
  'Example of what NOT to write: "This is not just a subsidy scheme, it\'s a safety net." ' +
  'Instead write the plain, single statement directly: "This is a safety net that helps cover costs."\n' +
  '- Do not set up a contradiction and then resolve it (e.g. "You might think X. But actually Y."). ' +
  'State the fact directly instead of first stating something false or misleading and then correcting it.\n' +
  '- Do not use rule-of-three lists or triads (three examples/adjectives in a row) purely for ' +
  'rhetorical effect; only list items when each one is actually necessary.\n' +
  '- Keep sentence structure simple and direct, not artificially layered or symmetrical.\n' +
  '- Avoid stock phrases like "in today\'s world", "it is important to note", "boasts", or "delve into".\n' +
  'Before answering, mentally check your draft against this list and rewrite any sentence that ' +
  'violates a rule above.';

// Matches a "not only A, but (also) B" contrast construction and strips the
// setup clause down to just B. Requires a literal "but" so this never fires
// on an ordinary negative sentence like "did not act, and citizens
// suffered" — the mandatory "just/only/merely/simply" right after "not",
// plus the mandatory "but", keep this narrowly scoped to the actual
// rhetorical pattern rather than any comma-separated "not X" clause.
const CONTRAST_BUT_RE =
  /\bnot\s+(?:just|only|merely|simply)\s+[^,;.:]+[,;]\s*but\s+(?:also\s+)?/gi;

// Matches the repeated-subject form "it's not just A, it's B" (no "but"
// needed) and collapses it to "it's B", keeping the surviving subject intact
// so the result stays a complete sentence rather than losing its subject.
// Mandatory subject phrases on both sides keep this from matching generic
// negative sentences that happen to contain a comma.
const CONTRAST_SUBJECT_RE =
  /\b(it'?s|it is|this is|that'?s|that is|these are|those are)\s+not\s+(?:just|only|merely|simply)\s+[^,;.:]+[,;]\s*(?:but\s+)?(it'?s|it is|this is|that'?s|that is|these are|those are)\s+/gi;

// Strips characters/patterns the model occasionally emits despite the
// NATURAL_WRITING_STYLE instruction above (em/en dashes and "not X, but Y"
// contrast framing being the two most common offenders on the free-tier
// model this app uses), as a safety net so they never reach the UI even if
// a given completion ignores the system prompt.
export function stripAiTells(text: string): string {
  let out = text
    // Em/en dash (and less common dash-like unicode chars) used as a clause
    // separator (has surrounding whitespace, the overwhelmingly common
    // case): normalize to a comma.
    .replace(/\s+[—–―−]\s+/g, ', ')
    // Any remaining em/en/other dash (e.g. glued directly to adjacent
    // words): normalize to a plain hyphen.
    .replace(/[—–―−]/g, '-')
    // A "--" double-hyphen used in place of an em dash.
    .replace(/\s*--\s*/g, ', ');

  // Collapse "not just X, but Y" / "it's not X, it's Y" style contrast
  // setups down to the plain payload clause Y, since free-tier models keep
  // reaching for this construction despite being told not to. Conservative
  // by design: only fires when the pattern is unambiguous, and any partial
  // miss still leaves grammatical (if imperfect) text rather than garbage.
  out = out.replace(CONTRAST_SUBJECT_RE, (_m, _s1, s2) => `${s2} `);
  out = out.replace(CONTRAST_BUT_RE, '');

  out = out
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
    // Re-capitalize the start of the string and of any sentence that now
    // begins mid-clause after a contrast setup was stripped out.
    .replace(/(^|[.!?]\s+)([a-z])/g, (_m, lead, letter) => lead + letter.toUpperCase());

  return out;
}

// Per-attempt request timeout, capped by whatever time is left in the total
// budget below (see the loop). 30s gives a real, currently-loading model
// plenty of room to finish, without letting one stuck attempt burn the
// entire request budget and leave zero time for the fallback models above
// to get a turn.
const REQUEST_TIMEOUT_MS = 30_000;

// Total wall-clock budget for trying the whole model chain (primary +
// fallbacks) in one logical request. Kept a few seconds under Vercel
// Hobby's hard 60s-per-invocation ceiling (see `maxDuration` on the calling
// routes) so this module always returns control to the caller before the
// platform itself would kill the function — that platform-level kill is
// what caused the fallback message to fire with no useful error attached in
// the first place.
const TOTAL_BUDGET_MS = 55_000;

// Below this much remaining budget there isn't enough time left for
// another attempt to plausibly succeed, so stop trying rather than start
// (and immediately abort) one more doomed request.
const MIN_ATTEMPT_MS = 3_000;

// Calls the chat completion endpoint and returns the raw assistant text.
// Tries each model in getOpenRouterModelChain() in order (primary first,
// then fallbacks) and returns the first one that succeeds. This is
// deliberately model-diversity-based rather than same-model-retry-based:
// live testing confirmed the actual failure mode here is OpenRouter
// returning an immediate 429 because one specific free model's shared pool
// is temporarily out of capacity — retrying the *same* model just gets the
// same 429 again, but a different free model has its own independent pool
// and often succeeds right away. A 404 (the model slug itself was
// deprecated/renamed) is treated the same way: skip to the next model
// rather than burning the timeout waiting on a request that can never
// succeed.
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const attempts = getProviderChain();
  if (attempts.length === 0) {
    throw new Error('No LLM provider configured: set OPENROUTER_API_KEY and/or EXPLABS_API_KEY');
  }

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError: Error | null = null;

  for (const { endpoint, apiKey, model, provider } of attempts) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;
    const attemptTimeout = Math.min(remaining, REQUEST_TIMEOUT_MS);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), attemptTimeout);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`${provider} request failed for ${model} (${res.status}): ${text}`);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error(`${provider} response missing message content for ${model}`);
      }
      return content;
    } catch (err) {
      lastError =
        err instanceof Error
          ? err.name === 'AbortError'
            ? new Error(`${provider} request to ${model} timed out after ${attemptTimeout}ms`)
            : err
          : new Error(String(err));
      // Move on to the next model/provider in the chain immediately — no
      // backoff delay here. A 429 means the pool is out of capacity right
      // now, not that it'll clear in the next few hundred milliseconds, so
      // waiting before trying a *different* model/provider would only waste
      // budget.
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError ?? new Error('LLM request failed');
}

// Calls the chat completion endpoint and parses the assistant's reply as
// JSON. Throws if the reply isn't valid JSON (some free models occasionally
// wrap JSON in markdown fences despite instructions — this strips those).
export async function chatJSON<T = unknown>(messages: ChatMessage[]): Promise<T> {
  const raw = await chatCompletion(messages);
  let cleaned = raw
    .trim()
    // Some reasoning models emit a <think>...</think> block before the
    // actual answer despite instructions not to — strip it if present.
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  // If there's still leading/trailing prose around the JSON object, grab
  // just the outermost {...} span as a last resort.
  if (!cleaned.startsWith('{')) {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      cleaned = cleaned.slice(start, end + 1);
    }
  }
  return JSON.parse(cleaned) as T;
}
