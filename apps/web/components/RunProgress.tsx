'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RunSummary } from '@lattice/types';
import { api } from '../lib/api';

const STEPS = [
  'Reading issues from GitHub',
  'Collecting existing dependencies',
  'Inferring the dependency graph',
  'Validating evidence',
  'Breaking cycles and scheduling',
];

/**
 * A first analysis takes minutes because the whole backlog goes to the model in
 * one pass. Polling with a visible sense of what is happening beats a spinner.
 */
export function RunProgress({ repo, unreachable }: { repo: string; unreachable: boolean }) {
  const router = useRouter();
  const [run, setRun] = useState<RunSummary | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (unreachable) return;
    const tick = setInterval(() => setElapsed((s) => s + 1), 1000);
    const poll = setInterval(async () => {
      try {
        const runs = await api.runs(repo);
        const latest = runs[0] ?? null;
        setRun(latest);
        if (latest && latest.status !== 'running') {
          clearInterval(poll); clearInterval(tick);
          if (latest.status === 'failed') setError(latest.error ?? 'The run failed.');
          else router.refresh();
        }
      } catch { /* backend restarting; keep polling */ }
    }, 3000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [repo, unreachable, router]);

  const start = async () => {
    setStarting(true); setError(null);
    try { await api.startRun(repo); setElapsed(0); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setStarting(false); }
  };

  if (unreachable) {
    return (
      <main className="mx-auto max-w-lg px-6 py-24 text-center space-y-3">
        <h1 className="text-lg font-medium">Backend not reachable</h1>
        <code className="block text-[12px] rounded px-3 py-2 font-mono"
              style={{ background: '#141821', color: '#58a6ff' }}>
          npm start -w @lattice/backend
        </code>
      </main>
    );
  }

  const running = run?.status === 'running';
  const step = Math.min(STEPS.length - 1, Math.floor(elapsed / 45));

  return (
    <main className="mx-auto max-w-lg px-6 py-24">
      <h1 className="text-lg font-medium">{repo}</h1>

      {running ? (
        <>
          <p className="mt-1 text-[13px]" style={{ color: '#8b93a7' }}>
            Analysing — {Math.floor(elapsed / 60)}m {elapsed % 60}s elapsed.
          </p>
          <ul className="mt-6 space-y-2.5">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2.5 text-[13px]"
                  style={{ color: i < step ? '#3fb950' : i === step ? '#e6e9ef' : '#4a5261' }}>
                <span className="w-4 shrink-0 text-center">
                  {i < step ? '✓' : i === step ? '·' : ''}
                </span>
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-[11.5px] leading-relaxed" style={{ color: '#5a6274' }}>
            The whole backlog goes to the model in a single request, so this takes a
            few minutes on a first run. Re-runs are near-instant — responses are
            cached by prompt hash.
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 text-[13px]" style={{ color: '#8b93a7' }}>
            {error ?? 'No analysis yet for this repository.'}
          </p>
          <button onClick={start} disabled={starting}
                  className="mt-5 rounded-lg px-4 py-2.5 text-[13px] font-medium disabled:opacity-50"
                  style={{ background: '#58a6ff', color: '#0b0d12' }}>
            {starting ? 'Starting…' : 'Analyse this repository'}
          </button>
        </>
      )}
    </main>
  );
}
