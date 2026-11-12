import { beforeEach, describe, expect, it } from 'vitest';
import {
  acceptTerms,
  declineTermsForSession,
  hasAcceptedTerms,
  hasCompletedGuideOnboarding,
  markGuideOnboardingComplete,
  resetGuideOnboarding,
  resetTermsAcknowledgement,
  wasDeclinedThisSession,
} from './consent';

// On-device-only, versioned consent helpers backing EntryGate.tsx and
// GuideWidget.tsx. These tests cover the state machine the redesign's
// entry-gate/onboarding spec depends on: nothing is accepted by default,
// accepting persists, declining is session-only (not persisted acceptance),
// and the footer's "review privacy choices" reset genuinely resets both.
describe('consent', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('has not accepted terms by default', () => {
    expect(hasAcceptedTerms()).toBe(false);
  });

  it('persists acceptance across reads', () => {
    acceptTerms();
    expect(hasAcceptedTerms()).toBe(true);
  });

  it('"not now" does not record acceptance, only a session skip', () => {
    declineTermsForSession();
    expect(hasAcceptedTerms()).toBe(false);
    expect(wasDeclinedThisSession()).toBe(true);
  });

  it('accepting clears a prior same-session decline', () => {
    declineTermsForSession();
    acceptTerms();
    expect(wasDeclinedThisSession()).toBe(false);
    expect(hasAcceptedTerms()).toBe(true);
  });

  it('resetTermsAcknowledgement reverts to the pre-acceptance state', () => {
    acceptTerms();
    resetTermsAcknowledgement();
    expect(hasAcceptedTerms()).toBe(false);
    expect(wasDeclinedThisSession()).toBe(false);
  });

  it('guide onboarding completion persists independently of terms', () => {
    expect(hasCompletedGuideOnboarding()).toBe(false);
    markGuideOnboardingComplete();
    expect(hasCompletedGuideOnboarding()).toBe(true);
    expect(hasAcceptedTerms()).toBe(false);
  });

  it('resetGuideOnboarding reverts completion so the walkthrough can replay', () => {
    markGuideOnboardingComplete();
    resetGuideOnboarding();
    expect(hasCompletedGuideOnboarding()).toBe(false);
  });
});
