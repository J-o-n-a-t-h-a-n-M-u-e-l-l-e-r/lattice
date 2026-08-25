import type { GraphPayload, IssueContext } from '@lattice/types';
import { serializeGraph } from '../graph/serialize.js';
import * as store from '../store/index.js';

/**
 * Everything here reads the store and serialises. No route runs inference,
 * calls GitHub, or recomputes a topological sort.
 */

export async function buildGraphPayload(repo: string): Promise<GraphPayload | null> {
  const issues = await store.getIssues(repo);
  if (issues.length === 0) return null;
  const edges = await store.getEdges(repo);
  const state = await store.getRepoState(repo);
  const cycleBreaks = await store.getCycleBreaks(repo, state?.latestRunId ?? null);
  return serializeGraph(repo, issues, edges, { runId: state?.latestRunId ?? null, cycleBreaks });
}

export async function buildIssueContext(repo: string, number: number): Promise<IssueContext | null> {
  const issue = await store.getIssue(repo, number);
  if (!issue) return null;
  const [edges, issues, schedule] = await Promise.all([
    store.getEdges(repo), store.getIssues(repo), store.getScheduleEntries(repo),
  ]);
  const byNumber = new Map(issues.map((i) => [i.number, i]));

  return {
    issue,
    blockers: edges
      .filter((e) => e.blocked === number && !e.suppressed)
      .map((e) => ({
        number: e.blockedBy,
        title: byNumber.get(e.blockedBy)?.title ?? `#${e.blockedBy}`,
        state: byNumber.get(e.blockedBy)?.state ?? 'open',
        edge: e,
      })),
    dependents: edges
      .filter((e) => e.blockedBy === number && !e.suppressed)
      .map((e) => ({
        number: e.blocked,
        title: byNumber.get(e.blocked)?.title ?? `#${e.blocked}`,
        state: byNumber.get(e.blocked)?.state ?? 'open',
        edge: e,
      })),
    schedule: schedule.find((s) => s.number === number) ?? null,
  };
}
