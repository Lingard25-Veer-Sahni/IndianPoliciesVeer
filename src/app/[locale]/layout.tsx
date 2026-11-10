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
    <html lang={locale}>
      <body className={`lang-${locale} min-h-screen flex flex-col`}>
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="flex-1">{children}</main>
          {/* Fixed, collapsible tab on the left edge of the viewport — kept
              outside the normal document flow so it never affects existing
              page layouts/widths, and only takes up space when opened. */}
          <RecentChangesTab />
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
