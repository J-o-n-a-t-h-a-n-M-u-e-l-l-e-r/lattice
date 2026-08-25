import type { Edge, Issue, ScheduleEntry } from '@lattice/types';
import { kahn } from './acyclic.js';

const SIZE_DAYS: Record<string, number> = { 's': 1, 'm': 3, 'l': 8, 'xl': 13 };

/**
 * Effort in days, in priority order: an explicit `size:*` label, then the
 * model's estimate, then 1. Labels beat estimates because a human wrote them.
 */
export function effortDays(issue: Issue): number {
  for (const label of issue.labels) {
    const m = /^size:\s*(xs|s|m|l|xl)$/i.exec(label.trim());
    if (m) return SIZE_DAYS[m[1]!.toLowerCase()] ?? 1;
  }
  return issue.effortDays ?? 1;
}

export interface Schedule {
  entries: Map<number, ScheduleEntry>;
  criticalPath: number[];
  criticalPathDays: number;
  waves: number;
  unblocks: Map<number, number[]>;
}

/**
 * Waves, critical path, slack and blast radius — computed once per run and
 * persisted. Never recompute this in a request handler.
 *
 * Only OPEN issues participate: closing an issue makes its blockers vanish and
 * its dependents advance, which is what makes the graph feel live.
 */
export function computeSchedule(issues: Issue[], edges: Edge[]): Schedule {
  const open = issues.filter((i) => i.state === 'open');
  const nodes = open.map((i) => i.number);
  const nodeSet = new Set(nodes);
  const byNumber = new Map(open.map((i) => [i.number, i]));

  // Only blocking edges between two open issues constrain the schedule.
  const active = edges.filter(
    (e) => e.blocking && !e.suppressed && nodeSet.has(e.blocked) && nodeSet.has(e.blockedBy),
  );

  const blockers = new Map<number, number[]>();
  const dependents = new Map<number, number[]>();
  for (const n of nodes) { blockers.set(n, []); dependents.set(n, []); }
  for (const e of active) {
    blockers.get(e.blocked)!.push(e.blockedBy);
    dependents.get(e.blockedBy)!.push(e.blocked);
  }

  const order = kahn(nodes, active);

  // ---- waves -------------------------------------------------------------
  const wave = new Map<number, number>();
  for (const v of order) {
    const bs = blockers.get(v) ?? [];
    wave.set(v, bs.length === 0 ? 0 : Math.max(...bs.map((b) => (wave.get(b) ?? 0) + 1)));
  }

  // ---- blast radius: transitive descendants, exact, via bitsets ----------
  const idx = new Map(nodes.map((n, i) => [n, i]));
  const n = nodes.length;
  const W = Math.max(1, Math.ceil(n / 32));
  const reach = new Uint32Array(n * W);
  for (const v of [...order].reverse()) {
    const vi = idx.get(v)!;
    for (const d of dependents.get(v) ?? []) {
      const di = idx.get(d)!;
      for (let w = 0; w < W; w++) reach[vi * W + w]! |= reach[di * W + w]!;
      reach[vi * W + (di >> 5)]! |= 1 << (di & 31);
    }
  }
  const blastRadius = (v: number) => {
    const vi = idx.get(v)!;
    let c = 0;
    for (let w = 0; w < W; w++) {
      let x = reach[vi * W + w]!;
      while (x) { x &= x - 1; c++; }
    }
    return c;
  };

  // ---- critical path: node-weighted longest path, forward + backward -----
  const dur = new Map(nodes.map((v) => [v, effortDays(byNumber.get(v)!)]));
  const es = new Map<number, number>();   // earliest start
  const ef = new Map<number, number>();   // earliest finish
  for (const v of order) {
    const bs = blockers.get(v) ?? [];
    const start = bs.length === 0 ? 0 : Math.max(...bs.map((b) => ef.get(b) ?? 0));
    es.set(v, start);
    ef.set(v, start + dur.get(v)!);
  }
  const projectEnd = nodes.length === 0 ? 0 : Math.max(...nodes.map((v) => ef.get(v) ?? 0));

  const lf = new Map<number, number>();   // latest finish
  for (const v of [...order].reverse()) {
    const ds = dependents.get(v) ?? [];
    const finish = ds.length === 0
      ? projectEnd
      : Math.min(...ds.map((d) => (lf.get(d) ?? projectEnd) - dur.get(d)!));
    lf.set(v, finish);
  }
  const slack = (v: number) => (lf.get(v) ?? projectEnd) - (ef.get(v) ?? 0);

  // The zero-slack chain, walked from a ready node so it reads as a sequence.
  const onCritical = new Set(nodes.filter((v) => Math.abs(slack(v)) < 1e-9));
  const criticalPath: number[] = [];
  let cursor = [...onCritical]
    .filter((v) => (blockers.get(v) ?? []).length === 0)
    .sort((a, b) => (ef.get(b) ?? 0) - (ef.get(a) ?? 0))[0];
  const guard = new Set<number>();
  while (cursor !== undefined && !guard.has(cursor)) {
    guard.add(cursor);
    criticalPath.push(cursor);
    cursor = (dependents.get(cursor) ?? [])
      .filter((d) => onCritical.has(d))
      .sort((a, b) => (ef.get(b) ?? 0) - (ef.get(a) ?? 0))[0];
  }

  const entries = new Map<number, ScheduleEntry>();
  for (const v of nodes) {
    entries.set(v, {
      number: v,
      wave: wave.get(v) ?? 0,
      blastRadius: blastRadius(v),
      onCriticalPath: onCritical.has(v),
      slackDays: slack(v),
      ready: (blockers.get(v) ?? []).length === 0,
      effortDays: dur.get(v) ?? 1,
    });
  }

  // Direct dependents, for "you are unblocking #19 and #23".
  const unblocks = new Map<number, number[]>();
  for (const v of nodes) unblocks.set(v, [...(dependents.get(v) ?? [])].sort((a, b) => a - b));

  return {
    entries,
    criticalPath,
    criticalPathDays: projectEnd,
    waves: nodes.length === 0 ? 0 : Math.max(...nodes.map((v) => wave.get(v) ?? 0)) + 1,
    unblocks,
  };
}

/**
 * "Ready · on critical path · unblocks 7" — a sentence, never a bare score.
 * The explanation is the product; an agent can put this straight in a PR body.
 */
export function reasonFor(e: ScheduleEntry): string {
  const parts: string[] = [e.ready ? 'ready' : `blocked (wave ${e.wave})`];
  if (e.onCriticalPath) parts.push('on critical path');
  if (e.blastRadius > 0) parts.push(`unblocks ${e.blastRadius}`);
  return parts.join(' · ');
}

/** Ranking for "what next". Deliberately explainable, not a tuned weighted score. */
export function rankReady(entries: ScheduleEntry[]): ScheduleEntry[] {
  return [...entries].sort((a, b) =>
    Number(b.ready) - Number(a.ready) ||
    Number(b.onCriticalPath) - Number(a.onCriticalPath) ||
    b.blastRadius - a.blastRadius ||
    a.slackDays - b.slackDays ||
    a.effortDays - b.effortDays ||
    a.number - b.number);
}
