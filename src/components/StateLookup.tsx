'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { policies, type Policy } from '@/data/policies';
import { indianStates } from '@/data/states';
import { createSearchIndex, search } from '@/lib/search';
import type { Locale } from '@/i18n/routing';
import PolicyCard from './PolicyCard';

// A policy applies in a given state if it's a central law (applies
// everywhere in India) or if it's a state law that explicitly lists that
// state. See the `applicability`/`states` fields on Policy in
// src/data/policies.ts.
function appliesInState(policy: Policy, stateSlug: string): boolean {
  if (policy.applicability !== 'state') return true;
  return policy.states?.includes(stateSlug) ?? false;
}

// State-specific law lookup: a visitor picks their state, optionally types a
// question, and sees the policies that apply there. Today every entry in
// policies.ts is a central law (so results are the same regardless of state
// choice), but the filtering logic and UI are already wired up for
// state-specific laws to be added later — see Policy.applicability/states.
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

  const results = useMemo(() => {
    if (!stateSlug) return [];
    const inState = policies.filter((p) => appliesInState(p, stateSlug));
    const trimmed = query.trim();
    if (!trimmed) return inState;
    const inStateSlugs = new Set(inState.map((p) => p.slug));
    return search(fuse, trimmed)
      .map((r) => r.item.policy)
      .filter((p) => inStateSlugs.has(p.slug));
  }, [stateSlug, query, fuse]);

  return (
    <div>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="font-medium text-gray-700">{t('stateLabel')}</span>
          <select
            value={stateSlug}
            onChange={(e) => setStateSlug(e.target.value)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm"
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
          <span className="font-medium text-gray-700">{t('questionLabel')}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('questionPlaceholder')}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-navy px-5 py-2 text-sm font-medium text-white hover:bg-navy/90"
        >
          {t('submitButton')}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-500">{t('coverageNotice')}</p>

      {!stateSlug ? (
        <p className="mt-10 text-center text-gray-500">{t('selectStatePrompt')}</p>
      ) : results.length === 0 ? (
        <p className="mt-10 text-center text-gray-500">{t('noResults')}</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((p) => (
            <PolicyCard key={p.slug} policy={p} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
