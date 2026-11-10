import { Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import StateLookup from '@/components/StateLookup';

export default function StatePoliciesPage() {
  const t = useTranslations('statePolicies');
  const locale = useLocale();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-gray-600">{t('subtitle')}</p>
      <div className="mt-8">
        <Suspense fallback={null}>
          <StateLookup locale={locale} />
        </Suspense>
      </div>
    </div>
  );
}
