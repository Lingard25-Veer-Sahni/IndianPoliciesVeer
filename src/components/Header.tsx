import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const t = useTranslations('nav');

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-navy">{t('siteName')}</span>
            <span className="hidden text-xs text-gray-500 sm:inline">
              {t('tagline')}
            </span>
          </Link>
        </div>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/" className="text-gray-700 hover:text-navy">
            {t('home')}
          </Link>
          <Link href="/policies" className="text-gray-700 hover:text-navy">
            {t('browse')}
          </Link>
          <Link href="/state-policies" className="text-gray-700 hover:text-navy">
            {t('byState')}
          </Link>
          <Link href="/ai-search" className="text-gray-700 hover:text-navy">
            {t('aiSearch')}
          </Link>
          <Link href="/about" className="text-gray-700 hover:text-navy">
            {t('about')}
          </Link>
          <Link href="/disclaimer" className="text-gray-700 hover:text-navy">
            {t('disclaimer')}
          </Link>
          <Link href="/privacy" className="text-gray-700 hover:text-navy">
            {t('privacy')}
          </Link>
          <Link href="/terms" className="text-gray-700 hover:text-navy">
            {t('terms')}
          </Link>
          <LanguageSwitcher />
        </nav>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-saffron via-white to-indiagreen" />
    </header>
  );
}
