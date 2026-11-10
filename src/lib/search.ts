import Fuse from 'fuse.js';
import { policies, type Policy } from '@/data/policies';
import type { Locale } from '@/i18n/routing';

export interface SearchEntry {
  policy: Policy;
  title: string;
  summary: string;
  keywords: string;
}

export function buildSearchEntries(locale: Locale): SearchEntry[] {
  return policies.map((policy) => {
    const content = policy.content[locale];
    return {
      policy,
      title: content.title,
      summary: content.summary,
      keywords: policy.keywords.join(' '),
    };
  });
}

// A forgiving, ranked search index — tolerant of typos and partial/alias
// matches (e.g. "guaranteed labor" vs "guaranteed labour", or "MGNREGA"
// vs the full Mahatma Gandhi National Rural Employment Guarantee Act
// title), and weighted so a hit on the title or a known keyword/alias
// ranks above a hit buried in the summary — similar to how a general
// search engine ranks results, rather than a plain substring filter.
export function createSearchIndex(locale: Locale) {
  const entries = buildSearchEntries(locale);
  return new Fuse(entries, {
    keys: [
      { name: 'keywords', weight: 0.45 },
      { name: 'title', weight: 0.4 },
      { name: 'summary', weight: 0.15 },
    ],
    threshold: 0.36,
    ignoreLocation: true,
    minMatchCharLength: 2,
    includeScore: true,
  });
}

// Common filler words that carry no search meaning on their own. Stripped
// out so a full natural-language question like "how do I get free
// hospital treatment for my family" reduces to its meaningful words
// ("free", "hospital", "treatment", "family") — the same words someone
// would type if they searched more tersely.
const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being',
  'i', 'me', 'my', 'mine', 'we', 'us', 'our', 'you', 'your', 'he', 'she',
  'it', 'they', 'them', 'their', 'this', 'that', 'these', 'those',
  'do', 'does', 'did', 'done', 'can', 'could', 'should', 'would', 'will',
  'shall', 'may', 'might', 'must',
  'to', 'of', 'for', 'in', 'on', 'at', 'by', 'with', 'about', 'from', 'as',
  'into', 'up', 'out', 'off',
  'and', 'or', 'but', 'if', 'so', 'than', 'then',
  'how', 'what', 'where', 'when', 'who', 'why', 'which',
  'get', 'give', 'need', 'want', 'help', 'please', 'tell', 'know', 'find',
  'looking', 'there', 'here', 'any', 'some', 'not', 'no',
]);

function tokenize(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

function meaningfulTokens(query: string): string[] {
  const tokens = tokenize(query);
  const meaningful = tokens.filter((t) => !STOPWORDS.has(t.toLowerCase()));
  return meaningful.length > 0 ? meaningful : tokens;
}

export interface RankedMatch {
  item: SearchEntry;
  score: number;
}

// Searches for a query the way a general search engine would rather than
// a single fuzzy phrase match: a full natural-language question ("how do
// I get free hospital treatment") is broken into its meaningful words
// ("free", "hospital", "treatment"), each word is fuzzy-matched
// independently (so typos still work), and policies are ranked first by
// how many distinct query words they matched, then by match quality. This
// means a policy matching 3 of the query's words always outranks one that
// only loosely matches 1, which a single combined fuzzy-phrase match does
// not reliably guarantee.
//
// Generic so other callers with a differently-shaped Fuse item (e.g. the
// AI search route's candidate rows, which aren't wrapped in a `.policy`
// like SearchEntry is) can reuse the exact same tokenized-ranking
// algorithm instead of falling back to a single naive `fuse.search(query)`
// call, which scores badly on multi-word queries where only one word
// matches a given item strongly (e.g. "gst rules" scoring the actual GST
// law far below several unrelated "... Rules, 2016" titles, since as one
// fuzzy phrase "gst rules" barely resembles "Goods and Services Tax"
// despite "gst" being an exact keyword match).
export function rankFuseByTokens<T>(
  fuse: Fuse<T>,
  query: string,
  getKey: (item: T) => string
): { item: T; score: number }[] {
  const tokens = meaningfulTokens(query);
  if (tokens.length === 0) return [];

  if (tokens.length === 1) {
    return fuse.search(tokens[0]).map((r) => ({ item: r.item, score: r.score ?? 1 }));
  }

  const itemsByKey = new Map<string, T>();
  const matchCount = new Map<string, number>();
  const bestScore = new Map<string, number>();

  for (const token of tokens) {
    for (const r of fuse.search(token)) {
      const key = getKey(r.item);
      const score = r.score ?? 1;
      itemsByKey.set(key, r.item);
      matchCount.set(key, (matchCount.get(key) ?? 0) + 1);
      if (!bestScore.has(key) || score < (bestScore.get(key) as number)) {
        bestScore.set(key, score);
      }
    }
  }

  return Array.from(itemsByKey.entries())
    .map(([key, item]) => ({
      item,
      score: bestScore.get(key) ?? 1,
      matches: matchCount.get(key) ?? 0,
    }))
    .sort((a, b) => b.matches - a.matches || a.score - b.score)
    .map(({ item, score }) => ({ item, score }));
}

export function search(fuse: Fuse<SearchEntry>, query: string): RankedMatch[] {
  return rankFuseByTokens(fuse, query, (item) => item.policy.slug);
}
