'use client';

import { useEffect, useMemo, useState } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { useTranslations } from 'next-intl';
import { slugForGeoName, geoNameForSlug } from '@/lib/india-map';

interface GeoFeature {
  type: 'Feature';
  properties: { name: string };
  geometry: GeoJSON.Geometry;
}
interface GeoFC {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

const VIEW_W = 480;
const VIEW_H = 520;

// A real, clickable political map of India's states/UTs for the
// /state-policies picker — alongside (not replacing) the existing dropdown
// and accessible grid, kept in sync with both via the shared `value`/
// `onSelect` props. Boundary data: public/india-states.geojson, see
// src/lib/india-map.ts for the full provenance/license note (short version:
// Census-2011-derived via a third-party GitHub project with no confirmed
// open license — flagged for owner/legal sign-off before any production
// launch, not silently treated as production-ready).
export default function IndiaPoliticalMap({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (slug: string) => void;
}) {
  const t = useTranslations('statePolicies');
  const [fc, setFc] = useState<GeoFC | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/india-states.geojson')
      .then((r) => {
        if (!r.ok) throw new Error('map fetch failed');
        return r.json();
      })
      .then((data: GeoFC) => {
        if (!cancelled) setFc(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pathGen = useMemo(() => {
    if (!fc) return null;
    const projection = geoMercator().fitSize([VIEW_W, VIEW_H], fc as unknown as GeoJSON.FeatureCollection);
    return geoPath(projection);
  }, [fc]);

  const selectedName = value ? geoNameForSlug(value) : null;

  if (failed) {
    // Honest failure state rather than a blank/broken map — the dropdown
    // and grid picker below remain fully usable either way.
    return null;
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-3 shadow-warm dark:border-white/10 dark:bg-ink/60">
      {!fc || !pathGen ? (
        <div className="flex aspect-[480/520] w-full items-center justify-center text-sm text-ink-500 dark:text-cream-200/70">
          {t('mapLoading')}
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="group"
          aria-label={t('mapLabel')}
          className="h-auto w-full dark:[&_path]:stroke-ink"
        >
          {fc.features.map((f) => {
            const slug = slugForGeoName(f.properties.name);
            const d = pathGen(f.geometry as GeoJSON.Geometry) ?? undefined;
            const isSelected = !!slug && slug === value;
            const isHovered = !!slug && slug === hovered;
            return (
              <path
                key={f.properties.name}
                d={d}
                tabIndex={slug ? 0 : -1}
                role={slug ? 'button' : undefined}
                aria-pressed={slug ? isSelected : undefined}
                aria-label={slug ? f.properties.name : undefined}
                className={`cursor-pointer stroke-white transition-colors focus:outline-none focus-visible:stroke-coral dark:stroke-ink ${
                  isSelected
                    ? 'fill-teal-600'
                    : isHovered
                      ? 'fill-teal-600/60'
                      : 'fill-teal-100 dark:fill-teal-700/40'
                }`}
                strokeWidth={0.75}
                onMouseEnter={() => slug && setHovered(slug)}
                onMouseLeave={() => setHovered((cur) => (cur === slug ? null : cur))}
                onClick={() => slug && onSelect(value === slug ? '' : slug)}
                onKeyDown={(e) => {
                  if (!slug) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(value === slug ? '' : slug);
                  }
                }}
              >
                <title>{f.properties.name}</title>
              </path>
            );
          })}
        </svg>
      )}
      <p className="mt-2 text-center text-sm font-medium text-ink-700 dark:text-cream-100">
        {hovered ? geoNameForSlug(hovered) : selectedName ? selectedName : t('mapHint')}
      </p>
      <p className="mt-1 text-center text-[11px] leading-snug text-ink-500/70 dark:text-cream-200/50">
        {t('mapProvenance')}
      </p>
    </div>
  );
}
