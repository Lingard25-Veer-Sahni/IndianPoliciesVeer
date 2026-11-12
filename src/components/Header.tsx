import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LanguageSwitcher from './LanguageSwitcher';
import LogoMark from './Logo';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const t = useTranslations('nav');

  return (
    <header className="border-b border-ink/10 bg-cream-50/90 backdrop-blur dark:border-white/10 dark:bg-ink/95">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <LogoMark />
            <span className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-ink dark:text-cream-50">{t('siteName')}</span>
              <span className="hidden text-xs text-ink-500 dark:text-cream-200/70 sm:inline">
                {t('tagline')}
              </span>
            </span>
          </Link>
        </div>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/" className="text-ink-700 hover:text-teal-700 dark:text-cream-100 dark:hover:text-teal-100">
            {t('home')}
          </Link>
          <Link
            href="/policies"
            className="text-ink-700 hover:text-teal-700 dark:text-cream-100 dark:hover:text-teal-100"
          >
            {t('browse')}
          </Link>
          <Link
            href="/state-policies"
            className="text-ink-700 hover:text-teal-700 dark:text-cream-100 dark:hover:text-teal-100"
          >
            {t('byState')}
          </Link>
          <Link
            href="/ai-search"
            className="text-ink-700 hover:text-teal-700 dark:text-cream-100 dark:hover:text-teal-100"
          >
            {t('aiSearch')}
          </Link>
          <Link
            href="/about"
            className="text-ink-700 hover:text-teal-700 dark:text-cream-100 dark:hover:text-teal-100"
          >
            {t('about')}
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
        </nav>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-coral via-saffron to-teal" />
    </header>
  );
}
