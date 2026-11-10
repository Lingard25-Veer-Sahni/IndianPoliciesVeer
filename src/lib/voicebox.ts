import { getSupabase, type VoiceConfigRow } from '@/lib/supabase-admin';

// Shared client for Voicebox (https://github.com/jamiepine/voicebox) — a
// free, open-source, self-hosted "AI voice studio" (FastAPI backend). Not a
// hosted third-party API: VOICEBOX_URL just points at wherever the
// operator's own `docker compose up` (or plain-Python) instance is
// listening — see .env.example. Used by two callers:
//   - src/app/api/tts/route.ts — narrates policy text with the active
//     cloned voice (synthesizeVoicebox / resolveVoiceboxProfileId below).
//   - src/app/api/admin/voice/route.ts — the admin page where a sample is
//     uploaded to create/replace that cloned voice (createVoiceboxProfile /
//     transcribeVoiceboxSample / uploadVoiceboxSample / deleteVoiceboxProfile).
//
// Route/field shapes below (`POST /generate/stream` taking
// `{profile_id, text}` and streaming back raw WAV bytes, `POST /profiles`,
// `POST /transcribe`, `POST /profiles/{id}/samples`, the "Model X is not
// downloaded yet" 400 on first use of a fresh model, the `/models/status` +
// `/models/download` pair to resolve it) are the exact shapes verified
// against Voicebox's own FastAPI source in a sibling project's integration
// (autoviral/server/src/services/voiceboxTts.ts) — reused here rather than
// re-derived from scratch.

export const voiceboxUrl = (process.env.VOICEBOX_URL || '').replace(/\/+$/, '');
export const voiceboxUrlConfigured = Boolean(voiceboxUrl);

