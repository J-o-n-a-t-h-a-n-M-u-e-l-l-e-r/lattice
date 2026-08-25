import type { Edge as LatticeEdge, GraphNode } from '@lattice/types';
import type { Edge, Node } from '@xyflow/react';

import { NODE_H, NODE_W } from './IssueNode';
export { NODE_H, NODE_W };
const GAP_X = 22;
const LAYER_H = 218;   // room for the row label above each wave
const DUMMY_W = 26;          // a routed edge reserves this much room in a row

/**
 * Transitive reduction, computed HERE for rendering only. It is lossy - a
 * redundant-looking A->C still carries its own rationale and evidence - so it
 * never reaches the store or the scheduler.
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

/* ── styling constants, shared so identity is stable between renders ─────── */

const EDGE_MARKER = { type: 'arrowclosed' as const, width: 16, height: 16, color: '#6e7b91' };
const EDGE_MARKER_LIT = { type: 'arrowclosed' as const, width: 16, height: 16, color: '#79c0ff' };
const EDGE_STYLE = { stroke: '#5a6478', strokeWidth: 1.5, opacity: 0.85 };
const EDGE_STYLE_LIT = { stroke: '#79c0ff', strokeWidth: 2.4, opacity: 1 };
const EDGE_STYLE_DIM = { stroke: '#5a6478', strokeWidth: 1.5, opacity: 0.06 };

/* ── the layered layout ──────────────────────────────────────────────────── */

type Cell = { id: string; real: number | null; layer: number; x: number; width: number };
type Seg = { from: string; to: string };

export interface Laid {
  nodes: Node[];
  edges: Edge[];
  rows: Array<{ wave: number; y: number; count: number; height: number; x: number }>;
  labelX: number;
  crossings: number;
}

/**
 * Sugiyama layered layout, top-down: order within layers, then assign x.
 *
 * The two things that were causing the mess:
 *
 * 1. An edge spanning wave 0 -> wave 2 was drawn straight through wave 1,
 *    crossing everything in it, and took no part in ordering. Standard fix is
 *    DUMMY NODES - the long edge gets a placeholder in every layer it passes
 *    through, so it occupies a lane and the ordering step can route around it.
 * 2. Wide layers were wrapped into a grid, which destroys the layered model
 *    entirely: position within a row stopped meaning anything, so barycentre
 *    ordering had nothing to work with. Layers are single rows now.
 */
