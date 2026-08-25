import type { Edge } from '@lattice/types';

/**
 * Tarjan's strongly-connected components, iterative.
 *
 * Iterative rather than recursive on purpose: a recursive Tarjan blows the
 * stack on a pathological graph, and we would rather not discover that on
 * stage. Components of size > 1 are cycles.
 */
export function tarjanSCC(nodes: number[], edges: Edge[]): number[][] {
  const adj = new Map<number, number[]>();
  for (const n of nodes) adj.set(n, []);
  for (const e of edges) {
    // Edge direction: blockedBy -> blocked (the blocker must finish first).
    if (adj.has(e.blockedBy) && adj.has(e.blocked)) adj.get(e.blockedBy)!.push(e.blocked);
  }

  const index = new Map<number, number>();
  const low = new Map<number, number>();
  const onStack = new Set<number>();
  const stack: number[] = [];
  const out: number[][] = [];
  let counter = 0;

  for (const root of nodes) {
    if (index.has(root)) continue;

    // Explicit work stack of (node, next-neighbour-cursor).
    const work: Array<{ v: number; i: number }> = [{ v: root, i: 0 }];
    index.set(root, counter);
    low.set(root, counter);
    counter++;
    stack.push(root);
    onStack.add(root);

    while (work.length > 0) {
      const frame = work[work.length - 1]!;
      const { v } = frame;
      const neighbours = adj.get(v) ?? [];

      if (frame.i < neighbours.length) {
        const w = neighbours[frame.i]!;
        frame.i++;
        if (!index.has(w)) {
          index.set(w, counter);
          low.set(w, counter);
          counter++;
          stack.push(w);
          onStack.add(w);
          work.push({ v: w, i: 0 });
        } else if (onStack.has(w)) {
          low.set(v, Math.min(low.get(v)!, index.get(w)!));
        }
        continue;
      }

      // Finished v — it is a root iff low == index.
      work.pop();
      if (work.length > 0) {
        const parent = work[work.length - 1]!.v;
        low.set(parent, Math.min(low.get(parent)!, low.get(v)!));
      }
      if (low.get(v) === index.get(v)) {
        const comp: number[] = [];
        for (;;) {
          const w = stack.pop()!;
          onStack.delete(w);
          comp.push(w);
          if (w === v) break;
        }
        out.push(comp);
      }
    }
  }
  return out;
}

/**
 * A concrete traversable loop inside an SCC, for display: [12, 19, 23, 12].
 * We want a *path* rather than a set — "these five issues are tangled" is not
 * something a human can act on.
 */
export function shortestCycleThrough(component: number[], edges: Edge[]): number[] {
  const inSet = new Set(component);
  const adj = new Map<number, number[]>();
  for (const n of component) adj.set(n, []);
  for (const e of edges) {
    if (inSet.has(e.blockedBy) && inSet.has(e.blocked)) adj.get(e.blockedBy)!.push(e.blocked);
  }

  let best: number[] | null = null;
  for (const start of component) {
    // BFS back to `start`.
    const prev = new Map<number, number>();
    const queue: number[] = [start];
    const seen = new Set<number>([start]);
    let found = false;
    while (queue.length > 0 && !found) {
      const v = queue.shift()!;
      for (const w of adj.get(v) ?? []) {
        if (w === start) {
          const path = [start];
          let cur = v;
          const rev: number[] = [];
          while (cur !== start) { rev.push(cur); cur = prev.get(cur)!; }
          path.push(...rev.reverse(), start);
          if (!best || path.length < best.length) best = path;
          found = true;
          break;
        }
        if (!seen.has(w)) { seen.add(w); prev.set(w, v); queue.push(w); }
      }
    }
  }
  return best ?? [...component, component[0]!];
}
