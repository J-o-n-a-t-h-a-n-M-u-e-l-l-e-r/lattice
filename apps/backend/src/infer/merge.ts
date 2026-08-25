import type { Edge } from '@lattice/types';
import { edgeKey } from '@lattice/types';

export const BLOCK_THRESHOLD = Number(process.env.LATTICE_BLOCK_THRESHOLD ?? '0.8');

/**
 * Combine candidates for the same pair, then decide what *blocks*.
 *
 * Every edge is kept, whatever its score - low-confidence edges are still
 * useful as weak signals in the UI, and a later run with better evidence can
 * promote one without rediscovering it. The threshold only decides whether an
 * edge constrains the schedule.
 */
export function mergeEdges(groups: Edge[][]): Edge[] {
  const byPair = new Map<string, Edge[]>();
  for (const group of groups) {
    for (const e of group) {
      const k = edgeKey(e.blocked, e.blockedBy);
      if (!byPair.has(k)) byPair.set(k, []);
      byPair.get(k)!.push(e);
    }
  }

  const merged = new Map<string, Edge>();
  for (const [k, candidates] of byPair) {
    // `given` and `sub_issue` are ground truth; they win outright.
    const authoritative = candidates.find((c) => c.source === 'given')
      ?? candidates.find((c) => c.source === 'sub_issue');
    if (authoritative) {
      merged.set(k, { ...authoritative, blocking: true });
      continue;
    }

    // Independent-evidence combination.
    let score = 1;
    for (const c of candidates) score *= 1 - c.confidence;
    score = 1 - score;

    // Agreement across DISTINCT layers is stronger than the same layer twice.
    const layers = new Set(candidates.map((c) => c.source));
    if (layers.size >= 2) score = Math.min(0.99, score + 0.05);

    const best = candidates.reduce((a, b) => (b.confidence > a.confidence ? b : a));
    merged.set(k, { ...best, confidence: score });
  }

  // Contested: both directions proposed. Penalise and never let it block -
  // a pair we cannot orient is exactly the pair we should not act on.
  for (const [k, e] of merged) {
    const reverse = merged.get(edgeKey(e.blockedBy, e.blocked));
    if (!reverse) continue;
    if (e.source === 'given' || e.source === 'sub_issue') continue;
    merged.set(k, { ...e, confidence: Math.max(0, e.confidence - 0.15), blocking: false });
  }

  const out: Edge[] = [];
  for (const e of merged.values()) {
    const contested = merged.has(edgeKey(e.blockedBy, e.blocked))
      && e.source !== 'given' && e.source !== 'sub_issue';
    const blocking = e.pinned
      || e.source === 'given'
      || e.source === 'sub_issue'
      || (!contested && e.type !== 'ordering_preference' && e.confidence >= BLOCK_THRESHOLD);
    out.push({ ...e, blocking: blocking && !e.suppressed });
  }
  return out;
}

/** Off by default: Ox Alpha's 1M context fits any realistic backlog in one call. */
export function clusterIssues<T>(items: T[], size: number): T[][] {
  if (size <= 0 || items.length <= size) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
