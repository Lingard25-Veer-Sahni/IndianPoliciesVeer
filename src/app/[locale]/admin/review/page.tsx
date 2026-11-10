'use client';

import { useEffect, useState, useCallback } from 'react';

interface PendingChange {
  id: number;
  type: 'add' | 'amend' | 'delete';
  slug: string | null;
  title: string | null;
  summary: string | null;
  proposedContent: unknown;
  source: 'ai' | 'manual';
  createdAt: string;
}

// Internal-only tool: lists AI-staged (or manually-added) pending changes
// and lets a reviewer approve/reject them. Not linked from the public nav —
// reachable only by direct URL. Auth is a simple shared secret entered via
// a password field, sent as the x-admin-secret header; this is a low-stakes
// internal tool, not a real auth system.
export default function AdminReviewPage() {
  const [secret, setSecret] = useState('');
  const [changes, setChanges] = useState<PendingChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!secret) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/review', {
        headers: { 'x-admin-secret': secret },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed to load pending changes');
      setChanges(data.changes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => {
    if (secret) load();
  }, [secret, load]);

  async function review(id: number, action: 'approve' | 'reject') {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch('/api/admin/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Failed to review change');
      setChanges((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900">Admin: Review pending changes</h1>
      <p className="mt-2 text-sm text-gray-600">
        Internal tool. Enter the admin secret to load and review AI-staged changes.
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

      {!loading && secret && changes.length === 0 && !error && (
        <p className="mt-6 text-sm text-gray-500">No pending changes.</p>
      )}

      <div className="mt-6 space-y-4">
        {changes.map((c) => (
          <div key={c.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium uppercase text-gray-700">
                {c.type}
              </span>
              <span className="text-xs text-gray-400">{c.source} · {new Date(c.createdAt).toLocaleString()}</span>
            </div>
            <h2 className="mt-2 text-base font-semibold text-gray-900">{c.title || c.slug}</h2>
            <p className="mt-1 text-sm text-gray-600">{c.summary}</p>
            {c.proposedContent !== null && c.proposedContent !== undefined ? (
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-700">
                {JSON.stringify(c.proposedContent, null, 2)}
              </pre>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => review(c.id, 'approve')}
                disabled={busyId === c.id}
                className="rounded-lg bg-indiagreen px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => review(c.id, 'reject')}
                disabled={busyId === c.id}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
