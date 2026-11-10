'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { indianStates } from '@/data/states';
import type { Locale } from '@/i18n/routing';
import TextToSpeech from '@/components/TextToSpeech';

interface AiSearchResult {
  slug: string;
  title: string;
  reason: string | null;
}

// A live result from the Vaquill Indian legislation API (see
// src/lib/vaquill.ts and the `liveResults` field on CachedSearchResponse in
// src/lib/search-cache.ts). Unlike AiSearchResult above, these have no
// internal /policies/[slug] page — they're rendered with a link out to
// their original source (sourceUrl/pdfUrl) instead.
interface LiveActResult {
  actId: string;
  title: string;
  sectionNumber: string | null;
  sectionTitle: string | null;
  citation: string;
  content: string;
  sourceUrl: string | null;
  pdfUrl: string | null;
}

// How many characters to reveal per tick, and the tick interval — tuned so
// a typical 4-7 sentence paragraph (roughly 400-700 chars) finishes typing
// in well under 2 seconds, i.e. fast but still visibly "typed".
const TYPE_CHARS_PER_TICK = 4;
const TYPE_TICK_MS = 12;

// The AI-written answer paragraph is temporarily hidden from the UI (the
// underlying search/ranking still runs the same as before, and the related
// policy results below still show up — only the prose paragraph itself is
// suppressed). Flip back to true to re-enable it once ready.
const SHOW_AI_ANSWER = false;

