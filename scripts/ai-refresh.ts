// AI-driven refresh of the LIVE static policy catalog (src/data/policies.ts).
//
// IMPORTANT — what this script actually does and does NOT do:
// - It directly edits src/data/policies.ts (add new entries, rewrite the
//   English summary of existing ones, delete repealed ones), then runs
//   `tsc --noEmit` as a safety check and reverts the file if it fails.
// - It also writes a matching row into the Supabase `changes` table with
//   status: 'approved', source: 'ai' so the existing Recent Changes feed
//   (/api/changes, unmodified) shows these as real history with no UI work.
// - This is the user's EXPLICIT choice ("fully auto-apply every hour, no
//   review") made via an explicit prompt, overriding this project's
//   original human-review safety gate. The AI model has no live internet
//   access — it can only reason from training data, which has a cutoff and
//   can hallucinate specific legal details. There is no human check on
//   this path anymore. Running this on a schedule means wrong information
//   can land on the live site unattended.
// - Running this script only changes the file ON THIS MACHINE. The
//   deployed Vercel site only picks up the new file content on the NEXT
//   `git push` + redeploy — this script does not commit, push, or deploy
//   anything itself.
//
// Run with: npm run ai-refresh   (see package.json)
// Intended to be invoked hourly by scripts/local-cron.mjs.

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { chatJSON, stripAiTells, NATURAL_WRITING_STYLE } from '../src/lib/openrouter';
import { policies, type PolicyCategory } from '../src/data/policies';

dotenv.config({ path: '.env.local' });

const FILE_PATH = path.join(__dirname, '..', 'src', 'data', 'policies.ts');
const LOCALES = ['en', 'hi', 'ta', 'mr', 'ml', 'bn', 'kn'] as const;
const MAX_ACTIONS_PER_RUN = 5; // cap blast radius of a single hourly run

interface AiSuggestion {
  type: 'add' | 'amend' | 'delete';
  slug: string;
  category?: string;
  year?: string;
  ministry?: string;
  officialSourceUrl?: string;
  officialSourceName?: string;
  keywords?: string[];
  title?: string;
  summary?: string;
  reason?: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null; // Supabase logging is best-effort; file edit still proceeds
  return createClient(url, key, { auth: { persistSession: false } });
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ai-refresh: ${msg}`);
}

// --- Text-level mutation helpers (policies.ts is edited as text, not AST,
// matching the same brace-matching technique already used manually earlier
// in this project's history to remove a duplicate entry). ---

function findEntryRange(src: string, slug: string): { start: number; end: number } | null {
  const marker = `slug: '${slug}'`;
  const markerIdx = src.indexOf(marker);
  if (markerIdx === -1) return null;
  // Walk backwards to the opening '{' of this object literal.
  let start = src.lastIndexOf('{', markerIdx);
  if (start === -1) return null;
  // Walk forward, brace-counting, to find the matching closing '}'.
  let depth = 0;
  let i = start;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) return null;
  let end = i + 1; // position right after the closing '}'
  // Include a trailing comma + newline if present, so deletion doesn't
  // leave a dangling comma or blank line behind.
  if (src[end] === ',') end++;
  if (src[end] === '\n') end++;
  return { start, end };
}

function escapeForSingleQuoteString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildContentBlock(enTitle: string, enSummary: string, existing?: Record<string, { title: string; summary: string }>): string {
  const lines: string[] = ['    content: {'];
  for (const loc of LOCALES) {
    const title = loc === 'en' ? enTitle : existing?.[loc]?.title ?? enTitle;
    const summary = loc === 'en' ? enSummary : existing?.[loc]?.summary ?? enSummary;
    lines.push(`      ${loc}: {`);
    lines.push(`        title: '${escapeForSingleQuoteString(title)}',`);
    lines.push(`        summary:`);
    lines.push(`          '${escapeForSingleQuoteString(summary)}',`);
    lines.push(`      },`);
  }
  lines.push('    },');
  return lines.join('\n');
}

function buildNewEntryText(s: AiSuggestion): string {
  const category = (s.category || 'social-welfare') as PolicyCategory;
  const keywords = (s.keywords && s.keywords.length > 0 ? s.keywords : [s.title || s.slug]).map(
    (k) => `      '${escapeForSingleQuoteString(k)}',`
  );
  const contentBlock = buildContentBlock(s.title || s.slug, s.summary || '');
  return [
    '  {',
    `    slug: '${escapeForSingleQuoteString(s.slug)}',`,
    `    category: '${category}',`,
    `    year: '${escapeForSingleQuoteString(s.year || '')}',`,
    `    ministry: '${escapeForSingleQuoteString(s.ministry || 'Government of India')}',`,
    `    officialSourceUrl: '${escapeForSingleQuoteString(s.officialSourceUrl || 'https://www.indiacode.nic.in/')}',`,
    `    officialSourceName: '${escapeForSingleQuoteString(s.officialSourceName || 'indiacode.nic.in (Government of India)')}',`,
    '    keywords: [',
    ...keywords,
    '    ],',
    contentBlock,
    '  },',
  ].join('\n');
}

