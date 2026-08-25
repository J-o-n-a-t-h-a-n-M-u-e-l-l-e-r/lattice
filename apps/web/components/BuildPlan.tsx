'use client';
import { useEffect, useState } from 'react';
import { Check, Copy, Route } from 'lucide-react';
import { api, type BuildPlan as Plan } from '../lib/api';
import { IssueState } from './Octicon';
import { Button } from './ui/button';

/**
 * The bottom-up view: you already know which issue you want, this is what has
 * to exist first. list_ready_work is the dispatcher's question; this is the
 * question someone with a goal actually asks.
 */
export function BuildPlan({ number, repo }: { number: number; repo?: string }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPlan(null); setError(null);
    api.plan(number, repo).then(setPlan).catch((e) => setError(e.message));
  }, [number, repo]);

  if (error) return <p className="text-[12px] text-muted-foreground">{error}</p>;
  if (!plan) return <p className="text-[12px] text-muted-foreground">Working out the order…</p>;

  if (plan.ready) {
    return (
      <p className="rounded-md border border-dashed px-3 py-2.5 text-[12px] text-muted-foreground">
        Nothing has to be built first — this one can be started now.
      </p>
    );
  }

  // What you hand an agent. The order is the whole point, so it leads.
  const prompt = [
    `Work towards #${plan.target.number}: ${plan.target.title}`,
    `${plan.target.url}`,
    '',
    'It is blocked. Build these first, in this order — everything inside a step',
    'is independent and can be done in any order or in parallel:',
    '',
    ...plan.steps.flatMap((s) => [
      `Step ${s.step}${s.parallel > 1 ? ` (${s.parallel} independent)` : ''}:`,
      ...s.issues.map((i) => `  #${i.number} ${i.title}\n    ${i.url}`),
    ]),
    '',
    `Then #${plan.target.number} itself.`,
    '',
    'Use the lattice MCP server for context on any of them: get_issue_context,',
    'explain_dependency, and plan_for_issue.',
  ].join('\n');

  const copy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-muted-foreground">
        <span className="font-medium text-foreground">
          {plan.remaining_prerequisites} issues
        </span>{' '}
        must land first, in {plan.steps.length} step{plan.steps.length === 1 ? '' : 's'}.{' '}
        {plan.remaining_effort_days}d of work
        {plan.critical_path_days < plan.remaining_effort_days
          ? `, ${plan.critical_path_days}d if you parallelise.`
          : ' — it is one chain, so parallelising does not help.'}
        {plan.already_done.length > 0 && ` ${plan.already_done.length} already done.`}
      </p>

      <ol className="space-y-2">
        {plan.steps.map((s) => (
          <li key={s.step} className="rounded-md border bg-background">
            <div className="flex items-center gap-2 border-b px-2.5 py-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {s.step}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {s.parallel > 1 ? `${s.parallel} in parallel` : 'then'}
              </span>
            </div>
            <ul className="divide-y">
              {s.issues.map((i) => (
                <li key={i.number} className="flex items-start gap-2 px-2.5 py-2">
                  <IssueState state={i.state} className="mt-px h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <a href={i.url} target="_blank" rel="noreferrer"
                       className="block truncate text-[12px] font-medium hover:underline">
                      {i.title}
                    </a>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      <span className="font-mono">#{i.number}</span>
                      {' · '}{i.effort_days}d
                      {i.on_critical_path && (
                        <span className="text-[hsl(var(--critical))]"> · critical path</span>
                      )}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-2">
        <Route className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-[11px] leading-snug text-muted-foreground">
          Hand this whole plan to your agent
        </span>
        <Button size="sm" variant={copied ? 'secondary' : 'outline'} onClick={copy}>
          {copied ? <><Check className="h-3.5 w-3.5" /> Copied</>
                  : <><Copy className="h-3.5 w-3.5" /> Copy</>}
        </Button>
      </div>
    </div>
  );
}
