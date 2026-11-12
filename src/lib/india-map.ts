import { indianStates } from '@/data/states';

// Maps the GeoJSON feature `properties.name` values in
// public/india-states.geojson (see provenance note below) onto the
// kebab-case `slug` values already used throughout this app (states.ts,
// Policy.states, the /state-policies dropdown and grid picker), so the new
// map and the existing dropdown/grid can all drive the same piece of state.
//
// Provenance / license note: the boundary geometry was copied from a sibling
// project's bharatwatch-style map, which in turn derived it from Census 2011
// state boundaries via the `udit-001/india-maps-data` GitHub project. That
// upstream repository states no open-source license — its README says the
// data was "curated from publicly available sources on the internet for
// personal usage," and has an open, unresolved "Licence Status" issue. This
// is flagged, not fixed: the data is visually accurate enough for a
// click-to-filter state picker, but is not a confirmed-licensed asset. If
// this ships to production, get sign-off (or swap in Survey of India /
// Bhuvan licensed boundaries) first.
export const STATE_NAME_TO_SLUG: Record<string, string> = {
  'Andhra Pradesh': 'andhra-pradesh',
  'Arunachal Pradesh': 'arunachal-pradesh',
  Assam: 'assam',
  Bihar: 'bihar',
  Chhattisgarh: 'chhattisgarh',
  Goa: 'goa',
  Gujarat: 'gujarat',
  Haryana: 'haryana',
  'Himachal Pradesh': 'himachal-pradesh',
  Jharkhand: 'jharkhand',
  Karnataka: 'karnataka',
  Kerala: 'kerala',
  'Madhya Pradesh': 'madhya-pradesh',
  Maharashtra: 'maharashtra',
  Manipur: 'manipur',
  Meghalaya: 'meghalaya',
  Mizoram: 'mizoram',
  Nagaland: 'nagaland',
  Odisha: 'odisha',
  Punjab: 'punjab',
  Rajasthan: 'rajasthan',
  Sikkim: 'sikkim',
  'Tamil Nadu': 'tamil-nadu',
  Telangana: 'telangana',
  Tripura: 'tripura',
  'Uttar Pradesh': 'uttar-pradesh',
  Uttarakhand: 'uttarakhand',
  'West Bengal': 'west-bengal',
  'Andaman and Nicobar Islands': 'andaman-and-nicobar-islands',
  Chandigarh: 'chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu': 'dadra-and-nagar-haveli-and-daman-and-diu',
  Delhi: 'delhi',
  'Jammu and Kashmir': 'jammu-and-kashmir',
  Ladakh: 'ladakh',
  Lakshadweep: 'lakshadweep',
  Puducherry: 'puducherry',
};

const SLUG_TO_STATE_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_NAME_TO_SLUG).map(([name, slug]) => [slug, name])
);

export function slugForGeoName(name: string): string | null {
  return STATE_NAME_TO_SLUG[name] ?? null;
}

export function geoNameForSlug(slug: string): string | null {
  return SLUG_TO_STATE_NAME[slug] ?? null;
}

// Sanity check used by the test suite: every slug the map can select must
// be a real entry in states.ts, and every states.ts entry must be
// selectable from the map (so the map never offers a dead-end state, and
// never silently omits a real one).
export function mapCoversAllStates(): boolean {
  const mapped = new Set(Object.values(STATE_NAME_TO_SLUG));
  const real = new Set(indianStates.map((s) => s.slug));
  if (mapped.size !== real.size) return false;
  for (const slug of real) if (!mapped.has(slug)) return false;
  return true;
}
