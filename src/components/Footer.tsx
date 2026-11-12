'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { resetTermsAcknowledgement, resetGuideOnboarding } from '@/lib/consent';

export default function Footer() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');

  return (
    <footer className="border-t border-ink/10 bg-cream-50 dark:border-white/10 dark:bg-ink/95">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-500 dark:text-cream-200/70">
        <p className="font-medium text-ink-700 dark:text-cream-100">{t('rights')}</p>
        <p className="mt-1 max-w-2xl">{t('disclaimerShort')}</p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/about" className="hover:text-teal-700 dark:hover:text-teal-100">
            {nav('about')}
          </Link>
          <Link href="/disclaimer" className="hover:text-teal-700 dark:hover:text-teal-100">
            {nav('disclaimer')}
          </Link>
          <Link href="/privacy" className="hover:text-teal-700 dark:hover:text-teal-100">
            {nav('privacy')}
          </Link>
          <Link href="/terms" className="hover:text-teal-700 dark:hover:text-teal-100">
            {nav('terms')}
          </Link>
          <button
            type="button"
            onClick={() => {
              resetTermsAcknowledgement();
              resetGuideOnboarding();
              window.location.reload();
            }}
            className="underline hover:text-teal-700 hover:no-underline dark:hover:text-teal-100"
          >
            {t('reviewPrivacyChoices')}
          </button>
        </div>
        <p className="mt-6 text-xs text-ink-500/70 dark:text-cream-200/50">
          © {new Date().getFullYear()} {nav('siteName')}
        </p>
      </div>
    </footer>
  );
}
