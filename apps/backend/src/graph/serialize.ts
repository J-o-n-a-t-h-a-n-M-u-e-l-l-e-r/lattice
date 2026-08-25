import type { Edge, GraphNode, GraphPayload, Issue } from '@lattice/types';
import { computeSchedule, reasonFor } from './schedule.js';

/**
 * Turn the scheduled graph into exactly what the API returns and the UI draws.
 * The view should never join, filter or recompute — it receives a payload and
 * lays it out.
 *
 * Sends the FULL edge set with `blocking` marked rather than filtered:
 * transitive reduction and the blocking/non-blocking distinction are both
 * rendering choices made in the web app.
 */
export function serializeGraph(
  repo: string,
  issues: Issue[],
  edges: Edge[],
  opts: { runId?: string | null; cycleBreaks?: GraphPayload['cycleBreaks'] } = {},
): GraphPayload {
  const schedule = computeSchedule(issues, edges);
  const open = issues.filter((i) => i.state === 'open');

  const nodes: GraphNode[] = open.map((issue) => {
    const entry = schedule.entries.get(issue.number)!;
    return {
      ...entry,
      title: issue.title,
      state: issue.state,
      labels: issue.labels,
      milestone: issue.milestone,
      htmlUrl: issue.htmlUrl,
      reason: reasonFor(entry),
      unblocks: schedule.unblocks.get(issue.number) ?? [],
    };
  });

  const openSet = new Set(open.map((i) => i.number));
  const visible = edges.filter(
    (e) => openSet.has(e.blocked) && openSet.has(e.blockedBy) && !e.suppressed,
  );

  return {
    repo,
    runId: opts.runId ?? null,
    generatedAt: new Date().toISOString(),
    nodes: nodes.sort((a, b) => a.wave - b.wave || b.blastRadius - a.blastRadius || a.number - b.number),
    edges: visible,
    criticalPath: schedule.criticalPath,
    stats: {
      issues: open.length,
      edges: visible.length,
      blockingEdges: visible.filter((e) => e.blocking).length,
      waves: schedule.waves,
      readyCount: nodes.filter((n) => n.ready).length,
      criticalPathDays: schedule.criticalPathDays,
    },
    cycleBreaks: opts.cycleBreaks ?? [],
  };
}
