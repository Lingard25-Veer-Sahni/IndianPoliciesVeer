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
      className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-navy/30"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-navy/10 px-2.5 py-0.5 text-xs font-medium text-navy">
          {tc(policy.category)}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-gray-900">{content.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm text-gray-600">{content.summary}</p>
      <p className="mt-4 text-sm font-medium text-navy">{t('readMore')} →</p>
    </Link>
  );
}
