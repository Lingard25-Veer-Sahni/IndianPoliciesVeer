import { getTranslations, getLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getPolicyBySlug, policies } from '@/data/policies';
import type { Locale } from '@/i18n/routing';
import TextToSpeech from '@/components/TextToSpeech';

export function generateStaticParams() {
  return policies.map((p) => ({ slug: p.slug }));
}

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;
  const policy = getPolicyBySlug(slug);
  if (!policy) notFound();

  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('policy');
  const tc = await getTranslations('categories');
  const content = policy.content[locale];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/policies" className="text-sm text-navy hover:underline dark:text-teal-100">
        {t('backToBrowse')}
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-medium text-navy dark:bg-teal-700/30 dark:text-teal-100">
          {tc(policy.category)}
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-bold text-ink dark:text-cream-50">{content.title}</h1>

      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm text-ink-500 dark:text-cream-200/70 sm:grid-cols-3">
        <div>
          <dt className="font-medium text-ink-500 dark:text-cream-200/70">{t('yearEnacted')}</dt>
          <dd>{policy.year}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-medium text-ink-500 dark:text-cream-200/70">{t('ministry')}</dt>
          <dd>{policy.ministry}</dd>
        </div>
      </dl>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-ink dark:text-cream-50">{t('summaryTitle')}</h2>
        <p className="mt-2 leading-relaxed text-ink-700 dark:text-cream-100">{content.summary}</p>
      </div>

      <div className="mt-6">
        <TextToSpeech text={`${content.title}. ${content.summary}`} />
      </div>

      <p className="mt-4 text-xs text-ink-500 dark:text-cream-200/50">{t('translationNotice')}</p>

      <div className="mt-8 rounded-lg border border-ink/10 bg-cream-50 p-4 dark:border-white/10 dark:bg-ink/60">
        <p className="text-sm font-medium text-ink-500 dark:text-cream-200/70">{t('officialSource')}</p>
        <p className="mt-1 text-sm text-ink-700 dark:text-cream-100">{policy.officialSourceName}</p>
        <a
          href={policy.officialSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm font-medium text-navy hover:underline dark:text-teal-100"
        >
          {t('visitSource')}
        </a>
      </div>
    </div>
  );
}
