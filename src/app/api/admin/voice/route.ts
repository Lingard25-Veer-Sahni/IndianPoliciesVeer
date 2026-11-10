import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, voiceConfigRowToCamel, type VoiceConfigRow } from '@/lib/supabase-admin';
import { timingSafeEqualStrings } from '@/lib/auth';
import {
  voiceboxUrlConfigured,
  createVoiceboxProfile,
  transcribeVoiceboxSample,
  uploadVoiceboxSample,
  deleteVoiceboxProfile,
  invalidateVoiceboxProfileCache,
} from '@/lib/voicebox';

// Admin-only route (see src/app/[locale]/admin/voice/page.tsx): lets an
// operator upload a short voice sample and have it become the ONE narration
// voice used for every /api/tts request on the entire site, replacing the
// Sarvam/Google/free engine chain for normal operation (see the comment at
// the top of src/app/api/tts/route.ts — those engines remain wired up only
// as a safety net if Voicebox itself is ever unreachable).
//
// Deliberately admin-gated, not public: this app has no user-account
// system, so there is exactly one narrator voice for the whole site, not
// one per visitor. Letting any anonymous visitor overwrite it would mean
// one person could silently replace the voice everyone else hears
// (including, since this clones a REAL person's voice from a short
// sample, potential consent/misuse concerns) — same reasoning as every
// other /api/admin/* route in this app being gated behind ADMIN_SECRET.
function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.ADMIN_SECRET;
  if (!expected) return false;
  const header = req.headers.get('x-admin-secret');
  if (!header) return false;
  return timingSafeEqualStrings(header, expected);
}

// Matches the ceiling used by /api/search and /api/cron/refresh (see their
// identical comments) — Vercel Hobby's hard per-function timeout. Note
// transcribeVoiceboxSample's own internal poll loop allows up to 5 minutes
// for a fresh Voicebox instance's first-ever Whisper-model download; on
// Hobby this route will simply get killed by the platform before that
// completes rather than actually waiting the full 5 minutes — acceptable
// here since it only affects the very first upload after a fresh Voicebox
// install (the model, once downloaded, stays cached for every later one).
export const maxDuration = 60;

const NOT_CONFIGURED_MESSAGE =
  'Voicebox is not configured. Set VOICEBOX_URL in your server environment (see .env.example) to a running Voicebox instance first.';

// GET /api/admin/voice — current voice-config status.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.from('voice_config').select('*').eq('id', 1).maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    voiceboxUrlConfigured,
    voice: data ? voiceConfigRowToCamel(data as VoiceConfigRow) : null,
  });
}

// POST /api/admin/voice — multipart/form-data with `name` (text) and
// `file` (audio sample). Real (non-mocked) voice cloning: creates a
// Voicebox profile, runs Voicebox's own Whisper transcription on the
// sample (never a fabricated transcript), then attaches the sample + that
// real transcript to the profile so it's immediately usable for narration.
// Any previously-active profile is deleted (best-effort) first, since this
// app only ever has one site-wide voice at a time, not a saved library of
// several.
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!voiceboxUrlConfigured) {
    return NextResponse.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }

  const name = String(formData.get('name') ?? '').trim();
  const file = formData.get('file');

  if (!name) {
    return NextResponse.json({ error: 'A name for this voice is required.' }, { status: 400 });
  }
  if (name.length > 100) {
    return NextResponse.json({ error: 'Voice name must be 100 characters or fewer.' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'An audio sample file is required.' }, { status: 400 });
  }
  // Generous but bounded — a clean 10-30s reference clip (what Voicebox
  // itself recommends) is nowhere near this size; this just guards against
  // an accidental multi-minute/wrong-file upload tying up the request.
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'Audio sample must be 25MB or smaller.' }, { status: 413 });
  }

  const supabase = getSupabase();
  const buffer = Buffer.from(await file.arrayBuffer());

  // Best-effort cleanup of whatever voice was previously active, so
  // Voicebox's own storage doesn't accumulate orphaned profiles every time
  // the site's voice is replaced.
  const { data: existing } = await supabase.from('voice_config').select('*').eq('id', 1).maybeSingle();
  const previousProfileId = (existing as VoiceConfigRow | null)?.voicebox_profile_id;

  let profileId: string;
  try {
    profileId = await createVoiceboxProfile(name);
  } catch (err) {
    console.error('[admin/voice] failed to create Voicebox profile:', err);
    return NextResponse.json(
      { error: `Could not reach Voicebox to create the voice profile. ${err instanceof Error ? err.message : ''}`.trim() },
      { status: 502 }
    );
  }

  // Mark pending immediately (upsert) so a slow transcribe/upload below
  // doesn't leave the previous row's stale 'ready' status visible while
  // this one is still processing.
  await supabase.from('voice_config').upsert({
    id: 1,
    voicebox_profile_id: profileId,
    name,
    status: 'pending',
    error_message: null,
    updated_at: new Date().toISOString(),
  });

  try {
    const referenceText = await transcribeVoiceboxSample(buffer, file.name, file.type || 'audio/wav');
    await uploadVoiceboxSample(profileId, buffer, file.name, file.type || 'audio/wav', referenceText);

    const { error: updateError } = await supabase
      .from('voice_config')
      .update({ status: 'ready', error_message: null, updated_at: new Date().toISOString() })
      .eq('id', 1);
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to process the voice sample.';
    console.error('[admin/voice] sample processing failed:', message);
    await supabase
      .from('voice_config')
      .update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() })
      .eq('id', 1);
    // Clean up the half-set-up profile rather than leaving it dangling on
    // Voicebox's side with no sample attached.
    await deleteVoiceboxProfile(profileId).catch(() => {});
    return NextResponse.json({ error: `Voice sample processing failed: ${message}` }, { status: 502 });
  }

  // Only delete the OLD profile once the new one is fully ready — if
  // anything above failed we want the previous working voice left intact
  // rather than leaving the site with no voice at all.
  if (previousProfileId && previousProfileId !== profileId) {
    await deleteVoiceboxProfile(previousProfileId).catch((err) => {
      console.error('[admin/voice] failed to delete previous Voicebox profile (continuing):', err);
    });
  }

  invalidateVoiceboxProfileCache();

  return NextResponse.json({ ok: true, voiceboxProfileId: profileId, name, status: 'ready' });
}

// DELETE /api/admin/voice — clears the site-wide voice, reverting /api/tts
// to the Sarvam/Google/free engine chain.
export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data: existing } = await supabase.from('voice_config').select('*').eq('id', 1).maybeSingle();
  const profileId = (existing as VoiceConfigRow | null)?.voicebox_profile_id;

  if (profileId) {
    await deleteVoiceboxProfile(profileId).catch((err) => {
      console.error('[admin/voice] failed to delete Voicebox-side profile (continuing):', err);
    });
  }

  const { error } = await supabase
    .from('voice_config')
    .update({
      voicebox_profile_id: null,
      name: null,
      status: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateVoiceboxProfileCache();
  return NextResponse.json({ ok: true });
}
