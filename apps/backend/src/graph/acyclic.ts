import type { CycleBreak, Edge } from '@lattice/types';
import { shortestCycleThrough, tarjanSCC } from './scc.js';

const IMMUTABLE = Number.POSITIVE_INFINITY;

/**
 * How expensive it is to cut an edge. Lower = cut first.
 *
 * The immutable tiers are what make unsupervised cycle-breaking safe: the
 * algorithm can only ever cut something the model inferred. The worst case is
 * that we mis-order our own suggestions and the next run corrects it.
 */
export function weight(e: Edge): number {
  if (e.source === 'given') return IMMUTABLE;   // already in GitHub — never ours to cut
  if (e.pinned) return IMMUTABLE;               // a human asserted it
  if (e.source === 'sub_issue') return 1000;    // native hierarchy, near-immutable
  if (e.type === 'ordering_preference') return e.confidence * 0.5;  // cheapest
  return e.confidence * 10;
}

export function kahn(nodes: number[], edges: Edge[]): number[] {
  const indeg = new Map<number, number>();
  const adj = new Map<number, number[]>();
  for (const n of nodes) { indeg.set(n, 0); adj.set(n, []); }
  for (const e of edges) {
    if (!indeg.has(e.blocked) || !adj.has(e.blockedBy)) continue;
    indeg.set(e.blocked, indeg.get(e.blocked)! + 1);
    adj.get(e.blockedBy)!.push(e.blocked);
  }
  const queue = nodes.filter((n) => indeg.get(n) === 0);
  const order: number[] = [];
  while (queue.length > 0) {
    const v = queue.shift()!;
    order.push(v);
    for (const w of adj.get(v) ?? []) {
      indeg.set(w, indeg.get(w)! - 1);
      if (indeg.get(w) === 0) queue.push(w);
    }
  }
  return order;
}

/**
 * Greedy weighted feedback-arc-set. Minimum FAS is NP-hard; this is a
 * heuristic and we say so in the README.
 *
 * Fully automatic — nothing escalates to a human. Every cut is *recorded* with
 * the loop, the victim and the alternatives, so `/runs` can explain it after
 * the fact.
 */
export function makeAcyclic(
  nodes: number[],
  edges: Edge[],
): { dag: Edge[]; breaks: CycleBreak[]; excluded: number[] } {
  const breaks: CycleBreak[] = [];
  const excluded: number[] = [];
  let cur = [...edges];
  let live = [...nodes];

  for (let guard = 0; guard < 1000; guard++) {
    const comps = tarjanSCC(live, cur).filter((c) => c.length > 1);
    if (comps.length === 0) break;

    for (const comp of comps) {
      const inSet = new Set(comp);
      // Every edge internal to an SCC lies on some cycle.
      const internal = cur.filter((e) => inSet.has(e.blocked) && inSet.has(e.blockedBy));
      if (internal.length === 0) continue;

      const victim = internal.reduce((a, b) => (weight(b) < weight(a) ? b : a));
      const cycle = shortestCycleThrough(comp, internal);

      if (weight(victim) === IMMUTABLE) {
        // Every edge here came from GitHub or a human. Cutting one would
        // overwrite their data, so we drop the component from *scheduling*
        // instead and flag it. We do not guess.
        breaks.push({ cycle, victim: null, alternatives: [], reason: 'unresolvable_given_cycle' });
        cur = cur.filter((e) => !(inSet.has(e.blocked) && inSet.has(e.blockedBy)));
        excluded.push(...comp);
        live = live.filter((n) => !inSet.has(n));
        continue;
      }

      breaks.push({
        cycle,
        victim: { blocked: victim.blocked, blockedBy: victim.blockedBy },
        alternatives: internal
          .filter((e) => e !== victim)
          .sort((a, b) => weight(a) - weight(b))
          .slice(0, 3)
          .map((e) => ({ blocked: e.blocked, blockedBy: e.blockedBy })),
        reason: 'lowest_weight_arc_on_cycle',
      });
      cur = cur.filter((e) => e !== victim);
    }
  }

  // HARD INVARIANT — never hand a cyclic graph downstream. Everything after
  // this point (waves, critical path, blast radius) is undefined on a cycle.
  const order = kahn(live, cur);
  if (order.length !== live.length) {
    throw new Error('INVARIANT: graph still cyclic after feedback-arc-set removal');
  }
  return { dag: cur, breaks, excluded };
}

/**
 * Transitive reduction. Returned for RENDERING only — never stored, never
 * given to the scheduler.
 *
 * The reduction is lossy: a redundant-looking A->C still carries its own
 * rationale, evidence and provenance, possibly from a different source than
 * the two-hop path. Persisting the reduced form would destroy that.
 */
export function transitiveReduction(nodes: number[], edges: Edge[]): Edge[] {
  const idx = new Map(nodes.map((n, i) => [n, i]));
  const n = nodes.length;
  const W = Math.ceil(n / 32) || 1;
  const reach = new Uint32Array(n * W);
  const order = kahn(nodes, edges).reverse();
  const succ = new Map<number, Edge[]>();
  for (const e of edges) {
    if (!succ.has(e.blockedBy)) succ.set(e.blockedBy, []);
    succ.get(e.blockedBy)!.push(e);
  }

  for (const v of order) {
    const vi = idx.get(v);
    if (vi === undefined) continue;
    for (const e of succ.get(v) ?? []) {
      const di = idx.get(e.blocked);
      if (di === undefined) continue;
      for (let w = 0; w < W; w++) reach[vi * W + w]! |= reach[di * W + w]!;
      reach[vi * W + (di >> 5)]! |= 1 << (di & 31);
    }
  }

  return edges.filter((e) => {
    const vi = idx.get(e.blockedBy);
    const di = idx.get(e.blocked);
    if (vi === undefined || di === undefined) return true;
    // Redundant iff some other direct successor of blockedBy already reaches blocked.
    for (const other of succ.get(e.blockedBy) ?? []) {
      if (other === e) continue;
      const oi = idx.get(other.blocked);
      if (oi === undefined) continue;
      if ((reach[oi * W + (di >> 5)]! & (1 << (di & 31))) !== 0) return false;
    }
    return true;
  });
}
