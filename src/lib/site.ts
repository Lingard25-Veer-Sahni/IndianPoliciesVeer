// Central place for the site's public base URL, used by sitemap.ts,
// robots.ts, and generateMetadata() (OpenGraph/canonical/hreflang tags).
//
// Set NEXT_PUBLIC_SITE_URL in your deployment environment (e.g. Vercel
// project settings) to your real production domain once you have one.
// Vercel also auto-populates VERCEL_URL (the deployment's *.vercel.app
// host, no protocol) which is used as a fallback so preview/staging
// deployments still get correct-ish absolute URLs without extra config.
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl}`;
  return 'http://localhost:3000';
}