function applyAdd(src: string, s: AiSuggestion): string {
  // Insert right before the closing `];` of the `policies` array (the
  // SECOND top-level `];` in the file — the first closes `categories`).
  const firstClose = src.indexOf('\n];');
  const secondClose = src.indexOf('\n];', firstClose + 1);
  if (secondClose === -1) throw new Error('Could not locate end of policies array');
  const insertion = buildNewEntryText(s) + '\n';
  return src.slice(0, secondClose + 1) + insertion + src.slice(secondClose + 1);
}

function applyAmend(src: string, s: AiSuggestion): string | null {
  const range = findEntryRange(src, s.slug);
  if (!range) return null;
  const entryText = src.slice(range.start, range.end);
  if (!s.summary && !s.title) return null;
  // Replace only the `en` locale's title/summary inside this entry, leaving
  // every other field (and other locales' translations) untouched — avoids
  // throwing away human-quality translations for an AI-only English edit.
  let updated = entryText;
  if (s.title) {
    updated = updated.replace(
      /en:\s*\{\s*title:\s*'(?:[^'\\]|\\.)*'/,
      `en: {\n        title: '${escapeForSingleQuoteString(s.title)}'`
    );
  }
  if (s.summary) {
    updated = updated.replace(
      /(en:\s*\{[\s\S]*?summary:\s*\n?\s*)'(?:[^'\\]|\\.)*'/,
      `$1'${escapeForSingleQuoteString(s.summary)}'`
    );
  }
  if (updated === entryText) return null; // regex didn't match anything — don't silently no-op as "applied"
  return src.slice(0, range.start) + updated + src.slice(range.end);
}

function applyDelete(src: string, slug: string): string | null {
  const range = findEntryRange(src, slug);
  if (!range) return null;
  return src.slice(0, range.start) + src.slice(range.end);
}

