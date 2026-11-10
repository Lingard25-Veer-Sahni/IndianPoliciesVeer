import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function Footer() {
  const t = useTranslations('footer');
  const nav = useTranslations('nav');

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-600">
        <p className="font-medium text-gray-800">{t('rights')}</p>
        <p className="mt-1 max-w-2xl">{t('disclaimerShort')}</p>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/about" className="hover:text-navy">
            {nav('about')}
          </Link>
          <Link href="/disclaimer" className="hover:text-navy">
            {nav('disclaimer')}
          </Link>
          <Link href="/privacy" className="hover:text-navy">
            {nav('privacy')}
          </Link>
        </div>
        <p className="mt-6 text-xs text-gray-400">
          © {new Date().getFullYear()} {nav('siteName')}
        </p>
      </div>
    </footer>
  );
}
