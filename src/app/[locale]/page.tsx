import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { policies } from '@/data/policies';
import PolicyCard from '@/components/PolicyCard';
import SearchBox from '@/components/SearchBox';
import HeroIllustration from '@/components/HeroIllustration';
import { topics, topicHref } from '@/lib/topics';

export default function HomePage() {
  const t = useTranslations('home');
  const locale = useLocale();

  return (
    <div>
      <section className="bg-gradient-to-b from-teal-50 to-cream dark:from-ink-700 dark:to-ink">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:py-20">
          <HeroIllustration />
          <h1 className="mt-6 text-3xl font-bold text-ink dark:text-cream-50 sm:text-4xl">
            {t('heroTitle')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-500 dark:text-cream-200/70">
            {t('heroSubtitle')}
          </p>
          <SearchBox locale={locale} />
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link href="/policies" className="btn-primary">
              {t('ctaBrowse')}
            </Link>
            <Link href="/state-policies" className="btn-secondary">
              {t('ctaState')}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-bold text-ink dark:text-cream-50">{t('topicsTitle')}</h2>
        <p className="mt-2 max-w-2xl text-ink-500 dark:text-cream-200/70">{t('topicsSubtitle')}</p>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={topicHref(topic)}
              className="card-warm group block p-5 transition hover:-translate-y-0.5 hover:shadow-warm-lg"
            >
              <h3 className="text-base font-semibold text-ink group-hover:text-teal-700 dark:text-cream-50 dark:group-hover:text-teal-100">
                {t(`topics.${topic.id}Title` as 'topics.welfareTitle')}
              </h3>
              <p className="mt-2 text-sm text-ink-500 dark:text-cream-200/70">
                {t(`topics.${topic.id}Desc` as 'topics.welfareDesc')}
              </p>
              <p className="mt-4 text-sm font-medium text-teal-700 dark:text-teal-100">{t('topicExplore')} →</p>
            </Link>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href="/policies" className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-100">
            {t('browseAll')} →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="card-warm flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink dark:text-cream-50">{t('stateTeaserTitle')}</h2>
            <p className="mt-1 max-w-xl text-sm text-ink-500 dark:text-cream-200/70">{t('stateTeaserDesc')}</p>
          </div>
          <Link href="/state-policies" className="btn-primary flex-shrink-0">
            {t('ctaState')}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-ink dark:text-cream-50">{t('browseTeaser')}</h2>
          <Link href="/policies" className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-100">
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
