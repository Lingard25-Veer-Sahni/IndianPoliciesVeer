import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Internal-only tools; not useful to crawlers and gated by a
        // shared secret anyway, but no reason to invite crawler traffic.
        disallow: ['/api/', '/*/admin/'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
