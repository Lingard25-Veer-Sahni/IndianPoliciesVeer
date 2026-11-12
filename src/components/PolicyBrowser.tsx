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
  // Multiple categories can be active at once (e.g. a homepage topic card
  // like "Housing & consumer rights" spans two real PolicyCategory values),
  // so this is a Set rather than a single value. An empty set means "all".
  const [activeCategories, setActiveCategories] = useState<Set<PolicyCategory>>(new Set());

  // Pick up a query and/or category filter passed in via the URL — e.g. the
  // homepage search box linking to /policies?q=mgnrega, or a homepage topic
  // card linking to /policies?category=health,education — on load and
  // whenever either changes.
  useEffect(() => {
    const fromUrl = searchParams.get('q');
    if (fromUrl !== null) setQuery(fromUrl);

    const categoryParam = searchParams.get('category');
    if (categoryParam !== null) {
      const valid = new Set(categories);
      const parsed = categoryParam
        .split(',')
        .map((c) => c.trim())
        .filter((c): c is PolicyCategory => valid.has(c as PolicyCategory));
      setActiveCategories(new Set(parsed));
    }
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
    return base.filter((p) => activeCategories.size === 0 || activeCategories.has(p.category));
  }, [query, activeCategories, fuse]);

  const category: PolicyCategory | 'all' =
    activeCategories.size === 1 ? [...activeCategories][0] : 'all';

  function handleCategoryChange(value: PolicyCategory | 'all') {
    setActiveCategories(value === 'all' ? new Set() : new Set([value]));
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-full border border-ink/15 bg-white px-4 py-2 text-sm text-ink shadow-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal dark:border-white/15 dark:bg-ink/60 dark:text-cream-50 dark:placeholder:text-cream-200/40 sm:max-w-sm"
        />
        <select
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value as PolicyCategory | 'all')}
          className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm text-ink dark:border-white/15 dark:bg-ink/60 dark:text-cream-50"
          aria-label={t('categoryAll')}
        >
          <option value="all">{t('categoryAll')}</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {tc(c)}
            </option>
          ))}
        </select>
        <span className="text-sm text-ink-500 dark:text-cream-200/70">
          {t('resultsCount', { count: filtered.length })}
        </span>
      </div>

      {activeCategories.size > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {[...activeCategories].map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 dark:bg-teal-700/30 dark:text-teal-100"
            >
              {tc(c)}
            </span>
          ))}
          <button
            type="button"
            onClick={() => setActiveCategories(new Set())}
            className="text-xs font-medium text-teal-700 underline hover:no-underline dark:text-teal-100"
          >
            {t('categoryAll')}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-ink-500 dark:text-cream-200/70">{t('noResults')}</p>
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
