'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import GuideIcon from '@/components/GuideIcon';
import { OPEN_GUIDE_EVENT } from '@/components/GuideWidget';

export default function AboutPage() {
  const t = useTranslations('about');
  const nav = useTranslations('nav');

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-ink dark:text-cream-50">{t('title')}</h1>

      <div className="card-warm mt-8 flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
        <GuideIcon className="h-16 w-16 flex-shrink-0" />
        <div>
          <p className="leading-relaxed text-ink-700 dark:text-cream-100">{t('onePara')}</p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(OPEN_GUIDE_EVENT))}
            className="btn-primary mt-4"
          >
            {t('meetGuide')}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Link
          href="/disclaimer"
          className="font-medium text-teal-700 underline hover:no-underline dark:text-teal-100"
        >
          {nav('disclaimer')}
        </Link>
        <Link
          href="/privacy"
          className="font-medium text-teal-700 underline hover:no-underline dark:text-teal-100"
        >
          {nav('privacy')}
        </Link>
        <Link
          href="/terms"
          className="font-medium text-teal-700 underline hover:no-underline dark:text-teal-100"
        >
          {nav('terms')}
        </Link>
      </div>

      <p className="mt-6 text-sm text-ink-500 dark:text-cream-200/70">{t('contact')}</p>
    </div>
  );
}
