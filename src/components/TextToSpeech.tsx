'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { localeSpeechTags, type Locale } from '@/i18n/routing';

type PlayState = 'idle' | 'playing' | 'paused';
type Engine = 'cloud' | 'browser';

// Browsers commonly expose several voices per language, and the one a
// browser picks by default is often its lowest-quality offline "compact"
// voice — which is a big part of why TTS can sound robotic. Network-backed
// / neural voices (e.g. Chrome's "Google हिन्दी", Edge's "Microsoft ...
// Online (Natural)") sound far more human, so rank those first instead of
// just taking whichever voice happens to be listed first. This ranking is
// only used as a fallback when the Google Cloud voice (see below) isn't
// configured or fails.
function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  let score = 0;
  if (/neural|natural|premium|enhanced|wavenet|studio/.test(name)) score += 100;
  if (name.includes('google')) score += 50;
  if (name.includes('online')) score += 30;
  if (!v.localService) score += 20; // network voices are usually higher quality
  if (/compact|espeak/.test(name)) score -= 60;
  return score;
}

// Returns every voice that can plausibly speak this language, best-quality
// first, so both auto-selection and the manual voice picker use the same
// ranked list.
function candidateVoices(voices: SpeechSynthesisVoice[], tag: string) {
  const lang = tag.toLowerCase(); // e.g. hi-in
  const baseLang = lang.split('-')[0]; // e.g. hi

  return voices
    .filter((v) => {
      const vLang = v.lang.toLowerCase();
      return vLang === lang || vLang.startsWith(baseLang);
    })
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

export default function TextToSpeech({ text }: { text: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('policy');
  const tag = localeSpeechTags[locale];

  const [supported, setSupported] = useState(true);
  const [allVoices, setAllVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [state, setState] = useState<PlayState>('idle');
  const [loading, setLoading] = useState(false);
  // Default to a slower-than-normal rate: browser speechSynthesis at 1x
  // reads noticeably fast for many Indian-language voices.
  const [rate, setRate] = useState(0.75);

  // Whether the Google Cloud TTS route is configured server-side at all
  // (cheap ping, no character cost) — null while we haven't checked yet.
  const [cloudConfigured, setCloudConfigured] = useState<boolean | null>(null);
  // Whether an actual cloud synthesis attempt has failed for the current
  // text/language, so we stop retrying it and just use the browser voice.
  const [cloudFailed, setCloudFailed] = useState(false);

  const engineRef = useRef<Engine>('browser');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const candidates = useMemo(() => candidateVoices(allVoices, tag), [allVoices, tag]);
  const voiceFound = candidates.length > 0;
  // Only warn about a missing voice once we actually know there's no way
  // to speak this text at all (cloud isn't configured/failed AND the
  // browser has nothing usable either).
  const noVoiceAvailable = !voiceFound && (cloudConfigured === false || cloudFailed);

  useEffect(() => {
    fetch('/api/tts')
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => setCloudConfigured(Boolean(d.configured)))
      .catch(() => setCloudConfigured(false));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSupported(false);
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return; // not loaded yet
      setAllVoices(voices);
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  // Default the picker to the best-scoring voice whenever the language
  // changes or the browser finishes loading its voice list — but leave the
  // user's manual pick alone if it's still a valid option for this language.
  useEffect(() => {
    setSelectedVoiceURI((current) => {
      if (candidates.length === 0) return '';
      if (candidates.some((v) => v.voiceURI === current)) return current;
      return candidates[0].voiceURI;
    });
  }, [candidates]);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState('idle');
  }, []);

  // Reset per-text state (and stop any playback) whenever the text or
  // language changes, e.g. navigating between policy pages.
  useEffect(() => {
    stop();
    setCloudFailed(false);
    if (audioObjectUrlRef.current) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }
    audioRef.current = null;
  }, [text, locale, stop]);

  // Stop speaking and release resources if the component unmounts.
  useEffect(
    () => () => {
      stop();
      if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
    },
    [stop]
  );

  // Playback speed applies live to an in-progress cloud audio clip; the
  // browser voice only picks up rate changes on the next play().
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const playBrowserVoice = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = candidates.find((v) => v.voiceURI === selectedVoiceURI) || candidates[0] || null;

    utterance.lang = tag;
    if (voice) utterance.voice = voice;
    utterance.rate = rate;

    utterance.onend = () => setState('idle');
    utterance.onerror = () => setState('idle');

    utteranceRef.current = utterance;
    engineRef.current = 'browser';
    window.speechSynthesis.speak(utterance);
    setState('playing');
  };

  const play = async () => {
    if (loading) return;

    const shouldTryCloud = cloudConfigured !== false && !cloudFailed;
    if (shouldTryCloud) {
      setLoading(true);
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, languageCode: tag }),
        });

        if (res.ok) {
          const blob = await res.blob();
          if (audioObjectUrlRef.current) URL.revokeObjectURL(audioObjectUrlRef.current);
          const url = URL.createObjectURL(blob);
          audioObjectUrlRef.current = url;

          const audio = new Audio(url);
          audio.playbackRate = rate;
          audio.onended = () => setState('idle');
          audio.onerror = () => setState('idle');
          audioRef.current = audio;

          engineRef.current = 'cloud';
          setLoading(false);
          await audio.play();
          setState('playing');
          return;
        }

        setCloudFailed(true);
      } catch {
        setCloudFailed(true);
      }
      setLoading(false);
    }

    playBrowserVoice();
  };

  const pause = () => {
    if (engineRef.current === 'cloud') {
      audioRef.current?.pause();
    } else {
      window.speechSynthesis.pause();
    }
    setState('paused');
  };

  const resume = () => {
    if (engineRef.current === 'cloud') {
      audioRef.current?.play();
    } else {
      window.speechSynthesis.resume();
    }
    setState('playing');
  };

  if (!supported && cloudConfigured === false) {
    return <p className="text-sm text-gray-500 italic">{t('ttsUnsupported')}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
      {state === 'idle' && (
        <button
          onClick={play}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          aria-label={t('listen')}
        >
          {loading ? t('loading') : t('listen')}
        </button>
      )}
      {state === 'playing' && (
        <button
          onClick={pause}
          className="inline-flex items-center gap-2 rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t('pause')}
        </button>
      )}
      {state === 'paused' && (
        <button
          onClick={resume}
          className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {t('resume')}
        </button>
      )}
      {state !== 'idle' && (
        <button
          onClick={stop}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('stop')}
        </button>
      )}

      <label className="flex items-center gap-2 text-sm text-gray-600">
        {t('speed')}
        <select
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="rounded border border-gray-300 px-2 py-1"
        >
          <option value={0.5}>0.5x (slowest)</option>
          <option value={0.6}>0.6x</option>
          <option value={0.75}>0.75x (default)</option>
          <option value={0.9}>0.9x</option>
          <option value={1}>1x (normal)</option>
          <option value={1.25}>1.25x</option>
        </select>
      </label>

      {/* Manual browser-voice picker: mainly useful when cloud TTS isn't
          configured/available, since the cloud voice is chosen server-side. */}
      {(cloudConfigured === false || cloudFailed) && candidates.length > 1 && (
        <label className="flex items-center gap-2 text-sm text-gray-600">
          {t('voice')}
          <select
            value={selectedVoiceURI}
            onChange={(e) => setSelectedVoiceURI(e.target.value)}
            className="max-w-[200px] rounded border border-gray-300 px-2 py-1"
          >
            {candidates.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {noVoiceAvailable && (
        <p className="w-full text-xs text-amber-700">{t('voiceUnavailable')}</p>
      )}
    </div>
  );
}
