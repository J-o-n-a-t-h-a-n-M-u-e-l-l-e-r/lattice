import { describe, expect, it } from 'vitest';
import type { Edge, Issue } from '@lattice/types';
import { makeAcyclic, transitiveReduction } from '../acyclic.js';
import { computeSchedule } from '../schedule.js';
import { tarjanSCC } from '../scc.js';

const issue = (number: number, extra: Partial<Issue> = {}): Issue => ({
  number, databaseId: 1000 + number, nodeId: `N${number}`,
  title: `Issue ${number}`, body: '', labels: [], milestone: null,
  state: 'open', htmlUrl: `https://example.com/${number}`, effortDays: null, ...extra,
});

const edge = (blocked: number, blockedBy: number, extra: Partial<Edge> = {}): Edge => ({
  blocked, blockedBy, type: 'hard_blocker', confidence: 0.9, source: 'llm',
  rationale: 'test', blocking: true, pinned: false, suppressed: false, ...extra,
});

describe('tarjanSCC', () => {
  it('finds two separate cycles', () => {
    const nodes = [1, 2, 3, 4, 5, 6];
    const edges = [
      edge(2, 1), edge(3, 2), edge(1, 3),   // 1->2->3->1
      edge(5, 4), edge(4, 5),               // 4<->5
      edge(6, 1),                           // acyclic tail
    ];
    const comps = tarjanSCC(nodes, edges).filter((c) => c.length > 1);
    expect(comps).toHaveLength(2);
    expect(comps.map((c) => c.sort((a, b) => a - b))).toEqual(
      expect.arrayContaining([[1, 2, 3], [4, 5]]),
    );
  });
});

describe('makeAcyclic', () => {
  it('breaks a planted cycle at the lowest-confidence edge', () => {
    const nodes = [1, 2, 3];
    const edges = [
      edge(2, 1, { confidence: 0.95 }),
      edge(3, 2, { confidence: 0.91 }),
      edge(1, 3, { confidence: 0.42 }),   // weakest — should be the victim
    ];
    const { dag, breaks } = makeAcyclic(nodes, edges);
    expect(breaks).toHaveLength(1);
    expect(breaks[0]!.victim).toEqual({ blocked: 1, blockedBy: 3 });
    expect(breaks[0]!.reason).toBe('lowest_weight_arc_on_cycle');
    expect(breaks[0]!.cycle.length).toBeGreaterThanOrEqual(3);
    expect(dag).toHaveLength(2);
  });

  it('never cuts a `given` edge, and excludes an all-given cycle instead', () => {
    const nodes = [1, 2, 3];
    const edges = [
      edge(2, 1, { source: 'given', confidence: 1 }),
      edge(3, 2, { source: 'given', confidence: 1 }),
      edge(1, 3, { source: 'given', confidence: 1 }),
    ];
    const { dag, breaks, excluded } = makeAcyclic(nodes, edges);
    expect(breaks[0]!.reason).toBe('unresolvable_given_cycle');
    expect(breaks[0]!.victim).toBeNull();
    expect(dag.some((e) => e.source === 'given')).toBe(false);  // dropped, not cut
    expect(excluded.sort()).toEqual([1, 2, 3]);
  });

  it('prefers cutting a soft ordering_preference over a hard blocker', () => {
    const nodes = [1, 2, 3];
    const edges = [
      edge(2, 1, { confidence: 0.5 }),
      edge(3, 2, { confidence: 0.5 }),
      edge(1, 3, { type: 'ordering_preference', confidence: 0.99 }),
    ];
    const { breaks } = makeAcyclic(nodes, edges);
    expect(breaks[0]!.victim).toEqual({ blocked: 1, blockedBy: 3 });
  });

  it('leaves an acyclic graph untouched', () => {
    const nodes = [1, 2, 3];
    const edges = [edge(2, 1), edge(3, 2)];
    const { dag, breaks } = makeAcyclic(nodes, edges);
    expect(breaks).toHaveLength(0);
    expect(dag).toHaveLength(2);
  });
});

describe('transitiveReduction', () => {
  it('drops the redundant long edge but keeps a diamond intact', () => {
    // A->B, B->D, A->C, C->D  (diamond: nothing redundant)
    const diamond = [edge(2, 1), edge(4, 2), edge(3, 1), edge(4, 3)];
    expect(transitiveReduction([1, 2, 3, 4], diamond)).toHaveLength(4);

    // A->B, B->C, A->C  (A->C is implied)
    const withShortcut = [edge(2, 1), edge(3, 2), edge(3, 1)];
    const reduced = transitiveReduction([1, 2, 3], withShortcut);
    expect(reduced).toHaveLength(2);
    expect(reduced.find((e) => e.blocked === 3 && e.blockedBy === 1)).toBeUndefined();
  });
});

describe('computeSchedule', () => {
  const issues = [1, 2, 3, 4, 5].map((n) => issue(n));
  // 1 -> 2 -> 3 ;  4 -> 3 ;  5 isolated
  const edges = [edge(2, 1), edge(3, 2), edge(3, 4)];

  it('assigns waves from open blockers', () => {
    const s = computeSchedule(issues, edges);
    expect(s.entries.get(1)!.wave).toBe(0);
    expect(s.entries.get(4)!.wave).toBe(0);
    expect(s.entries.get(5)!.wave).toBe(0);
    expect(s.entries.get(2)!.wave).toBe(1);
    expect(s.entries.get(3)!.wave).toBe(2);
    expect(s.entries.get(1)!.ready).toBe(true);
    expect(s.entries.get(3)!.ready).toBe(false);
  });

  it('counts transitive descendants for blast radius, without double-counting', () => {
    const s = computeSchedule(issues, edges);
    expect(s.entries.get(1)!.blastRadius).toBe(2);   // 2 and 3
    expect(s.entries.get(4)!.blastRadius).toBe(1);   // 3 only
    expect(s.entries.get(5)!.blastRadius).toBe(0);
  });

  it('advances dependents when a blocker closes', () => {
    const closed = issues.map((i) => (i.number === 1 ? { ...i, state: 'closed' as const } : i));
    const s = computeSchedule(closed, edges);
    expect(s.entries.get(2)!.wave).toBe(0);
    expect(s.entries.get(2)!.ready).toBe(true);
  });

  it('ignores non-blocking edges', () => {
    const soft = [edge(2, 1, { blocking: false })];
    const s = computeSchedule(issues, soft);
    expect(s.entries.get(2)!.ready).toBe(true);
  });

  it('puts the longest weighted chain on the critical path', () => {
    const weighted = [
      issue(1, { labels: ['size: L'] }),   // 8 days
      issue(2, { labels: ['size: M'] }),   // 3
      issue(3, { labels: ['size: S'] }),   // 1
      issue(4, { labels: ['size: S'] }),
      issue(5),
    ];
    const s = computeSchedule(weighted, edges);
    expect(s.criticalPath).toEqual([1, 2, 3]);
    expect(s.criticalPathDays).toBe(12);
    expect(s.entries.get(4)!.onCriticalPath).toBe(false);
  });
});
