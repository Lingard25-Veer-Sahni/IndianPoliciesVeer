import { useTranslations } from 'next-intl';

export default function TermsPage() {
  const t = useTranslations('terms');

  const sections = [
    ['acceptanceTitle', 'acceptance'],
    ['descriptionTitle', 'description'],
    ['noAdviceTitle', 'noAdvice'],
    ['accuracyTitle', 'accuracy'],
    ['liabilityTitle', 'liability'],
    ['userResponsibilitiesTitle', 'userResponsibilities'],
    ['ipTitle', 'ip'],
    ['changesTitle', 'changes'],
    ['governingLawTitle', 'governingLaw'],
    ['contactTitle', 'contact'],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mt-2 text-gray-600">{t('intro')}</p>
      <div className="mt-8 space-y-8">
        {sections.map(([titleKey, bodyKey]) => (
          <section key={titleKey} className="rounded-lg border border-gray-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-navy">{t(titleKey)}</h2>
            <p className="mt-2 leading-relaxed text-gray-700">{t(bodyKey)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
