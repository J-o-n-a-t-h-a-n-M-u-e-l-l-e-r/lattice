'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '../lib/api';

/** Accepts owner/name, a github.com URL, or a git remote. */
function normalise(input: string): string | null {
  const s = input.trim().replace(/\.git$/, '');
  const url = /github\.com[/:]([^/]+)\/([^/?#]+)/i.exec(s);
  if (url) return `${url[1]}/${url[2]}`;
  const plain = /^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/.exec(s);
  return plain ? `${plain[1]}/${plain[2]}` : null;
}

export function RepoForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const repo = normalise(value);
    if (!repo) { setError('Expected owner/name or a GitHub URL.'); return; }
    setBusy(true); setError(null);
    try {
      await api.startRun(repo);
      router.push(`/r/${repo}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(null); }}
          placeholder="github.com/owner/repo"
          spellCheck={false}
          autoFocus
          className="flex-1 rounded-lg border px-3.5 py-2.5 text-[13px] outline-none transition-colors focus:border-white/40"
          style={{ borderColor: '#2a3140', background: '#141821', color: '#e6e9ef' }}
        />
        <button type="submit" disabled={busy}
                className="rounded-lg px-4 py-2.5 text-[13px] font-medium transition-opacity disabled:opacity-50"
                style={{ background: '#58a6ff', color: '#0b0d12' }}>
          {busy ? 'Starting…' : 'Analyse'}
        </button>
      </div>
      {error && <p className="mt-2 text-[12px]" style={{ color: '#f85149' }}>{error}</p>}
      <p className="mt-2 text-[11.5px]" style={{ color: '#5a6274' }}>
        A first analysis takes a few minutes — the whole backlog goes to the model in one pass.
      </p>
    </form>
  );
}
