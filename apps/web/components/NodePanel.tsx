'use client';
import { useEffect, useState } from 'react';
import type { IssueContext } from '@lattice/types';
import { api } from '../lib/api';

const TYPE_LABEL: Record<string, string> = {
  hard_blocker: 'hard blocker',
  data_contract: 'data contract',
  shared_artifact: 'shared artifact',
  ordering_preference: 'ordering preference',
};

function EdgeRow({ other, title, edge, direction }: {
  other: number; title: string; edge: any; direction: 'blocker' | 'dependent';
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-md border" style={{ borderColor: 'var(--line)', background: 'var(--panel-2)' }}>
      <button onClick={() => setOpen(!open)} className="w-full text-left px-2.5 py-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px]" style={{ color: 'var(--accent)' }}>#{other}</span>
          <span className="text-[12px] flex-1 truncate">{title}</span>
          {!edge.blocking && (
            <span className="text-[9px] uppercase tracking-wide px-1 rounded shrink-0"
                  style={{ color: 'var(--muted)', background: 'rgba(139,147,167,.12)' }}>
              non-blocking
            </span>
          )}
          <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--muted)' }}>
            {edge.confidence.toFixed(2)}
          </span>
        </div>
        <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
          {TYPE_LABEL[edge.type] ?? edge.type} · {edge.source}
        </div>
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 pt-0 space-y-1.5">
          <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--ink)' }}>
            {edge.rationale}
          </p>
          {edge.evidence && (
            <blockquote className="text-[11px] leading-relaxed border-l-2 pl-2 italic"
                        style={{ borderColor: 'var(--accent)', color: 'var(--muted)' }}>
              “{edge.evidence.quote}”
              <span className="not-italic"> — from #{edge.evidence.issue}</span>
            </blockquote>
          )}
        </div>
      )}
    </li>
  );
}

export function NodePanel({ number, repo, onClose }: {
  number: number; repo?: string; onClose: () => void;
}) {
  const [ctx, setCtx] = useState<IssueContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCtx(null); setError(null);
    api.issue(number, repo).then(setCtx).catch((e) => setError(e.message));
  }, [number, repo]);

  return (
    <aside className="w-[400px] shrink-0 border-l overflow-y-auto"
           style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
      <div className="sticky top-0 flex items-start gap-2 px-4 py-3 border-b"
           style={{ borderColor: 'var(--line)', background: 'var(--panel)' }}>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>#{number}</div>
          <h2 className="text-[14px] font-medium leading-snug mt-0.5">
            {ctx?.issue.title ?? (error ? 'Not found' : 'Loading…')}
          </h2>
        </div>
        <button onClick={onClose} className="text-lg leading-none px-1 hover:text-white"
                style={{ color: 'var(--muted)' }} aria-label="Close">×</button>
      </div>

      {error && <p className="p-4 text-[12px]" style={{ color: 'var(--muted)' }}>{error}</p>}

      {ctx && (
        <div className="p-4 space-y-5">
          {ctx.schedule && (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {[
                ['Wave', ctx.schedule.wave],
                ['Unblocks', ctx.schedule.blastRadius],
                ['Effort', `${ctx.schedule.effortDays}d`],
                ['Slack', `${ctx.schedule.slackDays.toFixed(1)}d`],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-md px-2.5 py-2"
                     style={{ background: 'var(--panel-2)' }}>
                  <div style={{ color: 'var(--muted)' }}>{k}</div>
                  <div className="font-mono text-[13px] mt-0.5">{v}</div>
                </div>
              ))}
            </div>
          )}

          <a href={ctx.issue.htmlUrl} target="_blank" rel="noreferrer"
             className="block text-center text-[12px] rounded-md py-2 border transition-colors hover:border-white"
             style={{ borderColor: 'var(--line)', color: 'var(--accent)' }}>
            Open #{number} on GitHub ↗
          </a>

          <section>
            <h3 className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
              Blocked by ({ctx.blockers.length})
            </h3>
            {ctx.blockers.length === 0
              ? <p className="text-[12px]" style={{ color: 'var(--muted)' }}>Nothing. This is startable now.</p>
              : <ul className="space-y-1.5">
                  {ctx.blockers.map((b) => (
                    <EdgeRow key={b.number} other={b.number} title={b.title} edge={b.edge} direction="blocker" />
                  ))}
                </ul>}
          </section>

          <section>
            <h3 className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
              Blocks ({ctx.dependents.length})
            </h3>
            {ctx.dependents.length === 0
              ? <p className="text-[12px]" style={{ color: 'var(--muted)' }}>Nothing depends on this yet.</p>
              : <ul className="space-y-1.5">
                  {ctx.dependents.map((d) => (
                    <EdgeRow key={d.number} other={d.number} title={d.title} edge={d.edge} direction="dependent" />
                  ))}
                </ul>}
          </section>

          {ctx.issue.body && (
            <section>
              <h3 className="text-[11px] uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>
                Issue
              </h3>
              <p className="text-[11.5px] leading-relaxed whitespace-pre-wrap"
                 style={{ color: 'var(--muted)' }}>
                {ctx.issue.body.slice(0, 600)}{ctx.issue.body.length > 600 ? '…' : ''}
              </p>
            </section>
          )}
        </div>
      )}
    </aside>
  );
}