export default function AiSearchPage() {
  const t = useTranslations('aiSearch');
  const locale = useLocale();

  const [query, setQuery] = useState('');
  const [stateSlug, setStateSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [answerDone, setAnswerDone] = useState(false);
  const [results, setResults] = useState<AiSearchResult[]>([]);
  const [stateResults, setStateResults] = useState<AiSearchResult[]>([]);
  const [liveResults, setLiveResults] = useState<LiveActResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const typeTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const sortedStates = useMemo(
    () =>
      [...indianStates].sort((a, b) =>
        a.name[locale as Locale].localeCompare(b.name[locale as Locale], locale)
      ),
    [locale]
  );
  const selectedStateName = useMemo(
    () => sortedStates.find((s) => s.slug === stateSlug)?.name[locale as Locale] ?? '',
    [sortedStates, stateSlug, locale]
  );

  // Types the answer paragraph out quickly instead of showing it instantly.
  // Skipped entirely while SHOW_AI_ANSWER is false since there's nothing to
  // type out — answerDone stays true so results/stateResults (which used
  // to wait for the typing animation to finish) render immediately.
  useEffect(() => {
    if (!SHOW_AI_ANSWER) {
      setTypedAnswer('');
      setAnswerDone(true);
      return;
    }
    if (typeTimer.current) {
      clearInterval(typeTimer.current);
      typeTimer.current = null;
    }
    if (!answer) {
      setTypedAnswer('');
      setAnswerDone(!answer ? true : false);
      return;
    }
    setTypedAnswer('');
    setAnswerDone(false);
    let i = 0;
    typeTimer.current = setInterval(() => {
      i += TYPE_CHARS_PER_TICK;
      if (i >= answer.length) {
        setTypedAnswer(answer);
        setAnswerDone(true);
        if (typeTimer.current) clearInterval(typeTimer.current);
      } else {
        setTypedAnswer(answer.slice(0, i));
      }
    }, TYPE_TICK_MS);
    return () => {
      if (typeTimer.current) clearInterval(typeTimer.current);
    };
  }, [answer]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setSubmitted(true);
    setError(null);
    setAnswer(null);
    setTypedAnswer('');
    setAnswerDone(false);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed, locale, state: stateSlug || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? 'Search failed');
      }
      setResults(data.results ?? []);
      setStateResults(data.stateResults ?? []);
      setLiveResults(data.liveResults ?? []);
      setAiPowered(Boolean(data.aiPowered));
      setAnswer(data.answer ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResults([]);
      setStateResults([]);
      setLiveResults([]);
    } finally {
      setLoading(false);
    }
  }

  const showResults =
    !loading && !error && results.length > 0 && (!SHOW_AI_ANSWER || !answer || answerDone);
  const showStateResults =
    !loading && !error && stateSlug && (!SHOW_AI_ANSWER || !answer || answerDone);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-gray-600">{t('description')}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('placeholder')}
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex flex-1 flex-col gap-1 text-sm sm:max-w-xs">
            <span className="font-medium text-gray-700">{t('stateLabel')}</span>
            <select
              value={stateSlug}
              onChange={(e) => setStateSlug(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            >
              <option value="">{t('statePlaceholder')}</option>
              {sortedStates.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name[locale as Locale]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-full bg-navy px-6 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
          >
            {loading ? t('searching') : t('submit')}
          </button>
        </div>
      </form>

      <div className="mt-8">
        {loading && (
          <div className="ai-scan-track rounded-xl border border-navy/10 bg-white px-5 py-6">
            <div className="flex items-center gap-4">
              <span className="relative flex h-9 w-9 items-center justify-center">
                <span className="ai-scan-ring absolute inset-0 rounded-full border-2 border-navy/40" />
                <span className="relative flex h-3 w-3 items-center justify-center rounded-full bg-navy" />
              </span>
              <div>
                <p className="text-sm font-medium text-navy">{t('searching')}</p>
                <div className="mt-1 flex items-center gap-1">
                  <span className="ai-scan-dot h-1.5 w-1.5 rounded-full bg-navy/60" />
                  <span className="ai-scan-dot h-1.5 w-1.5 rounded-full bg-navy/60" />
                  <span className="ai-scan-dot h-1.5 w-1.5 rounded-full bg-navy/60" />
                </div>
              </div>
            </div>
            <div className="ai-scan-beam" />
          </div>
        )}

        {!loading && error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {t('error')}
          </p>
        )}

        {!loading &&
          !error &&
          submitted &&
          results.length === 0 &&
          (!SHOW_AI_ANSWER || !answer) && <p className="text-gray-500">{t('empty')}</p>}

        {SHOW_AI_ANSWER && !loading && !error && answer && (
          <div className="rounded-xl border border-navy/15 bg-navy/[0.03] p-5">
            <p className="whitespace-pre-line leading-relaxed text-gray-800">
              {typedAnswer}
              {!answerDone && <span className="ai-caret h-4 align-middle" />}
            </p>
            {answerDone && (
              <div className="mt-4">
                <TextToSpeech text={answer} />
              </div>
            )}
          </div>
        )}

        {showResults && (
          <div className="mt-6 space-y-4 animate-[fadeIn_0.3s_ease-in]">
            {!aiPowered && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                {t('fallbackNotice')}
              </p>
            )}
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t('relevantLaws')}
            </p>
            {results.map((r) => (
              <Link
                key={r.slug}
                href={`/policies/${r.slug}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-navy hover:shadow-md"
              >
                <h2 className="text-base font-semibold text-navy">{r.title}</h2>
                {r.reason && <p className="mt-1 text-sm text-gray-600">{r.reason}</p>}
              </Link>
            ))}
          </div>
        )}

        {showStateResults && (
          <div className="mt-6 space-y-4 animate-[fadeIn_0.3s_ease-in]">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t('stateResultsHeading', { state: selectedStateName })}
            </p>
            {stateResults.length === 0 && liveResults.length === 0 ? (
              <p className="text-sm text-gray-500">{t('noStateResults', { state: selectedStateName })}</p>
            ) : (
              stateResults.map((r) => (
                <Link
                  key={r.slug}
                  href={`/policies/${r.slug}`}
                  className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-navy hover:shadow-md"
                >
                  <h2 className="text-base font-semibold text-navy">{r.title}</h2>
                  {r.reason && <p className="mt-1 text-sm text-gray-600">{r.reason}</p>}
                </Link>
              ))
            )}
          </div>
        )}

        {showStateResults && liveResults.length > 0 && (
          <div className="mt-6 space-y-4 animate-[fadeIn_0.3s_ease-in]">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t('liveResultsHeading', { state: selectedStateName })}
            </p>
            {liveResults.map((r) => (
              <a
                key={r.actId + (r.sectionNumber ?? '')}
                href={r.sourceUrl ?? r.pdfUrl ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-navy hover:shadow-md"
              >
                <h2 className="text-base font-semibold text-navy">
                  {r.title}
                  {r.sectionNumber ? ` — ${t('section')} ${r.sectionNumber}` : ''}
                </h2>
                {r.sectionTitle && <p className="mt-1 text-sm font-medium text-gray-700">{r.sectionTitle}</p>}
                <p className="mt-1 line-clamp-3 text-sm text-gray-600">{r.content}</p>
                <p className="mt-2 text-xs text-gray-400">{r.citation}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
