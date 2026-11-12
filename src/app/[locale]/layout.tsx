import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { getSiteUrl } from '@/lib/site';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RecentChangesTab from '@/components/RecentChangesTab';
import EntryGate from '@/components/EntryGate';
import GuideWidget from '@/components/GuideWidget';
import { themeInitScript } from '@/lib/theme';
import './globals.css';

function hasLocale(candidates: readonly string[], value: string): boolean {
  return candidates.includes(value);
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('meta');
  const siteUrl = getSiteUrl();

  // hreflang alternates so search engines know each locale's homepage is a
  // translation of the same page rather than duplicate/unrelated content,
  // plus an "x-default" pointing at the default locale (en).
  const languageAlternates = Object.fromEntries(
    routing.locales.map((l) => [l, `${siteUrl}/${l}`])
  );

  return {
    metadataBase: new URL(siteUrl),
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `${siteUrl}/${locale}`,
      languages: { ...languageAlternates, 'x-default': `${siteUrl}/${routing.defaultLocale}` },
    },
    openGraph: {
      title: t('title'),
      description: t('description'),
      url: `${siteUrl}/${locale}`,
      siteName: 'IndianPolicy',
      locale: locale as Locale,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: t('title'),
      description: t('description'),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Sets the `dark` class on <html> before paint, from the stored
            choice (localStorage) or OS preference, so dark-mode users never
            see a light-mode flash. See src/lib/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`lang-${locale} min-h-screen flex flex-col bg-cream-50 text-ink dark:bg-ink dark:text-cream-50`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <Header />
          {/* md:pl-12 reserves just enough room for the RecentChangesTab's
              collapsed button (visible from the md breakpoint up) so it
              never sits on top of page headings on narrower containers —
              found overlapping "Terms of Service" etc. at the tablet
              width during the warm-redesign QA pass. */}
          <main className="flex-1 md:pl-12">{children}</main>
          {/* Fixed, collapsible tab on the left edge of the viewport — kept
              outside the normal document flow so it never affects existing
              page layouts/widths, and only takes up space when opened. */}
          <RecentChangesTab />
          <Footer />
          <EntryGate />
          <GuideWidget />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
