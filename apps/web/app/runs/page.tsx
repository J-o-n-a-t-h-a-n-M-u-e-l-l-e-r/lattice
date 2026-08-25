'use client';
import { useEffect, useState } from 'react';
import type { RunSummary } from '@lattice/types';
import { api, type RunDetail } from '../../lib/api';

const REASON_LABEL: Record<string, string> = {
  fabricated_evidence: 'evidence not found in the issue',
  unknown_or_self_id: 'invented or self-referential issue id',
  contradicts_given: 'contradicts a dependency recorded in GitHub',
  density_cap: 'over the density cap (topic-matching, not reasoning)',
  suppressed: 'suppressed by a human',
  schema_invalid: 'malformed response',
};

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className="rounded-md border" style={{ borderColor: 'var(--line)' }}>
      <button onClick={() => setOpen(!open)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px]">
        <span style={{ color: 'var(--muted)' }}>{open ? '▾' : '▸'}</span>
        <span>{title}</span>
        <span className="font-mono" style={{ color: 'var(--muted)' }}>({count})</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

export default function RunsPage() {
  const repo = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('repo') ?? undefined
    : undefined;
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.runs(repo).then(setRuns).catch((e) => setError(e.message)); }, [repo]);
  useEffect(() => {
    if (runs?.[0] && !detail) api.run(runs[0].id).then(setDetail).catch(() => {});
  }, [runs, detail]);

  if (error) return <main className="p-8 text-[13px]" style={{ color: 'var(--muted)' }}>{error}</main>;
  if (!runs) return <main className="p-8 text-[13px]" style={{ color: 'var(--muted)' }}>Loading…</main>;
  if (runs.length === 0) {
    return (
      <main className="p-8 max-w-2xl">
        <h1 className="text-lg font-medium mb-2">No runs yet</h1>
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          The pipeline triggers on issue events and an hourly schedule. To run it by hand:
        </p>
        <code className="inline-block mt-3 text-[12px] rounded px-3 py-2 font-mono"
              style={{ background: 'var(--panel)', color: 'var(--accent)' }}>npm run analyze</code>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-medium">Runs</h1>
        <p className="text-[12.5px] mt-1 leading-relaxed" style={{ color: 'var(--muted)' }}>
          The pipeline runs unsupervised, so this is where it accounts for itself — what it
          proposed, what the validators threw out, and which cycles it cut.
        </p>
      </div>

      <table className="w-full text-[12px]">
        <thead>
          <tr className="text-left" style={{ color: 'var(--muted)' }}>
            {['Started', 'Trigger', 'Status', 'Requests', 'Proposed', 'Kept', 'Blocking', ''].map((h) => (
              <th key={h} className="font-normal pb-2 pr-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t" style={{ borderColor: 'var(--line)' }}>
              <td className="py-2 pr-3 font-mono">{new Date(r.startedAt).toLocaleString()}</td>
              <td className="py-2 pr-3">{r.trigger}</td>
              <td className="py-2 pr-3">
                <span style={{ color: r.status === 'ok' ? 'var(--ready)' : r.status === 'failed' ? '#f85149' : 'var(--critical)' }}>
                  {r.status}
                </span>
              </td>
              <td className="py-2 pr-3 font-mono">{r.requests}{r.cacheHits ? ` (+${r.cacheHits} cached)` : ''}</td>
              <td className="py-2 pr-3 font-mono">{r.edgesProposed}</td>
              <td className="py-2 pr-3 font-mono">{r.edgesKept}</td>
              <td className="py-2 pr-3 font-mono">{r.edgesBlocking}</td>
              <td className="py-2">
                <button className="hover:text-white" style={{ color: 'var(--accent)' }}
                        onClick={() => api.run(r.id).then(setDetail)}>details</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {detail && (
        <div className="space-y-2">
          <h2 className="text-[13px] font-medium">
            Run {detail.id.slice(0, 8)} · {detail.durationMs ? `${(detail.durationMs / 1000).toFixed(0)}s` : '—'}
          </h2>

          <Section title="Rejected by the validators" count={detail.rejections.length}>
            <ul className="space-y-1.5">
              {detail.rejections.map((r, i) => (
                <li key={i} className="text-[11.5px] rounded px-2.5 py-2" style={{ background: 'var(--panel-2)' }}>
                  <span className="font-mono" style={{ color: 'var(--accent)' }}>
                    #{r.blocked} ← #{r.blockedBy}
                  </span>
                  <span style={{ color: '#f85149' }}> · {REASON_LABEL[r.reason] ?? r.reason}</span>
                  {r.confidence !== null && (
                    <span className="font-mono" style={{ color: 'var(--muted)' }}> · {r.confidence.toFixed(2)}</span>
                  )}
                  <div style={{ color: 'var(--muted)' }}>{r.rationale}</div>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Cycles broken" count={detail.cycleBreaks.length}>
            <ul className="space-y-1.5">
              {detail.cycleBreaks.map((c, i) => (
                <li key={i} className="text-[11.5px] rounded px-2.5 py-2" style={{ background: 'var(--panel-2)' }}>
                  <div className="font-mono" style={{ color: 'var(--critical)' }}>
                    {c.cycle.map((n) => `#${n}`).join(' → ')}
                  </div>
                  <div style={{ color: 'var(--muted)' }}>
                    {c.victim
                      ? `cut #${c.victim.blocked} ← #${c.victim.blockedBy} (lowest weight on the loop)`
                      : 'every edge is ground truth from GitHub — excluded from scheduling rather than guessed at'}
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Stored but not blocking" count={detail.belowThreshold.length}>
            <ul className="space-y-1.5">
              {detail.belowThreshold.map((e, i) => (
                <li key={i} className="text-[11.5px] rounded px-2.5 py-2" style={{ background: 'var(--panel-2)' }}>
                  <span className="font-mono" style={{ color: 'var(--accent)' }}>
                    #{e.blocked} ← #{e.blockedBy}
                  </span>
                  <span className="font-mono" style={{ color: 'var(--muted)' }}> · {e.confidence.toFixed(2)} · {e.type}</span>
                  <div style={{ color: 'var(--muted)' }}>{e.rationale}</div>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </main>
  );
}