export function layout(
  nodes: GraphNode[],
  edges: LatticeEdge[],
  opts: { criticalPath: number[] },
): Laid {
  const layerOf = new Map(nodes.map((n) => [n.number, n.wave]));
  const maxLayer = nodes.reduce((m, n) => Math.max(m, n.wave), 0);

  // ---- 1. build layers, inserting dummies for edges that span a gap --------
  const layers: Cell[][] = Array.from({ length: maxLayer + 1 }, () => []);
  const cellOf = new Map<string, Cell>();
  const addCell = (c: Cell) => { layers[c.layer]!.push(c); cellOf.set(c.id, c); return c; };

  for (const n of nodes) {
    addCell({ id: `n${n.number}`, real: n.number, layer: n.wave, x: 0, width: NODE_W });
  }

  const segments: Seg[] = [];
  const chains = new Map<string, string[]>();   // edge id -> dummy cell ids
  for (const e of edges) {
    const from = layerOf.get(e.blockedBy);
    const to = layerOf.get(e.blocked);
    if (from === undefined || to === undefined) continue;
    const key = `${e.blockedBy}->${e.blocked}`;

    if (to - from <= 1) {
      segments.push({ from: `n${e.blockedBy}`, to: `n${e.blocked}` });
      continue;
    }
    const via: string[] = [];
    let prev = `n${e.blockedBy}`;
    for (let l = from + 1; l < to; l++) {
      const id = `d${key}@${l}`;
      addCell({ id, real: null, layer: l, x: 0, width: DUMMY_W });
      via.push(id);
      segments.push({ from: prev, to: id });
      prev = id;
    }
    segments.push({ from: prev, to: `n${e.blocked}` });
    chains.set(key, via);
  }

  const above = new Map<string, string[]>();
  const below = new Map<string, string[]>();
  for (const s of segments) {
    if (!above.has(s.to)) above.set(s.to, []);
    above.get(s.to)!.push(s.from);
    if (!below.has(s.from)) below.set(s.from, []);
    below.get(s.from)!.push(s.to);
  }

  // ---- 2. ordering: alternating sweeps, keep the best ---------------------
  const slot = new Map<string, number>();
  const reindex = () => layers.forEach((row) => row.forEach((c, i) => slot.set(c.id, i)));

  // Seed by impact so the heavy hitters start near each other.
  const impact = new Map(nodes.map((n) => [`n${n.number}`, n.blastRadius]));
  layers[0]?.sort((a, b) => (impact.get(b.id) ?? 0) - (impact.get(a.id) ?? 0));
  reindex();

  const countCrossings = (): number => {
    let total = 0;
    for (let l = 0; l < layers.length - 1; l++) {
      const pairs: Array<[number, number]> = [];
      for (const c of layers[l]!) {
        for (const t of below.get(c.id) ?? []) {
          const a = slot.get(c.id), b = slot.get(t);
          if (a !== undefined && b !== undefined) pairs.push([a, b]);
        }
      }
      pairs.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
      for (let i = 0; i < pairs.length; i++) {
        for (let j = i + 1; j < pairs.length; j++) {
          if (pairs[i]![1] > pairs[j]![1]) total++;
        }
      }
    }
    return total;
  };

  const positionsOf = (ids: string[] | undefined) =>
    (ids ?? []).map((v) => slot.get(v)).filter((v): v is number => v !== undefined);

  const barycentre = (ids: string[] | undefined) => {
    const p = positionsOf(ids);
    return p.length ? p.reduce((a, b) => a + b, 0) / p.length : null;
  };
  const median = (ids: string[] | undefined) => {
    const p = positionsOf(ids).sort((a, b) => a - b);
    if (!p.length) return null;
    const m = p.length >> 1;
    return p.length % 2 ? p[m]! : (p[m - 1]! + p[m]!) / 2;
  };

  let best = layers.map((row) => row.map((c) => c.id));
  let bestScore = countCrossings();

  // Median tends to beat barycentre on sparse graphs and barycentre on dense
  // ones, so alternate both rather than betting on either.
  for (let pass = 0; pass < 16; pass++) {
    const downward = pass % 2 === 0;
    const heuristic = pass % 4 < 2 ? median : barycentre;
    const seq = downward
      ? layers.slice(1).map((_, i) => i + 1)
      : layers.slice(0, -1).map((_, i) => i).reverse();

    for (const li of seq) {
      const row = layers[li]!;
      const key = new Map<string, number>();
      row.forEach((c, i) => {
        const m = heuristic(downward ? above.get(c.id) : below.get(c.id));
        key.set(c.id, m ?? i);
      });
      row.sort((a, b) => key.get(a.id)! - key.get(b.id)! ||
                         (impact.get(b.id) ?? 0) - (impact.get(a.id) ?? 0));
      reindex();
    }

    const score = countCrossings();
    if (score < bestScore) {
      bestScore = score;
      best = layers.map((row) => row.map((c) => c.id));
    }
  }

  // Restore the best ordering found.
  layers.forEach((row, li) => {
    const wanted = best[li]!;
    row.sort((a, b) => wanted.indexOf(a.id) - wanted.indexOf(b.id));
  });
  reindex();

  // ---- 3. x assignment: pull each cell toward its neighbours, then de-overlap
  for (const row of layers) {
    let x = 0;
    for (const c of row) { c.x = x; x += c.width + GAP_X; }
  }

  const centreOf = (ids: string[] | undefined) => {
    const xs = (ids ?? [])
      .map((v) => cellOf.get(v))
      .filter((c): c is Cell => c !== undefined)
      .map((c) => c.x + c.width / 2);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  };

  // Straightens long chains noticeably: a dummy sits directly under its parent
  // instead of wherever its index happened to fall.
  for (let pass = 0; pass < 6; pass++) {
    const seq = pass % 2 === 0
      ? layers.map((_, i) => i).slice(1)
      : layers.map((_, i) => i).slice(0, -1).reverse();
    for (const li of seq) {
      const row = layers[li]!;
      const desired = row.map((c) => {
        const t = centreOf(pass % 2 === 0 ? above.get(c.id) : below.get(c.id));
        return t === null ? c.x : t - c.width / 2;
      });
      row.forEach((c, i) => { c.x = desired[i]!; });
      // left-to-right, then right-to-left, so nothing overlaps
      for (let i = 1; i < row.length; i++) {
        const prev = row[i - 1]!, cur = row[i]!;
        const min = prev.x + prev.width + GAP_X;
        if (cur.x < min) cur.x = min;
      }
      for (let i = row.length - 2; i >= 0; i--) {
        const next = row[i + 1]!, cur = row[i]!;
        const max = next.x - cur.width - GAP_X;
        if (cur.x > max) cur.x = max;
      }
    }
  }

  // Centre every row on 0 so the whole graph is symmetric about the viewport.
  let minX = Infinity, maxX = -Infinity;
  for (const row of layers) {
    for (const c of row) { minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x + c.width); }
  }
  const shift = -(minX + maxX) / 2;
  for (const row of layers) for (const c of row) c.x += shift;

  const yOf = (layer: number) => layer * LAYER_H;
  const pointOf = (id: string) => {
    const c = cellOf.get(id)!;
    return { x: c.x + c.width / 2, y: yOf(c.layer) + NODE_H / 2 };
  };

  // ---- 4. emit ------------------------------------------------------------
  const criticalSet = new Set(opts.criticalPath);
  const byNumber = new Map(nodes.map((n) => [n.number, n]));

  const rows = layers.map((row, li) => {
    const reals = row.filter((c) => c.real !== null);
    return {
      wave: li,
      y: yOf(li),
      count: reals.length,
      height: NODE_H,
      // Left edge of this row, so the label can sit above it rather than in a
      // gutter far off to the side where fitView clips it.
      x: reals.length ? Math.min(...reals.map((c) => c.x)) : minX + shift,
    };
  });

  const flowNodes: Node[] = [];
  for (const r of rows) {
    flowNodes.push({
      id: `wave-${r.wave}`,
      type: 'waveLabel',
      position: { x: r.x, y: r.y - 46 },
      data: { wave: r.wave, count: r.count },
      draggable: false, selectable: false, focusable: false, zIndex: 0,
    });
  }
  for (const row of layers) {
    for (const c of row) {
      if (c.real === null) continue;
      const n = byNumber.get(c.real)!;
      flowNodes.push({
        id: String(n.number),
        type: 'issue',
        position: { x: c.x, y: yOf(c.layer) },
        data: { node: n, onCritical: criticalSet.has(n.number), dim: false, selected: false },
        draggable: true,
      });
    }
  }

  const flowEdges: Edge[] = edges.map((e) => {
    const key = `${e.blockedBy}->${e.blocked}`;
    const via = (chains.get(key) ?? []).map(pointOf);
    return {
      id: key,
      source: String(e.blockedBy),
      target: String(e.blocked),
      type: via.length ? 'routed' : 'default',
      markerEnd: EDGE_MARKER,
      style: EDGE_STYLE,
      zIndex: 1,
      data: { edge: e, via },
    };
  });

  return { nodes: flowNodes, edges: flowEdges, rows, labelX: minX + shift - 210,
           crossings: bestScore };
}

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

