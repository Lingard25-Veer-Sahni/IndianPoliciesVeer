'use client';

import { useMemo, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { categories, policies, type PolicyCategory } from '@/data/policies';
import { createSearchIndex, search } from '@/lib/search';
import type { Locale } from '@/i18n/routing';
import PolicyCard from './PolicyCard';

export default function PolicyBrowser({ locale }: { locale: string }) {
  const t = useTranslations('browse');
  const tc = useTranslations('categories');
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<PolicyCategory | 'all'>('all');

  // Pick up a query passed in via the URL — e.g. the homepage search box
  // linking to /policies?q=mgnrega — on load and whenever it changes.
  useEffect(() => {
    const fromUrl = searchParams.get('q');
    if (fromUrl !== null) setQuery(fromUrl);
  }, [searchParams]);

  const fuse = useMemo(() => createSearchIndex(locale as Locale), [locale]);

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    // A fuzzy, relevance-ranked search (tolerant of typos, matching on
    // aliases like "MGNREGA" or "guaranteed labour", and matching on
    // individual meaningful words so a full question like "how do I get
    // free hospital treatment" still finds the right policy) instead of a
    // plain substring filter — best matches first, same as a general
    // search engine.
    const base = trimmed ? search(fuse, trimmed).map((r) => r.item.policy) : policies;
    return base.filter((p) => category === 'all' || p.category === category);
  }, [query, category, fuse]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm sm:max-w-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as PolicyCategory | 'all')}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm"
        >
          <option value="all">{t('categoryAll')}</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {tc(c)}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-500">
          {t('resultsCount', { count: filtered.length })}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-gray-500">{t('noResults')}</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PolicyCard key={p.slug} policy={p} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
