import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Policy } from '@/data/policies';

export default function PolicyCard({ policy, locale }: { policy: Policy; locale: string }) {
  const t = useTranslations('browse');
  const tc = useTranslations('categories');
  const content = policy.content[locale as keyof typeof policy.content];

  return (
    <Link
      href={`/policies/${policy.slug}`}
      className="card-warm block p-5 transition hover:-translate-y-0.5 hover:shadow-warm-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-700/30 dark:text-teal-100">
          {tc(policy.category)}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-ink dark:text-cream-50">{content.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm text-ink-500 dark:text-cream-200/70">{content.summary}</p>
      <p className="mt-4 text-sm font-medium text-teal-700 dark:text-teal-100">{t('readMore')} →</p>
    </Link>
  );
}
