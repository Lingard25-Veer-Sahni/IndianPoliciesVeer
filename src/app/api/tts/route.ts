import { NextRequest, NextResponse } from 'next/server';
import { synthesizeVoicebox, resolveVoiceboxProfileId, voiceboxUrlConfigured } from '@/lib/voicebox';

// Server-only route: produces natural-sounding speech audio without ever
// exposing a paid API key to the browser.
//
// Four engines are supported, tried in this order:
//   1. Voicebox (https://github.com/jamiepine/voicebox) — a free,
//      open-source, self-hosted "AI voice studio" (FastAPI backend, run via
//      `docker compose up` or plain Python — see .env.example). Not a
//      hosted third-party API: VOICEBOX_URL just points at wherever the
//      operator's own instance is listening, so there's no per-request
//      cost or rate limit once it's running. This is meant to become the
//      SOLE voice for the whole site once a sample has been uploaded via
//      the admin voice page (/[locale]/admin/voice) — see
//      src/lib/voicebox.ts's resolveVoiceboxProfileId() for where that
//      uploaded voice's id comes from (falls back to the static
//      VOICEBOX_PROFILE_ID env var if nothing's been uploaded yet).
//      Engines 2-4 below only ever run as a safety net if Voicebox itself
//      is unreachable/misconfigured/still downloading a model — not
//      because they're meant to be used in normal operation once a voice
//      is uploaded. Any such failure falls straight through to engine
//      2/3/4 rather than erroring the whole request.
//   2. Sarvam AI (Bulbul) — a text-to-speech model purpose-built for Indian
//      languages, only used if SARVAM_API_KEY is set (see .env.example).
//      Tried second when configured since it's noticeably more natural for
//      Hindi/Tamil/etc than either of the two engines below. Sarvam's free
//      tier is a fixed, non-renewing credit grant (not a monthly quota like
//      Google's), so it WILL eventually be exhausted in normal use — any
//      failure here (expired credits, rate limit, transient error) falls
//      straight through to engine 3/4 below rather than erroring, so
//      running out of Sarvam credits never breaks TTS, it just silently
//      drops back to the next-best engine.
//   3. "Official" Google Cloud Text-to-Speech (Chirp3-HD) — highest quality,
//      but requires a billed Google Cloud project + API key. Only used if
//      GOOGLE_TTS_API_KEY is set (see .env.example).
//   4. "Free" engine — the same undocumented Google Translate voice endpoint
//      that libraries like gTTS use. No signup, no API key, no billing.
//      Noticeably more natural than the browser's built-in speechSynthesis
//      voice, though not as polished as the engines above. This is what
//      runs by default with zero configuration, and is always the final
//      fallback if every configured paid/self-hosted engine fails.
//
// If every server engine fails outright, the client (TextToSpeech.tsx)
// falls back to the browser's built-in voice, so the page never breaks.

const TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1';
const FREE_TTS_ENDPOINT = 'https://translate.google.com/translate_tts';
const SARVAM_TTS_ENDPOINT = 'https://api.sarvam.ai/text-to-speech';

if (voiceboxUrlConfigured) {
  console.log('[tts] Voicebox (self-hosted): URL configured — active voice resolved per-request (env var or admin upload).');
} else {
  console.log('[tts] Voicebox (self-hosted): VOICEBOX_URL not set — see .env.example to run it locally.');
}

// Sarvam's Bulbul v3 speaker roster (see .env.example) — any reasonably
// natural-sounding default works here since the app doesn't expose a voice
// picker for the cloud engines the way it does for the browser voice.
const SARVAM_SPEAKER = 'priya';

