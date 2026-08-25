'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RUN_PHASES, type RunSummary } from '@lattice/types';
import { api } from '../lib/api';
import { Button } from './ui/button';

const ORDER: string[] = RUN_PHASES.map((p) => p.id);

/**
 * Reports what the pipeline is actually doing.
 *
 * The first version stepped through a fixed list on a timer, which looked like
 * progress and told you nothing - it would happily claim "validating evidence"
 * while the model call was still open. Every line here comes from the run row,
 * including a live count of candidate dependencies streamed from inside the
 * model call itself.
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
    }, 1500);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [repo, unreachable, router]);

  const start = async () => {
    setStarting(true); setError(null);
    try { await api.startRun(repo); setElapsed(0); setRun(null); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setStarting(false); }
  };

  if (unreachable) {
    return (
      <main className="mx-auto max-w-lg px-6 py-24 text-center space-y-3">
        <h1 className="text-[17px] font-semibold tracking-tight">Backend not reachable</h1>
        <code className="block rounded bg-secondary px-3 py-2 font-mono text-[12px] text-primary">
          npm start -w @lattice/backend
        </code>
      </main>
    );
  }

  const running = run?.status === 'running';
  const current = run?.phase ?? null;
  const currentIndex = current === 'done' ? ORDER.length : ORDER.indexOf(current ?? '');
  const progress = (run?.progress ?? {}) as Record<string, number>;
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <main className="mx-auto max-w-lg px-6 py-24">
      <h1 className="text-[17px] font-semibold tracking-tight">{repo}</h1>

      {running || (run && currentIndex >= 0 && !error) ? (
        <>
          <p className="mt-1 font-mono text-[13px] text-muted-foreground">
            {mm}:{ss}
          </p>

          <ul className="mt-6 space-y-2.5">
            {RUN_PHASES.map((p, i) => {
              const done = currentIndex > i;
              const active = currentIndex === i;
              return (
                <li key={p.id}
                    className={`flex items-start gap-2.5 text-[13px] ${
                      done ? 'text-[hsl(var(--ready))]'
                      : active ? 'text-foreground'
                      : 'text-muted-foreground/60'}`}>
                  <span className="w-4 shrink-0 text-center mt-px">
                    {done ? '✓' : active ? <Spinner /> : '·'}
                  </span>
                  <span className="flex-1">
                    {/* The active step shows the pipeline's own words. */}
                    {active && run?.phaseDetail ? run.phaseDetail : p.label}
                  </span>
                </li>
              );
            })}
          </ul>

          {current === 'infer' && (
            <p className="mt-5 text-[12px] text-primary">
              {progress.found
                ? `${progress.found} candidate ${progress.found === 1 ? 'dependency' : 'dependencies'} so far`
                : 'The whole backlog goes to the model in one pass — this is the slow part.'}
            </p>
          )}

          <p className="mt-6 text-[11.5px] leading-relaxed text-muted-foreground">
            A first analysis takes a few minutes. Re-runs are near-instant — model
            responses are cached by prompt hash.
          </p>
        </>
      ) : (
        <>
          <p className={`mt-1 text-[13px] ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
            {error ?? 'No analysis yet for this repository.'}
          </p>
          <Button onClick={start} disabled={starting} className="mt-5">
            {starting ? 'Starting…' : 'Analyse this repository'}
          </Button>
        </>
      )}
    </main>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-3 h-3 rounded-full align-middle"
          style={{
            border: '1.5px solid hsl(var(--border))', borderTopColor: 'hsl(var(--primary))',
            animation: 'lattice-spin .7s linear infinite',
          }} />
  );
}
