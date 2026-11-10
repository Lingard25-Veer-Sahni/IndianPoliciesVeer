'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

interface ChangeDetail {
  id: string;
  type: 'add' | 'amend' | 'delete' | 'enacted';
  slug: string | null;
  title: string | null;
  summary: string | null;
  date: string;
  datePrecision: 'exact' | 'year';
}

const TYPE_STYLES: Record<ChangeDetail['type'], string> = {
  add: 'bg-indiagreen/10 text-indiagreen',
  amend: 'bg-amber-100 text-amber-700',
  delete: 'bg-red-100 text-red-700',
  enacted: 'bg-blue-100 text-blue-700',
};

const TYPE_LABEL_KEYS: Record<ChangeDetail['type'], string> = {
  add: 'typeAdd',
  amend: 'typeAmend',
  delete: 'typeDelete',
  enacted: 'typeEnacted',
};

export default function ChangeDetailPage() {
  const params = useParams<{ id: string }>();
  const locale = useLocale();
  const format = useFormatter();
  const t = useTranslations('changeDetail');
  const tRecentChanges = useTranslations('recentChanges');
  const tPolicy = useTranslations('policy');

  const [item, setItem] = useState<ChangeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    fetch(`/api/changes/${params.id}?locale=${locale}`)
      .then((res) => {
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setItem(data.item ?? null);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, locale]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="text-sm text-navy hover:underline">
        {t('back')}
      </Link>

      {loading && <p className="mt-6 text-gray-500">{tRecentChanges('loading')}</p>}

      {!loading && (notFound || !item) && <p className="mt-6 text-gray-500">{t('notFound')}</p>}

      {!loading && item && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[item.type]}`}
            >
              {tRecentChanges(TYPE_LABEL_KEYS[item.type])}
            </span>
            <span className="text-sm text-gray-500">
              {item.datePrecision === 'year'
                ? format.dateTime(new Date(item.date), { year: 'numeric' })
                : format.dateTime(new Date(item.date), { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>

          <h1 className="mt-3 text-3xl font-bold text-gray-900">{item.title}</h1>

          {item.summary && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900">{tPolicy('summaryTitle')}</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-gray-800">{item.summary}</p>
            </div>
          )}

          {item.slug && (
            <div className="mt-8">
              <Link
                href={`/policies/${item.slug}`}
                className="text-sm font-medium text-navy hover:underline"
              >
                {t('viewPolicy')}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
