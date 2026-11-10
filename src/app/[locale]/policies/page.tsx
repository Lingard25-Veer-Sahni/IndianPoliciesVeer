import { Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import PolicyBrowser from '@/components/PolicyBrowser';
import { getLastUpdated } from '@/data/updates';

export default function PoliciesPage() {
  const t = useTranslations('browse');
  const locale = useLocale();
  const lastUpdated = getLastUpdated();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-gray-600">{t('subtitle')}</p>
      {lastUpdated && (
        <p className="mt-1 text-sm text-gray-400">
          {t('lastUpdated', {
            date: new Date(lastUpdated.date).toLocaleDateString(locale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          })}
        </p>
      )}
      <div className="mt-8">
        <Suspense fallback={null}>
          <PolicyBrowser locale={locale} />
        </Suspense>
      </div>
    </div>
  );
}
