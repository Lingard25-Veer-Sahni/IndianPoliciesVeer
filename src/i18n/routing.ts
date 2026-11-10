import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'hi', 'ta', 'mr', 'ml', 'bn', 'kn'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  hi: 'हिन्दी',
  ta: 'தமிழ்',
  mr: 'मराठी',
  ml: 'മലയാളം',
  bn: 'বাংলা',
  kn: 'ಕನ್ನಡ',
};

// BCP-47 tags used to pick a matching browser speechSynthesis voice
export const localeSpeechTags: Record<Locale, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  mr: 'mr-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  kn: 'kn-IN',
};

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always',
});
