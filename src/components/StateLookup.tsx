'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { policies, type Policy } from '@/data/policies';
import { indianStates } from '@/data/states';
import { createSearchIndex, search } from '@/lib/search';
import type { Locale } from '@/i18n/routing';
import PolicyCard from './PolicyCard';
import IndiaPoliticalMap from './IndiaPoliticalMap';

// A policy applies in a given state if it's a central law (applies
// everywhere in India) or if it's a state law that explicitly lists that
// state. See the `applicability`/`states` fields on Policy in
// src/data/policies.ts.
export function appliesInState(policy: Policy, stateSlug: string): boolean {
  if (policy.applicability !== 'state') return true;
  return policy.states?.includes(stateSlug) ?? false;
}

// State-specific law lookup: a visitor picks their state (via the dropdown
// or the grid of state buttons below it, kept in sync both ways),
// optionally types a question, and sees the policies that apply there,
// split honestly into two groups — real state-scoped entries vs. central
// (nationwide) laws — rather than relabeling central policies as
// state-specific. See Policy.applicability/states in src/data/policies.ts.
export default function StateLookup({ locale }: { locale: string }) {
  const t = useTranslations('statePolicies');
  const loc = locale as Locale;

  const [stateSlug, setStateSlug] = useState('');
  const [query, setQuery] = useState('');

  const fuse = useMemo(() => createSearchIndex(loc), [loc]);

  const sortedStates = useMemo(
    () => [...indianStates].sort((a, b) => a.name[loc].localeCompare(b.name[loc], loc)),
    [loc]
  );

  const selectedStateName = sortedStates.find((s) => s.slug === stateSlug)?.name[loc] ?? '';

  const { stateSpecific, national } = useMemo(() => {
    if (!stateSlug) return { stateSpecific: [] as Policy[], national: [] as Policy[] };
    const inState = policies.filter((p) => appliesInState(p, stateSlug));
    const trimmed = query.trim();
    const matching = trimmed
      ? (() => {
          const slugs = new Set(search(fuse, trimmed).map((r) => r.item.policy.slug));
          return inState.filter((p) => slugs.has(p.slug));
        })()
      : inState;
    return {
      stateSpecific: matching.filter((p) => p.applicability === 'state'),
      national: matching.filter((p) => p.applicability !== 'state'),
    };
  }, [stateSlug, query, fuse]);

  return (
    <div>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-ink-700 dark:text-cream-100">{t('stateLabel')}</span>
          <select
            value={stateSlug}
            onChange={(e) => setStateSlug(e.target.value)}
            className="rounded-md border border-ink/15 bg-white px-4 py-2 text-sm dark:border-white/15 dark:bg-ink/60 dark:text-cream-50"
          >
            <option value="">{t('statePlaceholder')}</option>
            {sortedStates.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name[loc]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-ink-700 dark:text-cream-100">{t('questionLabel')}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('questionPlaceholder')}
            className="rounded-md border border-ink/15 bg-white px-4 py-2 text-sm dark:border-white/15 dark:bg-ink/60 dark:text-cream-50"
          />
        </label>
      </form>

      {/* Real clickable political map of India's states/UTs, kept in sync
          with the dropdown and the grid below via the same stateSlug state.
          See IndiaPoliticalMap.tsx / src/lib/india-map.ts for the boundary
          data's provenance and license caveat. */}
      <div className="mt-6 mx-auto max-w-sm">
        <IndiaPoliticalMap value={stateSlug} onSelect={setStateSlug} />
      </div>

      {/* Visual state picker — a labelled, accessible grid, serving both as
          a fallback if the map fails to load and as an accessible
          alternative for small territories that are hard to target on the
          map (e.g. Lakshadweep, Chandigarh) — kept in sync with the
          dropdown and the map above in all directions. */}
      <div className="mt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-cream-200/60">
          {t('gridLabel')}
        </p>
        <div
          className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
          role="group"
          aria-label={t('stateLabel')}
        >
          {sortedStates.map((s) => {
            const active = s.slug === stateSlug;
            return (
              <button
                key={s.slug}
                type="button"
                onClick={() => setStateSlug((cur) => (cur === s.slug ? '' : s.slug))}
                aria-pressed={active}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  active
                    ? 'border-teal-600 bg-teal-50 font-medium text-teal-700 dark:border-teal-100 dark:bg-teal-700/30 dark:text-teal-100'
                    : 'border-ink/10 bg-white text-ink-700 hover:border-teal-600/50 dark:border-white/10 dark:bg-ink/60 dark:text-cream-100 dark:hover:border-teal-100/50'
                }`}
              >
                {s.name[loc]}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-sm text-ink-500 dark:text-cream-200/60">{t('coverageNotice')}</p>

      {!stateSlug ? (
        <p className="mt-10 text-center text-ink-500 dark:text-cream-200/60">{t('selectStatePrompt')}</p>
      ) : (
        <div className="mt-8 space-y-10">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-cream-200/60">
              {t('stateSpecificHeading', { state: selectedStateName })}
            </h2>
            {stateSpecific.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500 dark:text-cream-200/60">
                {t('noStateSpecific', { state: selectedStateName })}
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {stateSpecific.map((p) => (
                  <PolicyCard key={p.slug} policy={p} locale={locale} />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-cream-200/60">
              {t('nationalHeading')}
            </h2>
            {national.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500 dark:text-cream-200/60">{t('noResults')}</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {national.map((p) => (
                  <PolicyCard key={p.slug} policy={p} locale={locale} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
