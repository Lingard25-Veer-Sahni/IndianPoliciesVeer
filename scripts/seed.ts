// Seeds the Supabase `policies` table from the static src/data/policies.ts
// dataset. Requires the `supabase/migrations/0001_init.sql` schema to
// already exist in the target Supabase project (run it once via the
// Supabase Dashboard SQL Editor — see README/final report for the exact
// link) before this will succeed.
// Run with: npm run seed
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { policies } from '../src/data/policies';

// Next.js apps conventionally keep env vars in .env.local (not .env), so
// load that explicitly for this standalone script.
dotenv.config({ path: '.env.local' });

const CHUNK_SIZE = 50;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY env vars (check .env.local).'
    );
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const now = new Date().toISOString();

  const rows = policies.map((p) => ({
    slug: p.slug,
    category: p.category,
    year: Number.parseInt(p.year, 10) || null,
    ministry: p.ministry,
    // Respect the static dataset's `applicability` field: entries marked
    // 'state' (e.g. a Karnataka- or UP-specific act) must seed as
    // level: 'state', not 'central' — otherwise they'd wrongly surface in
    // the AI search route's central-law candidate pool (see
    // src/app/api/search/route.ts's loadCandidates(), which filters on
    // `row.level !== 'state'`) regardless of which state a user selects.
    level: p.applicability === 'state' ? 'state' : 'central',
    official_source_url: p.officialSourceUrl,
    official_source_name: p.officialSourceName,
    keywords: p.keywords ?? [],
    content: p.content,
    updated_at: now,
  }));

  let seeded = 0;
  for (const batch of chunk(rows, CHUNK_SIZE)) {
    const { error } = await supabase.from('policies').upsert(batch, { onConflict: 'slug' });
    if (error) {
      throw new Error(`Upsert batch failed: ${error.message}`);
    }
    seeded += batch.length;
    console.log(`Seeded ${seeded}/${rows.length}...`);
  }

  const { count, error: countError } = await supabase
    .from('policies')
    .select('*', { count: 'exact', head: true });
  if (countError) {
    throw new Error(`Count query failed: ${countError.message}`);
  }

  console.log(`Seeded ${policies.length} policies from src/data/policies.ts.`);
  console.log(`policies table now has ${count} row(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
