import type { Edge, Issue } from '@lattice/types';
import { effortDays } from './schedule.js';

/**
 * Bottom-up planning: "I want to ship #26 - what has to exist first?"
 *
 * The top-down view answers "what can I start now", which is the right
 * question for whoever is handing work out. It is the wrong question for
 * someone who already knows what they want. This walks the graph the other
 * way: the transitive closure of everything the target depends on, ordered so
 * each step only needs what the steps before it produced.
 */

export interface PlanIssue {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed';
  effort_days: number;
  /** Which issues in this plan this one unblocks. */
  unblocks: number[];
  /** Why it is in the plan: the edge that pulls it in. */
  why: string;
  on_critical_path: boolean;
}

export interface BuildPlan {
  target: { number: number; title: string; url: string; state: string };
  /** True when nothing is left to build first. */
  ready: boolean;
  /** Prerequisites in build order. Everything in a step is independent. */
  steps: Array<{ step: number; parallel: number; issues: PlanIssue[] }>;
  total_prerequisites: number;
  remaining_prerequisites: number;
  already_done: number[];
  remaining_effort_days: number;
  /** Shortest possible wall-clock if every step ran fully parallel. */
  critical_path_days: number;
  notes?: string;
}

export function buildPlan(
  issues: Issue[], edges: Edge[], target: number,
): BuildPlan | { error: string } {
  const byNumber = new Map(issues.map((i) => [i.number, i]));
  const t = byNumber.get(target);
  if (!t) return { error: 'unknown_issue' };

  const live = edges.filter((e) => e.blocking && !e.suppressed);
  const blockers = new Map<number, Edge[]>();
  for (const e of live) {
    if (!blockers.has(e.blocked)) blockers.set(e.blocked, []);
    blockers.get(e.blocked)!.push(e);
  }

  // Transitive closure upwards. Closed prerequisites are recorded but their own
  // blockers are not followed - if it is done, what it needed is moot.
  const inPlan = new Set<number>();
  const why = new Map<number, string>();
  const stack: number[] = [target];
  const done: number[] = [];

  while (stack.length) {
    const cur = stack.pop()!;
    for (const e of blockers.get(cur) ?? []) {
      const dep = byNumber.get(e.blockedBy);
      if (!dep || inPlan.has(e.blockedBy)) continue;
      inPlan.add(e.blockedBy);
      why.set(e.blockedBy, e.rationale || `#${cur} depends on it`);
      if (dep.state === 'closed') { done.push(e.blockedBy); continue; }
      stack.push(e.blockedBy);
    }
  }

  const open = [...inPlan].filter((n) => byNumber.get(n)!.state === 'open');
  const openSet = new Set(open);

  // Layer within the plan, not within the whole backlog: a prerequisite is in
  // step 1 when nothing else in this plan has to come first.
  const planBlockers = new Map<number, number[]>();
  for (const n of open) {
    planBlockers.set(n, (blockers.get(n) ?? [])
      .map((e) => e.blockedBy)
      .filter((b) => openSet.has(b)));
  }

  const depth = new Map<number, number>();
  const resolve = (n: number, seen = new Set<number>()): number => {
    if (depth.has(n)) return depth.get(n)!;
    if (seen.has(n)) return 0;               // defensive: the DAG guarantee holds upstream
    seen.add(n);
    const bs = planBlockers.get(n) ?? [];
    const d = bs.length === 0 ? 0 : Math.max(...bs.map((b) => resolve(b, seen) + 1));
    depth.set(n, d);
    return d;
  };
  for (const n of open) resolve(n);

  // Longest weighted chain inside the plan, plus the target itself.
  const finish = new Map<number, number>();
  const order = [...open].sort((a, b) => resolve(a) - resolve(b));
  for (const n of order) {
    const bs = planBlockers.get(n) ?? [];
    const start = bs.length === 0 ? 0 : Math.max(...bs.map((b) => finish.get(b) ?? 0));
    finish.set(n, start + effortDays(byNumber.get(n)!));
  }
  const criticalWithin = open.length ? Math.max(...open.map((n) => finish.get(n) ?? 0)) : 0;
  const critical = new Set(
    open.filter((n) => Math.abs((finish.get(n) ?? 0) - criticalWithin) < 1e-9));
  // Walk the chain back so the whole path is marked, not just its endpoint.
  const walk = [...critical];
  while (walk.length) {
    const n = walk.pop()!;
    const startsAt = (finish.get(n) ?? 0) - effortDays(byNumber.get(n)!);
    for (const b of planBlockers.get(n) ?? []) {
      if (!critical.has(b) && Math.abs((finish.get(b) ?? 0) - startsAt) < 1e-9) {
        critical.add(b); walk.push(b);
      }
    }
  }

  const dependentsInPlan = new Map<number, number[]>();
  for (const n of [...open, target]) {
    for (const b of (blockers.get(n) ?? []).map((e) => e.blockedBy)) {
      if (!openSet.has(b)) continue;
      if (!dependentsInPlan.has(b)) dependentsInPlan.set(b, []);
      dependentsInPlan.get(b)!.push(n);
    }
  }

  const maxDepth = open.length ? Math.max(...open.map((n) => depth.get(n) ?? 0)) : -1;
  const steps: BuildPlan['steps'] = [];
  for (let d = 0; d <= maxDepth; d++) {
    const group = open
      .filter((n) => depth.get(n) === d)
      .sort((a, b) => (dependentsInPlan.get(b)?.length ?? 0) - (dependentsInPlan.get(a)?.length ?? 0)
                   || a - b);
    if (group.length === 0) continue;
    steps.push({
      step: steps.length + 1,
      parallel: group.length,
      issues: group.map((n) => {
        const issue = byNumber.get(n)!;
        return {
          number: n,
          title: issue.title,
          url: issue.htmlUrl,
          state: issue.state,
          effort_days: effortDays(issue),
          unblocks: (dependentsInPlan.get(n) ?? []).sort((a, b) => a - b),
          why: why.get(n) ?? '',
          on_critical_path: critical.has(n),
        };
      }),
    });
  }

  return {
    target: { number: t.number, title: t.title, url: t.htmlUrl, state: t.state },
    ready: open.length === 0,
    steps,
    total_prerequisites: inPlan.size,
    remaining_prerequisites: open.length,
    already_done: done.sort((a, b) => a - b),
    // Both numbers include the target itself. Counting it in the critical path
    // but not in the total made "14d of work, 17d if you parallelise" - which
    // reads backwards, because parallelising can never take longer.
    remaining_effort_days:
      open.reduce((s, n) => s + effortDays(byNumber.get(n)!), 0) + effortDays(t),
    critical_path_days: criticalWithin + effortDays(t),
    notes: open.length === 0
      ? `Nothing is blocking #${target}. It can be started now.`
      : `${open.length} issue(s) must land before #${target}, in ${steps.length} step(s).`,
  };
}
