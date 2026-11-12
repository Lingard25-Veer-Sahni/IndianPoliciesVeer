import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { indianStates } from '@/data/states';
import { STATE_NAME_TO_SLUG, slugForGeoName, geoNameForSlug, mapCoversAllStates } from './india-map';

// public/india-states.geojson has a .geojson extension, which Vite's
// built-in JSON handling doesn't recognize (only .json) — read and parse it
// manually rather than fighting the bundler over a file extension.
const rawGeo = JSON.parse(
  readFileSync(join(process.cwd(), 'public', 'india-states.geojson'), 'utf8')
);

// The clickable political map (IndiaPoliticalMap.tsx) is only as trustworthy
// as this name<->slug mapping: if it drifts from either states.ts or the
// actual GeoJSON feature names, the map would silently offer a dead click
// (name in the GeoJSON with no slug) or a real state nothing on the map can
// ever select. Both failure modes should fail these tests loudly instead.
describe('india-map name/slug mapping', () => {
  it('covers every state in states.ts, with no extras and no gaps', () => {
    expect(mapCoversAllStates()).toBe(true);
  });

  it('round-trips name -> slug -> name', () => {
    for (const state of indianStates) {
      const name = geoNameForSlug(state.slug);
      expect(name).not.toBeNull();
      expect(slugForGeoName(name as string)).toBe(state.slug);
    }
  });

  it('maps every feature name actually present in the shipped GeoJSON', () => {
    const geo = rawGeo as { features: { properties: { name: string } }[] };
    expect(geo.features.length).toBe(36);
    for (const feature of geo.features) {
      expect(STATE_NAME_TO_SLUG[feature.properties.name]).toBeDefined();
    }
  });
});
