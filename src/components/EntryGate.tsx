'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  acceptTerms,
  declineTermsForSession,
  hasAcceptedTerms,
  wasDeclinedThisSession,
} from '@/lib/consent';

/// First-visit terms/privacy acknowledgement. Rendered globally (see
/// layout.tsx) so it appears over any entry page. Reading /terms, /privacy,
/// or /disclaimer never requires accepting first — those routes render
/// normally underneath/behind this dialog, and the dialog itself only
/// blocks interaction with checkbox+Continue gated, not navigation (the
/// "visit source" links below open in a new tab).
export default function EntryGate() {
  const t = useTranslations('entryGate');
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasAcceptedTerms() && !wasDeclinedThisSession()) {
      setVisible(true);
    }
  }, []);

  useEffect(() => {
    if (visible) dialogRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  function handleContinue() {
    if (!checked) return;
    acceptTerms();
    setVisible(false);
  }

  function handleNotNow() {
    declineTermsForSession();
    setVisible(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-gate-title"
        tabIndex={-1}
        className="card-warm w-full max-w-md rounded-t-2xl p-6 outline-none sm:rounded-2xl"
      >
        <h2 id="entry-gate-title" className="text-lg font-semibold text-ink dark:text-cream-50">
          {t('title')}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-cream-200/70">{t('body')}</p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link
            href="/terms"
            className="font-medium text-teal-700 underline hover:no-underline dark:text-teal-100"
          >
            {t('readTerms')}
          </Link>
          <Link
            href="/privacy"
            className="font-medium text-teal-700 underline hover:no-underline dark:text-teal-100"
          >
            {t('readPrivacy')}
          </Link>
          <Link
            href="/disclaimer"
            className="font-medium text-teal-700 underline hover:no-underline dark:text-teal-100"
          >
            {t('readDisclaimer')}
          </Link>
        </div>

        <label className="mt-5 flex items-start gap-2 text-sm text-ink dark:text-cream-50">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-ink/30 text-teal-600 focus:ring-teal-600 dark:border-white/30"
          />
          <span>{t('checkboxLabel')}</span>
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleNotNow} className="btn-secondary justify-center">
            {t('notNow')}
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!checked}
            className="btn-primary justify-center disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