async function synthesizeSarvam(
  text: string,
  languageCode: string,
  apiKey: string
): Promise<Buffer> {
  // Sarvam's REST API caps input at ~2500 characters per call; every policy
  // summary in this app is well under that, so no chunking is needed here
  // (unlike the free engine below, which caps out far lower).
  const res = await fetch(SARVAM_TTS_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-subscription-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      language_code: languageCode,
      speaker: SARVAM_SPEAKER,
      model: 'bulbul:v3',
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Sarvam TTS failed: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as { audios?: string[] };
  const audio = data.audios?.[0];
  if (!audio) {
    throw new Error('Sarvam TTS response missing audio.');
  }
  return Buffer.from(audio, 'base64');
}

// In-memory cache of the best available official voice per language code,
// so we don't call voices:list on every single request within the same
// warm serverless instance. Cleared automatically on cold start/redeploy.
const voiceCache = new Map<string, string>();

// Preferred Chirp3-HD speaker names, in priority order, when more than one
// is available for a given language. Falls back to whatever the API
// returns if none of these match.
const PREFERRED_SPEAKERS = ['Kore', 'Charon', 'Leda', 'Puck', 'Aoede', 'Zephyr'];

interface GoogleVoice {
  name: string;
  languageCodes: string[];
}

async function pickVoice(languageCode: string, apiKey: string): Promise<string | null> {
  const cached = voiceCache.get(languageCode);
  if (cached) return cached;

  const res = await fetch(
    `${TTS_ENDPOINT}/voices?languageCode=${encodeURIComponent(languageCode)}&key=${apiKey}`
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { voices?: GoogleVoice[] };
  const voices = data.voices ?? [];
  if (voices.length === 0) return null;

  // Prefer quality tiers in this order: Chirp3-HD > Neural2 > Wavenet > Standard.
  const tiers = ['Chirp3-HD', 'Neural2', 'Wavenet', 'Standard'];
  for (const tier of tiers) {
    const inTier = voices.filter((v) => v.name.includes(tier));
    if (inTier.length === 0) continue;

    const preferred = PREFERRED_SPEAKERS.map((speaker) =>
      inTier.find((v) => v.name.endsWith(`-${speaker}`))
    ).find(Boolean);

    const chosen = (preferred ?? inTier[0]).name;
    voiceCache.set(languageCode, chosen);
    return chosen;
  }

  return null;
}

async function synthesizeOfficial(
  text: string,
  languageCode: string,
  apiKey: string
): Promise<Buffer> {
  const voiceName = await pickVoice(languageCode, apiKey);
  if (!voiceName) {
    throw new Error(`No official cloud voice available for ${languageCode}.`);
  }

  const synthRes = await fetch(`${TTS_ENDPOINT}/text:synthesize?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode, name: voiceName },
      // Speed is applied client-side via HTMLAudioElement.playbackRate so
      // we only ever have to fetch one audio file per piece of text.
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0 },
    }),
  });

  if (!synthRes.ok) {
    const errText = await synthRes.text();
    throw new Error(`Official TTS synth failed: ${synthRes.status} ${errText}`);
  }

  const { audioContent } = (await synthRes.json()) as { audioContent: string };
  return Buffer.from(audioContent, 'base64');
}

// The free Google Translate voice endpoint silently truncates/rejects text
// beyond roughly 200 characters, so we split into sentence-sized chunks
// (falling back to word-sized ones for very long sentences) and stitch the
// resulting MP3s back together. Every policy summary in this app is well
// under 500 characters total, so this is at most a handful of chunks.
function chunkText(text: string, maxLen = 150): string[] {
  const sentences = text.split(/(?<=[.!?।])\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (current) {
      chunks.push(current);
      current = '';
    }
  };

  for (const sentence of sentences) {
    if (sentence.length <= maxLen) {
      const candidate = current ? `${current} ${sentence}` : sentence;
      if (candidate.length <= maxLen) {
        current = candidate;
      } else {
        flush();
        current = sentence;
      }
      continue;
    }

    // Sentence itself is too long; split on words instead.
    const words = sentence.split(' ');
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxLen) {
        current = candidate;
      } else {
        flush();
        current = word;
      }
    }
  }
  flush();

  return chunks.length > 0 ? chunks : [text.slice(0, maxLen)];
}

async function fetchFreeTtsChunk(text: string, lang: string): Promise<Buffer> {
  const url = `${FREE_TTS_ENDPOINT}?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(lang)}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: {
      // The endpoint 403s without a browser-like User-Agent.
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Referer: 'https://translate.google.com/',
    },
  });
  if (!res.ok) {
    throw new Error(`Free TTS chunk failed: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function synthesizeFree(text: string, languageCode: string): Promise<Buffer> {
  // Google Translate uses plain two-letter language codes (hi, ta, mr...)
  // rather than BCP-47 region-tagged ones (hi-IN, ta-IN...).
  const lang = languageCode.split('-')[0];
  const chunks = chunkText(text);

  // Sequential, not parallel: this is an undocumented endpoint and firing
  // a burst of concurrent requests is more likely to get rate-limited.
  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    buffers.push(await fetchFreeTtsChunk(chunk, lang));
  }
  return Buffer.concat(buffers);
}

// Cheap, no-cost check the client pings on mount. The free engine needs no
// configuration at all, so `configured` is always true — it exists mainly
// so the client knows a server engine is available before it decides to
// skip straight to the browser voice. `voiceboxActive` is included the
// same way autoviral's GET /api/voices surfaces `voiceboxConfigured`, for
// anyone checking from outside the process whether the self-hosted engine
// currently has a usable cloned voice — the client here doesn't currently
// branch on it (no per-engine voice picker), but it's cheap, honest,
// useful debugging signal to expose, and it's what the admin voice page
// polls to show its "active" / "not set" status banner.
export async function GET() {
  const voiceboxProfileId = voiceboxUrlConfigured ? await resolveVoiceboxProfileId() : null;
  return NextResponse.json({ configured: true, voiceboxActive: Boolean(voiceboxProfileId) });
}

export async function POST(req: NextRequest) {
  let body: { text?: string; languageCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { text: rawText, languageCode: rawLanguageCode } = body;
  if (!rawText || !rawLanguageCode) {
    return NextResponse.json({ error: 'Missing text or languageCode.' }, { status: 400 });
  }
  if (rawText.length > 6000) {
    return NextResponse.json({ error: 'Text too long for synthesis.' }, { status: 413 });
  }
  // Re-bound as non-optional locals: TS narrows `rawText`/`rawLanguageCode`
  // to `string` after the guard above at this scope, but that narrowing
  // doesn't survive capture inside the synthesizeFallbackChain() closure
  // below, so give the closure genuinely non-optional variables to close over.
  const text: string = rawText;
  const languageCode: string = rawLanguageCode;

  const sarvamKey = process.env.SARVAM_API_KEY;
  const googleKey = process.env.GOOGLE_TTS_API_KEY;

  // Engines 2-4 (Sarvam -> Official Google -> Free) — unchanged from
  // before Voicebox was added, just factored out so Voicebox (engine 1,
  // below) can fall through into this exact same chain on any failure.
  async function synthesizeFallbackChain(): Promise<{ audioBuffer: Buffer; contentType: string }> {
    let audioBuffer: Buffer;
    // Sarvam returns WAV by default (the REST API doesn't document a way to
    // request MP3 directly), so the response Content-Type has to track
    // which engine actually produced the bytes rather than being a fixed
    // 'audio/mpeg' for everything.
    let contentType = 'audio/mpeg';

    if (sarvamKey) {
      try {
        audioBuffer = await synthesizeSarvam(text, languageCode, sarvamKey);
        contentType = 'audio/wav';
      } catch (err) {
        // Expected once Sarvam's fixed free-credit grant runs out (it's not
        // a renewing quota), as well as for any other transient failure —
        // fall through to the pre-existing engine chain below rather than
        // erroring, so exhausting Sarvam credits never breaks TTS.
        console.error('Sarvam TTS failed, falling back to next engine:', err);
        audioBuffer = googleKey
          ? await synthesizeOfficial(text, languageCode, googleKey).catch(async (err2) => {
              console.error('Official TTS failed, falling back to free engine:', err2);
              return synthesizeFree(text, languageCode);
            })
          : await synthesizeFree(text, languageCode);
      }
    } else if (googleKey) {
      try {
        audioBuffer = await synthesizeOfficial(text, languageCode, googleKey);
      } catch (err) {
        console.error('Official TTS failed, falling back to free engine:', err);
        audioBuffer = await synthesizeFree(text, languageCode);
      }
    } else {
      audioBuffer = await synthesizeFree(text, languageCode);
    }

    return { audioBuffer, contentType };
  }

  try {
    let audioBuffer: Buffer;
    let contentType: string;

    const voiceboxProfileId = voiceboxUrlConfigured ? await resolveVoiceboxProfileId() : null;

    if (voiceboxProfileId) {
      try {
        audioBuffer = await synthesizeVoicebox(text, voiceboxProfileId);
        contentType = 'audio/wav';
      } catch (err) {
        // Same fail-open contract as every other engine here: unreachable
        // instance, model still downloading, unrecognized profile id, etc.
        // all silently drop to the pre-existing Sarvam/Google/free chain
        // rather than erroring, so a misconfigured or offline self-hosted
        // Voicebox instance never breaks TTS.
        console.error('Voicebox TTS failed, falling back to next engine:', err);
        ({ audioBuffer, contentType } = await synthesizeFallbackChain());
      }
    } else {
      ({ audioBuffer, contentType } = await synthesizeFallbackChain());
    }

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (err) {
    console.error('TTS route error:', err);
    return NextResponse.json({ error: 'Cloud synthesis failed.' }, { status: 502 });
  }
}