async function voiceboxErrorMessage(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { detail?: unknown };
    if (typeof data.detail === 'string') return data.detail;
    if (data.detail && typeof data.detail === 'object') {
      const d = data.detail as { message?: string };
      if (typeof d.message === 'string') return d.message;
      return JSON.stringify(data.detail);
    }
    return JSON.stringify(data);
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

// --- Cloning flow (used by the admin voice-upload page) ---

/**
 * POST /profiles — creates a new, initially sample-less cloned-voice
 * profile. Returns Voicebox's own profile id, which every later call
 * (sample upload, /generate/stream, deletion) addresses this voice by.
 */
export async function createVoiceboxProfile(name: string): Promise<string> {
  const res = await fetch(`${voiceboxUrl}/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, voice_type: 'cloned' }),
  });
  if (!res.ok) throw new Error(await voiceboxErrorMessage(res));
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * POST /transcribe — runs Voicebox's bundled Whisper model on the uploaded
 * sample to get a REAL transcript, rather than asking the admin to type out
 * what's spoken (friction) or fabricating a placeholder (which would poison
 * the voice clone with a wrong transcript) — Voicebox's own
 * POST /profiles/{id}/samples requires this `reference_text` to verbatim
 * match the audio.
 *
 * The FIRST call against a fresh Voicebox instance (before its Whisper
 * model has been downloaded/loaded) returns 202 with
 * `{message, model_name, downloading: true}` instead of the transcript, so
 * this polls until either a real 200 or maxWaitMs is exceeded.
 */
export async function transcribeVoiceboxSample(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  maxWaitMs = 5 * 60_000
): Promise<string> {
  const start = Date.now();
  for (;;) {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);

    const res = await fetch(`${voiceboxUrl}/transcribe`, { method: 'POST', body: form });
    if (res.status === 200) {
      const data = (await res.json()) as { text: string };
      return data.text;
    }
    if (res.status === 202) {
      if (Date.now() - start > maxWaitMs) {
        throw new Error(
          "Voicebox is still downloading its speech-recognition model (first-use only) and didn't finish in time — wait a minute and try again."
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
      continue;
    }
    throw new Error(await voiceboxErrorMessage(res));
  }
}

/**
 * POST /profiles/{profile_id}/samples — attaches a reference audio sample
 * (+ its real transcript from transcribeVoiceboxSample above) to a profile.
 * A profile needs at least one sample before /generate/stream can narrate
 * anything with it.
 */
export async function uploadVoiceboxSample(
  profileId: string,
  buffer: Buffer,
  filename: string,
  mimeType: string,
  referenceText: string
): Promise<void> {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename);
  form.append('reference_text', referenceText);

  const res = await fetch(`${voiceboxUrl}/profiles/${encodeURIComponent(profileId)}/samples`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(await voiceboxErrorMessage(res));
}

/** DELETE /profiles/{profile_id} — removes the profile (and its samples) from Voicebox itself. */
export async function deleteVoiceboxProfile(profileId: string): Promise<void> {
  const res = await fetch(`${voiceboxUrl}/profiles/${encodeURIComponent(profileId)}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 404) throw new Error(await voiceboxErrorMessage(res));
}

// --- Synthesis flow (used by /api/tts) ---

interface VoiceboxModelStatus {
  model_name: string;
  downloaded: boolean;
  downloading: boolean;
}

const MODEL_NOT_DOWNLOADED_RE = /Model (\S+) is not downloaded yet/i;

// Voicebox defaults to engine "qwen" / model_size "1.7B" when neither is
// passed in the /generate/stream body (which we never do) — i.e. the
// "qwen-tts-{size}" entry in /models/status. Built from the size parsed out
// of the 400's error message rather than hardcoded, so it still tracks
// correctly if Voicebox's own default model_size ever changes.
function qwenTtsModelName(modelSize: string): string {
  return `qwen-tts-${modelSize}`;
}

async function ensureVoiceboxModelDownloaded(modelName: string, maxWaitMs = 15 * 60_000): Promise<void> {
  const start = Date.now();

  async function isDownloaded(): Promise<boolean> {
    const res = await fetch(`${voiceboxUrl}/models/status`);
    if (!res.ok) return false;
    const data = (await res.json()) as { models: VoiceboxModelStatus[] };
    return Boolean(data.models.find((m) => m.model_name === modelName)?.downloaded);
  }

  if (await isDownloaded()) return;

  const downloadRes = await fetch(`${voiceboxUrl}/models/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_name: modelName }),
  });
  // A 409/"already downloading" here is fine — the poll loop below covers it either way.
  if (!downloadRes.ok && downloadRes.status !== 409) {
    throw new Error(await voiceboxErrorMessage(downloadRes));
  }

  for (;;) {
    if (Date.now() - start > maxWaitMs) {
      throw new Error(`Voicebox is still downloading the ${modelName} model.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
    if (await isDownloaded()) return;
  }
}

// `POST /generate/stream` synchronously synthesizes `text` in the voice
// identified by `profileId` and streams back real WAV audio directly (no
// generation-id polling needed, unlike Voicebox's async POST /generate).
export async function synthesizeVoicebox(
  text: string,
  profileId: string,
  isRetry = false,
  retriedTransient = false
): Promise<Buffer> {
  const res = await fetch(`${voiceboxUrl}/generate/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile_id: profileId, text }),
  });

  if (!res.ok) {
    const message = await voiceboxErrorMessage(res);
    const modelMatch = !isRetry ? message.match(MODEL_NOT_DOWNLOADED_RE) : null;
    if (modelMatch) {
      await ensureVoiceboxModelDownloaded(qwenTtsModelName(modelMatch[1]));
      return synthesizeVoicebox(text, profileId, true, retriedTransient);
    }
    // A 5xx here is usually the local Voicebox instance being overloaded by
    // a concurrent request, not a real problem with this one — one
    // short-delay retry recovers cleanly instead of immediately falling
    // through to the next engine.
    if (!retriedTransient && res.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      return synthesizeVoicebox(text, profileId, isRetry, true);
    }
    throw new Error(`Voicebox TTS failed: ${message}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// --- Active-profile resolution (used by /api/tts) ---
//
// The site-wide cloned voice created via the admin upload page is stored in
// Supabase (voice_config, a single row — see supabase/migrations/0005_voice_config.sql)
// rather than an env var, so a new upload takes effect on the very next TTS
// request with no redeploy. Falls back to the static VOICEBOX_PROFILE_ID env
// var (the original, pre-upload-UI way of configuring this) if no DB row
// exists yet, so either path works. Cached for a short time in-process so a
// page that requests narration for several paragraphs back-to-back doesn't
// re-query Supabase for every single one.
let cachedProfile: { id: string | null; expiresAt: number } | null = null;
const PROFILE_CACHE_MS = 30_000;

export async function resolveVoiceboxProfileId(): Promise<string | null> {
  if (cachedProfile && cachedProfile.expiresAt > Date.now()) {
    return cachedProfile.id;
  }

  let id: string | null = process.env.VOICEBOX_PROFILE_ID || null;
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('voice_config')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (!error && data) {
      const row = data as VoiceConfigRow;
      if (row.status === 'ready' && row.voicebox_profile_id) {
        id = row.voicebox_profile_id;
      }
    }
  } catch (err) {
    // Supabase unreachable/misconfigured — fall back to the env var (or
    // null) resolved above rather than failing the whole TTS request.
    console.error('resolveVoiceboxProfileId: Supabase lookup failed, using env fallback:', err);
  }

  cachedProfile = { id, expiresAt: Date.now() + PROFILE_CACHE_MS };
  return id;
}

/** Called right after a successful admin upload/delete so the very next TTS request picks up the change immediately instead of waiting out the cache TTL. */
export function invalidateVoiceboxProfileCache(): void {
  cachedProfile = null;
}
