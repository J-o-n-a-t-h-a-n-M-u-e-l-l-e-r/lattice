import { describe, expect, it } from 'vitest';
import type { Edge, Issue } from '@lattice/types';
import { buildPlan } from '../plan.js';

const issue = (number: number, extra: Partial<Issue> = {}): Issue => ({
  number, databaseId: 1000 + number, nodeId: `N${number}`,
  title: `Issue ${number}`, body: '', labels: [], milestone: null,
  state: 'open', htmlUrl: `https://example.com/${number}`, effortDays: null, ...extra,
});
const edge = (blocked: number, blockedBy: number, extra: Partial<Edge> = {}): Edge => ({
  blocked, blockedBy, type: 'hard_blocker', confidence: 0.9, source: 'llm',
  rationale: `#${blocked} needs #${blockedBy}`, blocking: true,
  pinned: false, suppressed: false, ...extra,
});

describe('buildPlan', () => {
  // 1 -> 2 -> 5 ;  3 -> 5 ;  4 -> 2 ;  6 unrelated
  const issues = [1, 2, 3, 4, 5, 6].map((n) => issue(n));
  const edges = [edge(2, 1), edge(5, 2), edge(5, 3), edge(2, 4)];

  it('walks the whole upstream chain, not just direct blockers', () => {
    const p = buildPlan(issues, edges, 5) as any;
    const all = p.steps.flatMap((s: any) => s.issues.map((i: any) => i.number)).sort();
    expect(all).toEqual([1, 2, 3, 4]);          // includes 1 and 4, two levels up
    expect(p.remaining_prerequisites).toBe(4);
  });

  it('orders steps so nothing needs a later one', () => {
    const p = buildPlan(issues, edges, 5) as any;
    const stepOf = new Map<number, number>();
    for (const s of p.steps) for (const i of s.issues) stepOf.set(i.number, s.step);
    expect(stepOf.get(1)).toBeLessThan(stepOf.get(2)!);
    expect(stepOf.get(4)).toBeLessThan(stepOf.get(2)!);
    expect(stepOf.get(2)).toBeLessThan(stepOf.get(5) ?? Infinity);
  });

  it('groups independent work into the same step', () => {
    const p = buildPlan(issues, edges, 5) as any;
    const first = p.steps[0].issues.map((i: any) => i.number).sort();
    expect(first).toEqual([1, 3, 4]);            // none of these block each other
    expect(p.steps[0].parallel).toBe(3);
  });

  it('excludes unrelated issues', () => {
    const p = buildPlan(issues, edges, 5) as any;
    const all = p.steps.flatMap((s: any) => s.issues.map((i: any) => i.number));
    expect(all).not.toContain(6);
  });

  it('reports a startable issue as ready with no steps', () => {
    const p = buildPlan(issues, edges, 1) as any;
    expect(p.ready).toBe(true);
    expect(p.steps).toEqual([]);
  });

  it('skips prerequisites that are already closed, and does not follow their blockers', () => {
    const closed = issues.map((i) => (i.number === 2 ? { ...i, state: 'closed' as const } : i));
    const p = buildPlan(closed, edges, 5) as any;
    const all = p.steps.flatMap((s: any) => s.issues.map((i: any) => i.number)).sort();
    expect(all).toEqual([3]);                    // 1 and 4 were only needed for 2
    expect(p.already_done).toContain(2);
  });

  it('marks the longest chain and sums remaining effort', () => {
    const sized = [
      issue(1, { labels: ['size: L'] }),   // 8
      issue(2, { labels: ['size: M'] }),   // 3
      issue(3, { labels: ['size: S'] }),   // 1
      issue(4, { labels: ['size: S'] }),   // 1
      issue(5, { labels: ['size: S'] }),   // 1
      issue(6),
    ];
    const p = buildPlan(sized, edges, 5) as any;
    // Both totals count the target, so they are comparable: parallelising can
    // never take longer than doing everything end to end.
    expect(p.remaining_effort_days).toBe(14);          // 8 + 3 + 1 + 1 + target 1
    expect(p.critical_path_days).toBe(12);             // 1 -> 2 -> 5 = 8 + 3 + 1
    expect(p.critical_path_days).toBeLessThanOrEqual(p.remaining_effort_days);
    const onPath = p.steps.flatMap((s: any) =>
      s.issues.filter((i: any) => i.on_critical_path).map((i: any) => i.number)).sort();
    expect(onPath).toEqual([1, 2]);
  });

  it('rejects an unknown issue', () => {
    expect(buildPlan(issues, edges, 999)).toEqual({ error: 'unknown_issue' });
  });
});
