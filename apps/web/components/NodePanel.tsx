'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ChevronDown, X } from 'lucide-react';
import type { IssueContext } from '@lattice/types';
import { api } from '../lib/api';
import { IssueState } from './Octicon';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

const TYPE_LABEL: Record<string, string> = {
  hard_blocker: 'must exist first',
  data_contract: 'defines a shape this uses',
  shared_artifact: 'touches the same code',
  ordering_preference: 'nicer in this order',
};

function EdgeRow({ other, title, state, edge }: {
  other: number; title: string; state: string; edge: any;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-md border bg-background">
      <button onClick={() => setOpen(!open)}
              className="flex w-full cursor-pointer items-start gap-2 px-2.5 py-2 text-left">
        <IssueState state={state} className="mt-px h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium">{title}</span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">
            <span className="font-mono">#{other}</span>
            {' · '}{TYPE_LABEL[edge.type] ?? edge.type}
            {!edge.blocking && ' · not blocking'}
          </span>
        </span>
        <ChevronDown className={cn('mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                                    open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-2 px-2.5 pb-2.5">
          <p className="text-[12px] leading-relaxed">{edge.rationale}</p>
          {edge.evidence && (
            <blockquote className="border-l-2 border-primary/50 pl-2 text-[11.5px] italic leading-relaxed text-muted-foreground">
              “{edge.evidence.quote}”
              <span className="not-italic"> — #{edge.evidence.issue}</span>
            </blockquote>
          )}
          <p className="text-[11px] text-muted-foreground">
            {Math.round(edge.confidence * 100)}% confident · from {edge.source === 'given'
              ? 'GitHub' : edge.source === 'agent_reported' ? 'an agent' : 'the model'}
          </p>
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
    <aside className="w-[380px] shrink-0 overflow-y-auto border-l bg-card">
      <div className="sticky top-0 z-10 flex items-start gap-2 border-b bg-card px-4 py-3">
        <IssueState state={ctx?.issue.state ?? 'open'} className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold leading-snug">
            {ctx?.issue.title ?? (error ? 'Not found' : 'Loading…')}
          </h2>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">#{number}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close panel"
                className="-mr-1 h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {error && <p className="p-4 text-[12px] text-muted-foreground">{error}</p>}

      {ctx && (
        <div className="space-y-5 p-4">
          {ctx.schedule && (
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Unblocks', String(ctx.schedule.blastRadius)],
                ['Wave', ctx.schedule.wave === 0 ? 'Ready' : String(ctx.schedule.wave)],
                ['Effort', `${ctx.schedule.effortDays}d`],
                ['Slack', `${ctx.schedule.slackDays.toFixed(0)}d`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md border bg-background px-2.5 py-2">
                  <div className="text-[11px] text-muted-foreground">{k}</div>
                  <div className="mt-0.5 text-[15px] font-semibold tabular-nums">{v}</div>
                </div>
              ))}
            </div>
          )}

          {ctx.issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {ctx.issue.labels.map((l) => <Badge key={l} variant="muted">{l}</Badge>)}
            </div>
          )}

          <Button variant="outline" className="w-full" asChild>
            <a href={ctx.issue.htmlUrl} target="_blank" rel="noreferrer">
              View on GitHub <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </Button>

          <section>
            <h3 className="mb-2 text-[12px] font-semibold">
              Waiting on <span className="text-muted-foreground">({ctx.blockers.length})</span>
            </h3>
            {ctx.blockers.length === 0
              ? <p className="rounded-md border border-dashed px-3 py-2.5 text-[12px] text-muted-foreground">
                  Nothing. This one can be started now.
                </p>
              : <ul className="space-y-1.5">
                  {ctx.blockers.map((b) => (
                    <EdgeRow key={b.number} other={b.number} title={b.title} state={b.state} edge={b.edge} />
                  ))}
                </ul>}
          </section>

          <section>
            <h3 className="mb-2 text-[12px] font-semibold">
              Unblocks <span className="text-muted-foreground">({ctx.dependents.length})</span>
            </h3>
            {ctx.dependents.length === 0
              ? <p className="rounded-md border border-dashed px-3 py-2.5 text-[12px] text-muted-foreground">
                  Nothing depends on this yet.
                </p>
              : <ul className="space-y-1.5">
                  {ctx.dependents.map((d) => (
                    <EdgeRow key={d.number} other={d.number} title={d.title} state={d.state} edge={d.edge} />
                  ))}
                </ul>}
          </section>
        </div>
      )}
    </aside>
  );
}
