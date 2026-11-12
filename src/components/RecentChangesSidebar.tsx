'use client';

import { useEffect, useState } from 'react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface ChangeItem {
  id: string;
  type: 'add' | 'amend' | 'delete' | 'enacted';
  slug: string | null;
  title: string | null;
  date: string;
  datePrecision: 'exact' | 'year';
}

const TYPE_STYLES: Record<ChangeItem['type'], string> = {
  add: 'bg-indiagreen/10 text-indiagreen dark:bg-indiagreen/20 dark:text-teal-100',
  amend: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  enacted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
};

const TYPE_LABEL_KEYS: Record<ChangeItem['type'], string> = {
  add: 'typeAdd',
  amend: 'typeAmend',
  delete: 'typeDelete',
  enacted: 'typeEnacted',
};

export default function RecentChangesSidebar() {
  const t = useTranslations('recentChanges');
  const locale = useLocale();
  const format = useFormatter();
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/changes?limit=10&locale=${locale}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setChanges(data.changes ?? []);
      })
      .catch(() => {
        if (!cancelled) setChanges([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return (
    <aside className="w-full">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-cream-200/70">
        {t('title')}
      </h2>
      {loading ? (
        <p className="mt-2 text-xs text-ink-500/80 dark:text-cream-200/50">{t('loading')}</p>
      ) : changes.length === 0 ? (
        <p className="mt-2 text-xs text-ink-500/80 dark:text-cream-200/50">{t('empty')}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {changes.map((c) => (
            <li key={c.id} className="text-xs">
              <Link
                href={`/changes/${c.id}`}
                className="block rounded px-1 py-0.5 hover:bg-cream-100 hover:underline dark:hover:bg-white/5"
              >
                <span
                  className={`mr-1.5 inline-block rounded px-1.5 py-0.5 font-medium ${TYPE_STYLES[c.type]}`}
                >
                  {t(TYPE_LABEL_KEYS[c.type])}
                </span>
                <span className="text-ink-700 dark:text-cream-100">{c.title || c.slug}</span>
                <div className="mt-0.5 text-ink-500/80 dark:text-cream-200/50">
                  {c.datePrecision === 'year'
                    ? format.dateTime(new Date(c.date), { year: 'numeric' })
                    : format.dateTime(new Date(c.date), { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
