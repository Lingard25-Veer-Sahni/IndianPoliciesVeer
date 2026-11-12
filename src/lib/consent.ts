'use client';

// Shared, on-device-only (no server/cookie, no network) versioned consent
// helpers for the first-entry terms/privacy acknowledgement dialog (see
// EntryGate.tsx) and the guide-character onboarding walkthrough (see
// GuideWidget.tsx). Bumping *_VERSION forces every visitor to see that flow
// again next time a dialog's wording materially changes — e.g. if the terms
// text changes, bump TERMS_ACK_VERSION.
export const TERMS_ACK_VERSION = 1;
export const GUIDE_ONBOARDED_VERSION = 1;

const TERMS_ACK_KEY = 'indianpolicy:terms-ack';
const TERMS_DECLINED_SESSION_KEY = 'indianpolicy:terms-declined-session';
const GUIDE_ONBOARDED_KEY = 'indianpolicy:guide-onboarded';

function readLocal(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can fail in private-browsing/quota-exceeded edge cases —
    // failing silently just means the dialog may reappear next load, which
    // is a safe default (never worse than not asking at all).
  }
}

export function hasAcceptedTerms(): boolean {
  return readLocal(TERMS_ACK_KEY) === String(TERMS_ACK_VERSION);
}

export function acceptTerms() {
  writeLocal(TERMS_ACK_KEY, String(TERMS_ACK_VERSION));
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(TERMS_DECLINED_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
}

/** "Not now": don't nag again this tab session, but don't record consent. */
export function declineTermsForSession() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(TERMS_DECLINED_SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function wasDeclinedThisSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(TERMS_DECLINED_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/** Used by the footer "Review privacy choices" control to re-prompt. */
export function resetTermsAcknowledgement() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TERMS_ACK_KEY);
    window.sessionStorage.removeItem(TERMS_DECLINED_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function hasCompletedGuideOnboarding(): boolean {
  return readLocal(GUIDE_ONBOARDED_KEY) === String(GUIDE_ONBOARDED_VERSION);
}

export function markGuideOnboardingComplete() {
  writeLocal(GUIDE_ONBOARDED_KEY, String(GUIDE_ONBOARDED_VERSION));
}

export function resetGuideOnboarding() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GUIDE_ONBOARDED_KEY);
  } catch {
    /* ignore */
  }
}
