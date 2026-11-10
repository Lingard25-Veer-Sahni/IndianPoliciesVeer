'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface VoiceStatus {
  voiceboxUrlConfigured: boolean;
  voice: {
    voiceboxProfileId: string | null;
    name: string | null;
    status: 'pending' | 'ready' | 'failed' | null;
    errorMessage: string | null;
    updatedAt: string;
  } | null;
}

// Internal-only tool: upload a short voice sample once and it becomes the
// ONE narration voice used for every /api/tts request on the entire site —
// see the comment at the top of src/app/api/tts/route.ts. Not linked from
// the public nav — reachable only by direct URL, same low-stakes
// shared-secret auth pattern as /[locale]/admin/review.
export default function AdminVoicePage() {
  const [secret, setSecret] = useState('');
  const [status, setStatus] = useState<VoiceStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/voice', {
        headers: { 'x-admin-secret': secret },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed to load voice status');
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => {
    if (secret) load();
  }, [secret, load]);

  async function upload() {
    if (!name.trim() || !file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('file', file);
      const res = await fetch('/api/admin/voice', {
        method: 'POST',
        headers: { 'x-admin-secret': secret },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Upload failed');
      setName('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/voice', {
        method: 'DELETE',
        headers: { 'x-admin-secret': secret },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed to remove voice');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  const voice = status?.voice;
  const isActive = voice?.status === 'ready' && voice.voiceboxProfileId;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Admin: Site narration voice</h1>
      <p className="mt-2 text-sm text-gray-600">
        Internal tool. Upload a short (10-30s), clean voice sample and it becomes the one voice
        used to read every policy aloud site-wide, replacing the Sarvam/Google/free chain (which
        stays wired up only as a safety net if the self-hosted Voicebox instance is ever
        unreachable). Requires a running{' '}
        <a
          href="https://github.com/jamiepine/voicebox"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Voicebox
        </a>{' '}
        instance with <code className="rounded bg-gray-100 px-1">VOICEBOX_URL</code> set — see{' '}
        <code className="rounded bg-gray-100 px-1">.env.example</code>.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Admin secret"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={load}
          disabled={!secret || loading}
          className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load'}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {status && !status.voiceboxUrlConfigured && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          VOICEBOX_URL is not set on the server, so uploads will fail until a Voicebox instance is
          running and configured. See .env.example.
        </p>
      )}

      {status && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Current status</h2>
          {isActive ? (
            <p className="mt-2 text-sm text-indiagreen">
              Active — &quot;{voice!.name}&quot; is narrating every page site-wide.
            </p>
          ) : voice?.status === 'pending' ? (
            <p className="mt-2 text-sm text-amber-700">
              Processing &quot;{voice.name}&quot;… refresh in a moment.
            </p>
          ) : voice?.status === 'failed' ? (
            <p className="mt-2 text-sm text-red-700">
              Last upload (&quot;{voice.name}&quot;) failed: {voice.errorMessage}
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              Not set — narration is currently using the Sarvam/Google/free engine chain.
            </p>
          )}
          {isActive && (
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {deleting ? 'Removing…' : 'Remove custom voice'}
            </button>
          )}
        </div>
      )}

      {status && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">
            {isActive ? 'Replace with a new sample' : 'Upload a sample'}
          </h2>
          <div className="mt-3 space-y-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Voice name (e.g. Narrator)"
              maxLength={100}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm"
            />
            <button
              type="button"
              onClick={upload}
              disabled={!name.trim() || !file || uploading || !status.voiceboxUrlConfigured}
              className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {uploading ? 'Uploading & processing…' : 'Upload'}
            </button>
            <p className="text-xs text-gray-500">
              Processing runs Voicebox&apos;s own speech recognition on your sample to get a real
              transcript, then attaches both to a new voice profile — this can take up to a
              minute or two.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
