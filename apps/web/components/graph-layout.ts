import dagre from 'dagre';
import type { Edge as LatticeEdge, GraphNode } from '@lattice/types';
import type { Edge, Node } from '@xyflow/react';

const NODE_W = 250;
const NODE_H = 78;

/**
 * Transitive reduction, computed HERE for rendering only.
 *
 * If A->B, B->C and A->C, the direct edge adds an arrow that tells the reader
 * nothing. But it is not deleted from the graph: it keeps its own rationale,
 * evidence and provenance, and toggling this off brings it back with all of
 * that intact. The reduction is lossy, which is exactly why it never reaches
 * the store or the scheduler.
 */
export function reduce(nodes: GraphNode[], edges: LatticeEdge[]): LatticeEdge[] {
  const nums = nodes.map((n) => n.number);
  const idx = new Map(nums.map((n, i) => [n, i]));
  const succ = new Map<number, LatticeEdge[]>();
  for (const e of edges) {
    if (!succ.has(e.blockedBy)) succ.set(e.blockedBy, []);
    succ.get(e.blockedBy)!.push(e);
  }
  // Reverse-topological by wave: a node's wave is >= all of its blockers'.
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

const EDGE_COLOR: Record<string, string> = {
  hard_blocker: '#f0883e',
  data_contract: '#58a6ff',
  shared_artifact: '#bc8cff',
  ordering_preference: '#6b7280',
};

export function buildFlow(
  nodes: GraphNode[],
  edges: LatticeEdge[],
  opts: { criticalPath: number[]; highlight: Set<number> | null; selected: number | null },
): { nodes: Node[]; edges: Edge[]; waveBounds: Array<{ wave: number; x: number; count: number }> } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 130, nodesep: 18, marginx: 40, marginy: 60, ranker: 'longest-path' });

  for (const n of nodes) g.setNode(String(n.number), { width: NODE_W, height: NODE_H });
  for (const e of edges) {
    if (g.hasNode(String(e.blockedBy)) && g.hasNode(String(e.blocked))) {
      g.setEdge(String(e.blockedBy), String(e.blocked));
    }
  }
  dagre.layout(g);

  // Snap x to the wave index so the columns read as a schedule, not a spray.
  const waveX = new Map<number, number>();
  for (const n of nodes) {
    if (!waveX.has(n.wave)) waveX.set(n.wave, n.wave * (NODE_W + 130));
  }
  const criticalSet = new Set(opts.criticalPath);

  const flowNodes: Node[] = nodes.map((n) => {
    const pos = g.node(String(n.number));
    const dim = opts.highlight !== null && !opts.highlight.has(n.number);
    return {
      id: String(n.number),
      type: 'issue',
      position: { x: waveX.get(n.wave) ?? 0, y: pos?.y ?? 0 },
      data: {
        node: n,
        onCritical: criticalSet.has(n.number),
        dim,
        selected: opts.selected === n.number,
      },
      draggable: true,
    };
  });

  const flowEdges: Edge[] = edges.map((e) => {
    const dim = opts.highlight !== null
      && !(opts.highlight.has(e.blocked) && opts.highlight.has(e.blockedBy));
    const color = EDGE_COLOR[e.type] ?? '#6b7280';
    return {
      id: `${e.blockedBy}->${e.blocked}`,
      source: String(e.blockedBy),
      target: String(e.blocked),
      animated: false,
      style: {
        stroke: color,
        // Confidence is legible as weight; non-blocking edges read as hints.
        strokeWidth: e.blocking ? 1.1 + e.confidence * 1.6 : 1,
        strokeDasharray: e.blocking ? undefined : '4 4',
        opacity: dim ? 0.06 : e.blocking ? 0.55 : 0.3,
      },
      data: { edge: e },
    };
  });

  const counts = new Map<number, number>();
  for (const n of nodes) counts.set(n.wave, (counts.get(n.wave) ?? 0) + 1);
  const waveBounds = [...waveX.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([wave, x]) => ({ wave, x, count: counts.get(wave) ?? 0 }));

  return { nodes: flowNodes, edges: flowEdges, waveBounds };
}

/** A node's full upstream and downstream, for hover highlighting. */
export function connectedSet(center: number, edges: LatticeEdge[]): Set<number> {
  const up = new Map<number, number[]>();
  const down = new Map<number, number[]>();
  for (const e of edges) {
    (up.get(e.blocked) ?? up.set(e.blocked, []).get(e.blocked)!).push(e.blockedBy);
    (down.get(e.blockedBy) ?? down.set(e.blockedBy, []).get(e.blockedBy)!).push(e.blocked);
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