async function main() {
  log('starting run');
  const sample = policies
    .slice() // don't mutate the imported array
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .slice(0, 50)
    .map((p) => `${p.slug} (${p.category}, ${p.year})`)
    .join(', ');

  const existingSlugs = new Set(policies.map((p) => p.slug.toLowerCase()));
  // Catch near-duplicates where the AI proposes a differently-worded slug
  // for a law that already exists under a shorter/alternate slug (e.g.
  // "mahatma-gandhi-national-rural-employment-guarantee-act-2005" when
  // "mgnrega-2005" already exists) — same normalization used in
  // /api/cron/refresh/route.ts, applied here too since this script found
  // exactly that duplicate in testing.
  const stem = (slug: string) =>
    slug
      .toLowerCase()
      .replace(/-(act|rules?|code|bill)?-?\d{4}$/, '')
      .replace(/-act$|-rules?$|-code$/, '');
  const existingStems = new Set(Array.from(existingSlugs).map(stem));
  const existingKeywordSet = new Set(
    policies.flatMap((p) => (p.keywords || []).map((k) => k.toLowerCase().trim()))
  );

  let raw: { suggestions: AiSuggestion[] };
  try {
    raw = await chatJSON<{ suggestions: AiSuggestion[] }>([
      {
        role: 'system',
        content:
          'You are helping maintain an Indian central (nationwide) law and policy encyclopedia. ' +
          'You do not have live internet access, so only act when reasonably confident based on your ' +
          'training knowledge — never invent a specific date, section, or URL you are not sure about. ' +
          `Return at most ${MAX_ACTIONS_PER_RUN} total suggestions across these three kinds:\n` +
          '1. "add": an important, well-known central law/scheme missing from the sample shown below.\n' +
          '2. "amend": an existing entry (by exact slug from the sample) whose summary is now outdated ' +
          '(superseded, renamed, amended) — provide a corrected "summary" (and "title" if it changed).\n' +
          '3. "delete": an existing entry (by exact slug) that has been FULLY repealed with no ' +
          'replacement (rare — only when certain).\n' +
          'Respond with STRICT JSON only: {"suggestions": [{"type": "add|amend|delete", "slug": ' +
          '"kebab-case-slug", "category": "health|education|transparency|economy|digital|environment|' +
          'housing|privacy|employment|justice|consumer|agriculture|social-welfare|family", "year": "YYYY", ' +
          '"ministry": "...", "officialSourceUrl": "https://...", "officialSourceName": "...", ' +
          '"keywords": ["..."], "title": "...", "summary": "...", "reason": "short internal note"}]}. ' +
          'For "amend"/"delete", slug MUST exactly match one of the existing slugs given. No markdown.\n\n' +
          NATURAL_WRITING_STYLE,
      },
      {
        role: 'user',
        content: `A sample of existing entries (not the full catalog): ${sample}`,
      },
    ]);
  } catch (err) {
    log(`AI call failed, aborting this run: ${String(err)}`);
    return;
  }

  const suggestions = (raw.suggestions ?? []).slice(0, MAX_ACTIONS_PER_RUN);
  if (suggestions.length === 0) {
    log('no suggestions returned — nothing to do this run');
    return;
  }

  const original = fs.readFileSync(FILE_PATH, 'utf8');
  let working = original;
  const applied: { type: string; slug: string; title: string; summary: string }[] = [];

  for (const s of suggestions) {
    if (!s.slug) continue;
    try {
      if (s.type === 'add') {
        const slugLower = s.slug.toLowerCase();
        if (existingSlugs.has(slugLower)) {
          log(`skip add ${s.slug}: slug already exists`);
          continue;
        }
        if (existingStems.has(stem(slugLower))) {
          log(`skip add ${s.slug}: normalized slug stem already exists (likely duplicate)`);
          continue;
        }
        const keywordOverlap = (s.keywords || []).some((k) => existingKeywordSet.has(k.toLowerCase().trim()));
        if (keywordOverlap) {
          log(`skip add ${s.slug}: shares a keyword with an existing entry (likely duplicate)`);
          continue;
        }
        if (!s.title || !s.summary) {
          log(`skip add ${s.slug}: missing title/summary`);
          continue;
        }
        working = applyAdd(working, s);
        applied.push({ type: 'add', slug: s.slug, title: stripAiTells(s.title), summary: stripAiTells(s.summary) });
        existingSlugs.add(slugLower);
        log(`applied add: ${s.slug}`);
      } else if (s.type === 'amend') {
        const result = applyAmend(working, s);
        if (!result) {
          log(`skip amend ${s.slug}: entry not found or nothing to change`);
          continue;
        }
        working = result;
        applied.push({
          type: 'amend',
          slug: s.slug,
          title: stripAiTells(s.title || s.slug),
          summary: stripAiTells(s.summary || ''),
        });
        log(`applied amend: ${s.slug}`);
      } else if (s.type === 'delete') {
        const result = applyDelete(working, s.slug);
        if (!result) {
          log(`skip delete ${s.slug}: entry not found`);
          continue;
        }
        working = result;
        applied.push({ type: 'delete', slug: s.slug, title: s.slug, summary: stripAiTells(s.reason || 'Repealed/superseded.') });
        existingSlugs.delete(s.slug.toLowerCase());
        log(`applied delete: ${s.slug}`);
      }
    } catch (err) {
      log(`error applying ${s.type} ${s.slug}, skipping it: ${String(err)}`);
    }
  }

  if (applied.length === 0) {
    log('nothing applied this run (all suggestions were skipped)');
    return;
  }

  fs.writeFileSync(FILE_PATH, working, 'utf8');

  // Safety check: must still typecheck. Revert the whole file on failure
  // rather than leaving the live catalog in a broken/half-edited state.
  const { execSync } = await import('child_process');
  try {
    execSync('npx tsc --noEmit', { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
    log(`typecheck passed — ${applied.length} change(s) applied to src/data/policies.ts`);
  } catch (err) {
    fs.writeFileSync(FILE_PATH, original, 'utf8');
    log(`typecheck FAILED — reverted src/data/policies.ts, nothing applied this run. Error: ${String(err)}`);
    return;
  }

  // Best-effort: mirror each applied change into Supabase `changes` as an
  // already-approved, AI-sourced row so the existing Recent Changes feed
  // (/api/changes) shows real history. If Supabase isn't configured this is
  // silently skipped — the file edit above already succeeded regardless.
  const supabase = getSupabase();
  if (supabase) {
    const now = new Date().toISOString();
    const rows = applied.map((a) => ({
      type: a.type,
      slug: a.slug,
      title: a.title,
      summary: a.summary,
      proposed_content: null,
      status: 'approved' as const,
      source: 'ai' as const,
      reviewed_at: now,
    }));
    const { error } = await supabase.from('changes').insert(rows);
    if (error) log(`warning: failed to log changes to Supabase: ${error.message}`);
    else log(`logged ${rows.length} change(s) to Supabase 'changes' table`);
  } else {
    log('Supabase not configured — skipped logging to changes feed');
  }

  log(
    `done. ${applied.length} change(s) written to src/data/policies.ts on THIS machine only — ` +
      'the deployed site will not reflect this until the file is committed, pushed, and redeployed.'
  );
}

main().catch((err) => {
  console.error('ai-refresh: fatal error:', err);
  process.exit(1);
});
