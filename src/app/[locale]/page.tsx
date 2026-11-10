import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { policies } from '@/data/policies';
import PolicyCard from '@/components/PolicyCard';
import SearchBox from '@/components/SearchBox';

export default function HomePage() {
  const t = useTranslations('home');
  const locale = useLocale();

  const features = [1, 2, 3, 4].map((n) => ({
    title: t(`feature${n}Title` as 'feature1Title'),
    desc: t(`feature${n}Desc` as 'feature1Desc'),
  }));

  return (
    <div>
      <section className="bg-gradient-to-b from-navy/5 to-white">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-navy sm:text-4xl">
            {t('heroTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            {t('heroSubtitle')}
          </p>
          <SearchBox locale={locale} />
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/policies"
              className="rounded-md bg-navy px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
            >
              {t('ctaBrowse')}
            </Link>
            <Link
              href="/about"
              className="rounded-md border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {t('ctaAbout')}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-gray-900">
          {t('featuresTitle')}
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
              <h3 className="font-semibold text-navy">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">{t('browseTeaser')}</h2>
          <Link href="/policies" className="text-sm font-medium text-navy hover:underline">
            {t('ctaBrowse')} →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {policies.slice(0, 3).map((p) => (
            <PolicyCard key={p.slug} policy={p} locale={locale} />
          ))}
        </div>
      </section>
    </div>
  );
}
