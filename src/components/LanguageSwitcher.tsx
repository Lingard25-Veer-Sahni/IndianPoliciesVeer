'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, localeNames, type Locale } from '@/i18n/routing';
import { useParams } from 'next/navigation';

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(e) => {
          const nextLocale = e.target.value as Locale;
          router.replace(
            // @ts-expect-error -- params may include a dynamic slug
            { pathname, params },
            { locale: nextLocale }
          );
        }}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-navy"
        aria-label="Select language"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
