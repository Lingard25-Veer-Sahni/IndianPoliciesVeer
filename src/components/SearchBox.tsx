'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { createSearchIndex, search } from '@/lib/search';
import type { Locale } from '@/i18n/routing';

// A prominent, Google/ChatGPT-style search box: type a query (an
// abbreviation like "MGNREGA", a plain phrase like "guaranteed labour", or
// even a typo) and get instant, ranked suggestions without leaving the
// homepage, plus a link through to the full results page.
export default function SearchBox({ locale }: { locale: string }) {
  const t = useTranslations('search');
  const tc = useTranslations('categories');
  const router = useRouter();
  const loc = locale as Locale;

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fuse = useMemo(() => createSearchIndex(loc), [loc]);

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];
    return search(fuse, trimmed).slice(0, 5).map((r) => r.item.policy);
  }, [query, fuse]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const goToResults = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    router.push(`/policies?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div ref={containerRef} className="relative mx-auto mt-8 max-w-xl text-left">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToResults();
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t('placeholder')}
          className="w-full rounded-full border border-ink/15 bg-white px-5 py-3 text-sm text-ink shadow-warm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal dark:border-white/15 dark:bg-ink/60 dark:text-cream-50 dark:placeholder:text-cream-200/40"
        />
      </form>

      {open && results.length > 0 && (
        <div className="absolute z-10 mt-2 w-full rounded-lg border border-ink/10 bg-white p-2 text-left shadow-warm-lg dark:border-white/10 dark:bg-ink">
          {results.map((p) => {
            const content = p.content[loc];
            return (
              <button
                key={p.slug}
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`/policies/${p.slug}`);
                }}
                className="block w-full rounded-md px-3 py-2 text-left hover:bg-cream-100 dark:hover:bg-white/5"
              >
                <span className="block text-sm font-medium text-ink dark:text-cream-50">
                  {content.title}
                </span>
                <span className="block text-xs text-ink-500 dark:text-cream-200/70">
                  {tc(p.category)}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={goToResults}
            className="mt-1 block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-teal-700 hover:bg-cream-100 dark:text-teal-100 dark:hover:bg-white/5"
          >
            {t('viewAllResults', { query })}
          </button>
        </div>
      )}
    </div>
  );
}
