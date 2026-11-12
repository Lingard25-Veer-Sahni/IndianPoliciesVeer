'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  hasAcceptedTerms,
  hasCompletedGuideOnboarding,
  markGuideOnboardingComplete,
} from '@/lib/consent';
import GuideIcon from './GuideIcon';

/** Dispatched by the About page's "Meet your guide" button — see about/page.tsx. */
export const OPEN_GUIDE_EVENT = 'indianpolicy:open-guide';

const STEP_COUNT = 4;

// Fixed, bottom-right, original-illustration guide character with a short
// skippable onboarding walkthrough. Mounted once in the locale layout (see
// layout.tsx) so it's available everywhere, positioned so it never overlaps
// the left-edge RecentChangesTab, and kept compact so it doesn't cover
// inputs/CTAs/footer content on small screens.
export default function GuideWidget() {
  const t = useTranslations('guide');
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const autoOpenedRef = useRef(false);

  // Only decide whether to auto-open (and whether to show "first welcome"
  // framing) once we've actually read localStorage client-side, to avoid a
  // server/client mismatch flash.
  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    function onOpenRequest() {
      setStep(0);
      setOpen(true);
    }
    window.addEventListener(OPEN_GUIDE_EVENT, onOpenRequest);
    return () => window.removeEventListener(OPEN_GUIDE_EVENT, onOpenRequest);
  }, []);

  // Auto-invite a first-time visitor into the walkthrough shortly after
  // they've cleared the terms/privacy gate (see EntryGate.tsx), but only
  // once ever (tracked via markGuideOnboardingComplete) and never before
  // terms are accepted.
  useEffect(() => {
    if (!ready || autoOpenedRef.current) return;
    const timer = setInterval(() => {
      if (hasAcceptedTerms() && !hasCompletedGuideOnboarding()) {
        autoOpenedRef.current = true;
        setStep(0);
        setOpen(true);
        clearInterval(timer);
      }
    }, 600);
    return () => clearInterval(timer);
  }, [ready]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open, step]);

  const finish = useCallback(() => {
    markGuideOnboardingComplete();
    setOpen(false);
  }, []);

  const close = useCallback(() => {
    // Closing (not finishing) still counts as "seen it" so it doesn't nag
    // again every page load — but only once the user has actively
    // interacted with it (opened it at least once), consistent with "no
    // inferred consent from closing" for the *terms* dialog specifically;
    // this is just onboarding-nag suppression, not a consent record.
    markGuideOnboardingComplete();
    setOpen(false);
  }, []);

  if (!ready) return null;

  const isFirstRun = !hasCompletedGuideOnboarding();

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('title')}
          tabIndex={-1}
          className="card-warm w-[calc(100vw-2rem)] max-w-sm origin-bottom-right p-5 outline-none sm:w-80"
        >
          <div className="flex items-start gap-3">
            <GuideIcon className="h-9 w-9 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink dark:text-cream-50">
                {isFirstRun ? t('welcomeTitle') : t('title')}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-500 dark:text-cream-200/70">
                {t(`step${(step % STEP_COUNT) + 1}` as 'step1')}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={t('close')}
              className="flex-shrink-0 rounded-full p-1 text-ink-500 hover:bg-cream-200 hover:text-ink dark:text-cream-200/70 dark:hover:bg-white/10 dark:hover:text-cream-50"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex gap-1.5" aria-hidden="true">
              {Array.from({ length: STEP_COUNT }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${
                    i === step % STEP_COUNT ? 'bg-teal-600' : 'bg-ink/15 dark:bg-white/15'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="text-xs font-medium text-ink-500 hover:text-ink dark:text-cream-200/70 dark:hover:text-cream-50"
                >
                  {t('back')}
                </button>
              )}
              <button
                type="button"
                onClick={close}
                className="text-xs font-medium text-ink-500 hover:text-ink dark:text-cream-200/70 dark:hover:text-cream-50"
              >
                {t('skip')}
              </button>
              {step < STEP_COUNT - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="btn-primary px-3 py-1.5 text-xs"
                >
                  {t('next')}
                </button>
              ) : (
                <button type="button" onClick={finish} className="btn-primary px-3 py-1.5 text-xs">
                  {t('done')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setStep(0);
          setOpen((o) => !o);
        }}
        aria-label={isFirstRun ? t('openFirstTime') : t('openAgain')}
        aria-expanded={open}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-warm-lg transition hover:scale-105 dark:bg-ink dark:ring-1 dark:ring-white/10"
      >
        <GuideIcon className="h-9 w-9" />
        {isFirstRun && !open && (
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-coral dark:border-ink" />
        )}
      </button>
    </div>
  );
}
