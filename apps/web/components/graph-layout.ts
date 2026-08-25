import type { Edge as LatticeEdge, GraphNode } from '@lattice/types';
import type { Edge, Node } from '@xyflow/react';

export const NODE_W = 230;
export const NODE_H = 76;
const GAP_X = 26;
const GAP_Y = 104;
const MAX_COLS = 7;

/**
 * Transitive reduction, computed HERE for rendering only.
 *
 * If A->B, B->C and A->C, the direct edge adds an arrow that tells the reader
 * nothing. It is not deleted from the graph though: it keeps its own rationale
 * and evidence, and toggling this off brings it back intact. The reduction is
 * lossy, which is why it never reaches the store or the scheduler.
 */
export function reduce(nodes: GraphNode[], edges: LatticeEdge[]): LatticeEdge[] {
  const nums = nodes.map((n) => n.number);
  const idx = new Map(nums.map((n, i) => [n, i]));
  const succ = new Map<number, LatticeEdge[]>();
  for (const e of edges) {
    if (!succ.has(e.blockedBy)) succ.set(e.blockedBy, []);
    succ.get(e.blockedBy)!.push(e);
  }
  const order = [...nodes].sort((a, b) => b.wave - a.wave).map((n) => n.number);
  const W = Math.max(1, Math.ceil(nums.length / 32));
  const reach = new Uint32Array(nums.length * W);
  for (const v of order) {
    const vi = idx.get(v); if (vi === undefined) continue;
    for (const e of succ.get(v) ?? []) {
      const di = idx.get(e.blocked); if (di === undefined) continue;
      for (let w = 0; w < W; w++) reach[vi * W + w]! |= reach[di * W + w]!;
      reach[vi * W + (di >> 5)]! |= 1 << (di & 31);
    }
  }
  return edges.filter((e) => {
    const di = idx.get(e.blocked); if (di === undefined) return true;
    for (const other of succ.get(e.blockedBy) ?? []) {
      if (other === e) continue;
      const oi = idx.get(other.blocked); if (oi === undefined) continue;
      if ((reach[oi * W + (di >> 5)]! & (1 << (di & 31))) !== 0) return false;
    }
    return true;
  });
}

export interface Laid {
  nodes: Node[];
  edges: Edge[];
  /** y offset + node count per wave, for the row labels. */
  rows: Array<{ wave: number; y: number; count: number; height: number }>;
  width: number;
}

/**
 * Top-down layered layout, done by hand rather than by dagre.
 *
 * dagre computes its own ranks, so overriding x to force wave columns left
 * nodes sharing a y - which is what produced the overlapping cards. Here a
 * wave IS a row and positions are assigned directly, so overlap is structurally
 * impossible.
 *
 * Within a row, order is chosen by the barycentre of each node's blockers in
 * the row above (the classic Sugiyama ordering sweep). Two passes is plenty and
 * it visibly cuts edge crossings.
 */
