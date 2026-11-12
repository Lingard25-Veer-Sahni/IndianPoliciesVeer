'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getCurrentTheme, setTheme, type Theme } from '@/lib/theme';

// Manual light/dark toggle for the header. The actual class flip on <html>
// happens before hydration via the inline script in layout.tsx (see
// src/lib/theme.ts); this component just reflects/updates that state after
// mount, so it starts in sync rather than guessing and flashing.
export default function ThemeToggle() {
  const t = useTranslations('nav');
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    setThemeState(getCurrentTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    setThemeState(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
      title={theme === 'dark' ? t('switchToLight') : t('switchToDark')}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink-700 transition hover:border-teal-600/50 hover:text-teal-700 dark:border-white/15 dark:text-cream-100 dark:hover:border-teal-100/60 dark:hover:text-teal-100"
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.6" />
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden="true">
          <path
            d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
