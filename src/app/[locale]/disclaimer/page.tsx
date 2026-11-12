import { useTranslations } from 'next-intl';

export default function DisclaimerPage() {
  const t = useTranslations('disclaimer');

  const sections = [
    ['nonAffiliationTitle', 'nonAffiliation'],
    ['notLegalAdviceTitle', 'notLegalAdvice'],
    ['neutralityTitle', 'neutrality'],
    ['translationTitle', 'translation'],
    ['sourcesTitle', 'sources'],
    ['noWarrantyTitle', 'noWarranty'],
    ['ipTitle', 'ip'],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-ink dark:text-cream-50">{t('title')}</h1>
      <p className="mt-2 text-ink-500 dark:text-cream-200/70">{t('intro')}</p>
      <div className="mt-8 space-y-8">
        {sections.map(([titleKey, bodyKey]) => (
          <section
            key={titleKey}
            className="rounded-lg border border-ink/10 bg-cream-50 p-5 dark:border-white/10 dark:bg-ink/60"
          >
            <h2 className="text-lg font-semibold text-ink dark:text-cream-50">{t(titleKey)}</h2>
            <p className="mt-2 leading-relaxed text-ink-700 dark:text-cream-100">{t(bodyKey)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
