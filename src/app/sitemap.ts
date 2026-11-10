import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';
import { locales } from '@/i18n/routing';
import { policies } from '@/data/policies';

// Static (non-dynamic-param) pages that exist under every locale.
const STATIC_PATHS = ['', 'policies', 'state-policies', 'ai-search', 'about', 'disclaimer', 'privacy', 'terms'];

function languageAlternates(path: string, siteUrl: string): Record<string, string> {
  const entries = locales.map((l) => [l, `${siteUrl}/${l}${path ? `/${path}` : ''}`] as const);
  return Object.fromEntries(entries);
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const entries: MetadataRoute.Sitemap = [];

  for (const path of STATIC_PATHS) {
    for (const locale of locales) {
      entries.push({
        url: `${siteUrl}/${locale}${path ? `/${path}` : ''}`,
        lastModified: new Date(),
        changeFrequency: path === '' ? 'daily' : 'weekly',
        priority: path === '' ? 1 : 0.6,
        alternates: { languages: languageAlternates(path, siteUrl) },
      });
    }
  }

  for (const policy of policies) {
    for (const locale of locales) {
      entries.push({
        url: `${siteUrl}/${locale}/policies/${policy.slug}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: { languages: languageAlternates(`policies/${policy.slug}`, siteUrl) },
      });
    }
  }

  return entries;
}