/** Issues with no dependencies - shown as a compact tray, not in the DAG. */
export function partition(nodes: GraphNode[], edges: LatticeEdge[]) {
  const touched = new Set<number>();
  for (const e of edges) { touched.add(e.blocked); touched.add(e.blockedBy); }
  return {
    connected: nodes.filter((n) => touched.has(n.number)),
    isolated: nodes.filter((n) => !touched.has(n.number)),
  };
}

/**
 * Apply hover/selection to an already-laid graph.
 *
 * Deliberately separate from layout(). Folding highlight into the layout meant
 * every mouseenter re-ran sixteen ordering sweeps and rebuilt every node
 * object, so the card under the cursor was torn down and recreated mid-hover -
 * which re-fired mouseleave/mouseenter and made it flicker.
 *
 * Positions are reused by reference here. Only `data` and edge styling change.
 */
export function decorate(
  laid: Laid,
  opts: { highlight: Set<number> | null; selected: number | null },
): { nodes: Node[]; edges: Edge[] } {
  const { highlight, selected } = opts;

  const nodes = laid.nodes.map((n) => {
    if (n.type !== 'issue') return n;
    const num = Number(n.id);
    const dim = highlight !== null && !highlight.has(num);
    const isSelected = selected === num;
    const data = n.data as { dim: boolean; selected: boolean };
    // Same object when nothing changed, so React can skip the subtree.
    if (data.dim === dim && data.selected === isSelected) return n;
    return { ...n, data: { ...n.data, dim, selected: isSelected } };
  });

  const edges = laid.edges.map((e) => {
    const edge = (e.data as { edge: { blocked: number; blockedBy: number } }).edge;
    const lit = highlight !== null
      && highlight.has(edge.blocked) && highlight.has(edge.blockedBy);
    const dim = highlight !== null && !lit;
    const style = lit ? EDGE_STYLE_LIT : dim ? EDGE_STYLE_DIM : EDGE_STYLE;
    if (e.style === style) return e;
    return { ...e, style, markerEnd: lit ? EDGE_MARKER_LIT : EDGE_MARKER, zIndex: lit ? 10 : 1 };
  });

  return { nodes, edges };
}
