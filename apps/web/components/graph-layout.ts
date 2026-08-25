import type { Edge as LatticeEdge, GraphNode } from '@lattice/types';
import type { Edge, Node } from '@xyflow/react';

export const NODE_W = 230;
export const NODE_H = 76;
const GAP_X = 26;
const GAP_Y = 150;   // room for the wave divider between rows
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

  const dependents = new Map<number, number[]>();
  for (const e of edges) {
    if (!dependents.has(e.blockedBy)) dependents.set(e.blockedBy, []);
    dependents.get(e.blockedBy)!.push(e.blocked);
  }

  // Sugiyama ordering: alternate downward and upward barycentre sweeps.
  //
  // A single downward pass only orders each row against the one above it, so
  // the top row never moves and the crossings it causes are permanent. Sweeping
  // both ways lets every row settle against both neighbours.
  const rowsOf = waves.map((w) => byWave.get(w)!);
  rowsOf[0]!.sort((a, b) => b.blastRadius - a.blastRadius || a.number - b.number);

  const slot = new Map<number, number>();
  const reindex = () => {
    for (const row of rowsOf) row.forEach((n, i) => slot.set(n.number, i));
  };
  reindex();

  const meanOf = (ids: number[] | undefined) => {
    const xs = (ids ?? []).map((v) => slot.get(v)).filter((v): v is number => v !== undefined);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };

  for (let pass = 0; pass < 4; pass++) {
    const downward = pass % 2 === 0;
    const seq = downward ? rowsOf.slice(1) : rowsOf.slice(0, -1).reverse();
    for (const row of seq) {
      const key = new Map<number, number>();
      row.forEach((n, i) => {
        const m = meanOf(downward ? blockers.get(n.number) : dependents.get(n.number));
        key.set(n.number, m ?? i);          // no neighbours: hold position
      });
      row.sort((a, b) =>
        key.get(a.number)! - key.get(b.number)! ||
        b.blastRadius - a.blastRadius || a.number - b.number);
      reindex();
    }
  }

  const order = slot;
  const pos = new Map<number, { x: number; y: number }>();
  const rows: Laid['rows'] = [];

  let y = 0;
  for (const wave of waves) {
    const row = byWave.get(wave)!;
    const cols = Math.min(MAX_COLS, row.length);
    const subRows = Math.ceil(row.length / cols);
    row.forEach((n, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const rowWidth = Math.min(cols, row.length - r * cols) * (NODE_W + GAP_X) - GAP_X;
      pos.set(n.number, {
        x: -rowWidth / 2 + c * (NODE_W + GAP_X),
        y: y + r * (NODE_H + 24),
      });
    });
    const height = subRows * (NODE_H + 24) - 24;
    rows.push({ wave, y, count: row.length, height });
    y += height + GAP_Y;
  }

  const criticalSet = new Set(opts.criticalPath);
  const width = MAX_COLS * (NODE_W + GAP_X);

  const flowNodes: Node[] = [];

  // Row labels are NODES, not overlays. Absolutely-positioned overlays live in
  // viewport space, so they detach from the graph the moment you pan - which is
  // why they were invisible.
  for (const r of rows) {
    flowNodes.push({
      id: `wave-${r.wave}`,
      type: 'waveLabel',
      position: { x: -width / 2 - 190, y: r.y + r.height / 2 - 24 },
      data: { wave: r.wave, count: r.count },
      draggable: false, selectable: false, focusable: false,
      zIndex: 0,
    });
  }

  flowNodes.push(...nodes.map((n) => ({
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
  })));

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
      // Bezier, not smoothstep: orthogonal routing made every edge share the
      // same horizontal run between rows, which read as one bus bar rather
      // than as N separate dependencies.
      type: 'default',
      markerEnd: { type: 'arrowclosed' as const, width: 16, height: 16,
                   color: lit ? '#79c0ff' : '#6e7b91' },
      style: {
        stroke: lit ? '#79c0ff' : '#5a6478',
        strokeWidth: lit ? 2.4 : 1.6,
        opacity: dim ? 0.07 : 0.9,
      },
      zIndex: lit ? 10 : 1,
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