export function layout(
  nodes: GraphNode[],
  edges: LatticeEdge[],
  opts: { criticalPath: number[]; highlight: Set<number> | null; selected: number | null },
): Laid {
  const byWave = new Map<number, GraphNode[]>();
  for (const n of nodes) {
    if (!byWave.has(n.wave)) byWave.set(n.wave, []);
    byWave.get(n.wave)!.push(n);
  }
  const waves = [...byWave.keys()].sort((a, b) => a - b);

  const blockers = new Map<number, number[]>();
  for (const e of edges) {
    if (!blockers.has(e.blocked)) blockers.set(e.blocked, []);
    blockers.get(e.blocked)!.push(e.blockedBy);
  }

  const order = new Map<number, number>();   // issue -> slot within its row
  const pos = new Map<number, { x: number; y: number }>();
  const rows: Laid['rows'] = [];

  let y = 0;
  for (const wave of waves) {
    const row = byWave.get(wave)!;

    if (wave === waves[0]) {
      // Seed the first row by impact, so the issues that unblock the most sit
      // together at the left where the eye starts.
      row.sort((a, b) => b.blastRadius - a.blastRadius || a.number - b.number);
    } else {
      const bary = (n: GraphNode) => {
        const parents = (blockers.get(n.number) ?? [])
          .map((p) => order.get(p))
          .filter((v): v is number => v !== undefined);
        return parents.length ? parents.reduce((a, b) => a + b, 0) / parents.length : Infinity;
      };
      row.sort((a, b) => bary(a) - bary(b) || b.blastRadius - a.blastRadius || a.number - b.number);
    }

    row.forEach((n, i) => order.set(n.number, i));

    // Wide rows wrap into a grid rather than becoming a 7000px line.
    const cols = Math.min(MAX_COLS, row.length);
    const subRows = Math.ceil(row.length / cols);
    row.forEach((n, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const rowWidth = Math.min(cols, row.length - r * cols) * (NODE_W + GAP_X) - GAP_X;
      pos.set(n.number, {
        x: -rowWidth / 2 + c * (NODE_W + GAP_X),
        y: y + r * (NODE_H + 20),
      });
    });

    const height = subRows * (NODE_H + 20) - 20;
    rows.push({ wave, y, count: row.length, height });
    y += height + GAP_Y;
  }

  const criticalSet = new Set(opts.criticalPath);
  const width = MAX_COLS * (NODE_W + GAP_X);

  const flowNodes: Node[] = nodes.map((n) => ({
    id: String(n.number),
    type: 'issue',
    position: pos.get(n.number) ?? { x: 0, y: 0 },
    data: {
      node: n,
      onCritical: criticalSet.has(n.number),
      dim: opts.highlight !== null && !opts.highlight.has(n.number),
      selected: opts.selected === n.number,
    },
    draggable: true,
  }));

  // One edge style. Dependency direction is the only thing the picture needs to
  // say; type, confidence and provenance live in the detail panel where there
  // is room to explain them.
  const flowEdges: Edge[] = edges.map((e) => {
    const lit = opts.highlight !== null
      && opts.highlight.has(e.blocked) && opts.highlight.has(e.blockedBy);
    const dim = opts.highlight !== null && !lit;
    return {
      id: `${e.blockedBy}->${e.blocked}`,
      source: String(e.blockedBy),
      target: String(e.blocked),
      type: 'smoothstep',
      markerEnd: { type: 'arrowclosed' as const, width: 14, height: 14,
                   color: lit ? '#58a6ff' : '#4a5468' },
      style: {
        stroke: lit ? '#58a6ff' : '#3d4759',
        strokeWidth: lit ? 2 : 1.4,
        opacity: dim ? 0.08 : 1,
      },
      data: { edge: e },
    };
  });

  return { nodes: flowNodes, edges: flowEdges, rows, width };
}

/** A node's full upstream and downstream, for hover highlighting. */
export function connectedSet(center: number, edges: LatticeEdge[]): Set<number> {
  const up = new Map<number, number[]>();
  const down = new Map<number, number[]>();
  for (const e of edges) {
    if (!up.has(e.blocked)) up.set(e.blocked, []);
    up.get(e.blocked)!.push(e.blockedBy);
    if (!down.has(e.blockedBy)) down.set(e.blockedBy, []);
    down.get(e.blockedBy)!.push(e.blocked);
  }
  const out = new Set<number>([center]);
  const walk = (m: Map<number, number[]>, start: number) => {
    const stack = [start];
    while (stack.length) {
      const v = stack.pop()!;
      for (const w of m.get(v) ?? []) if (!out.has(w)) { out.add(w); stack.push(w); }
    }
  };
  walk(up, center);
  walk(down, center);
  return out;
}

/** Issues with no dependencies at all - shown as a compact tray, not in the DAG. */
export function partition(nodes: GraphNode[], edges: LatticeEdge[]) {
  const touched = new Set<number>();
  for (const e of edges) { touched.add(e.blocked); touched.add(e.blockedBy); }
  return {
    connected: nodes.filter((n) => touched.has(n.number)),
    isolated: nodes.filter((n) => !touched.has(n.number)),
  };
}
