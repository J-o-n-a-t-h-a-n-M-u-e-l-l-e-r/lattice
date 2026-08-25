import type { Edge } from '@lattice/types';
import { rankReady, reasonFor } from '../graph/schedule.js';
import { buildGraphPayload, buildIssueContext } from '../api/graph.js';
import * as store from '../store/index.js';
import { computeSchedule } from '../graph/schedule.js';

/**
 * The agent-facing surface. Not a GitHub wrapper - the official GitHub MCP
 * server already does issue CRUD. This exposes the DERIVED SCHEDULE, which
 * exists nowhere else.
 *
 * All reads come from the store. No tool triggers inference or calls GitHub.
 */

export async function listReadyWork(repo: string, limit = 5, excludeClaimed = true) {
  const payload = await buildGraphPayload(repo);
  if (!payload) return { error: 'not_analysed', items: [] };

  const leases = excludeClaimed ? await store.activeLeases(repo) : [];
  const claimed = new Set(leases.map((l) => Number(l.number)));

  const items = payload.nodes
    .filter((n) => n.ready && !claimed.has(n.number))
    .slice(0, limit)
    .map((n) => ({
      number: n.number, title: n.title, url: n.htmlUrl,
      wave: n.wave, effort_days: n.effortDays, blast_radius: n.blastRadius,
      on_critical_path: n.onCriticalPath, slack_days: n.slackDays,
      unblocks: n.unblocks,
      reason: n.reason,
      suggested_base_ref: 'main',
    }));

  return {
    generated_at: payload.generatedAt,
    wave0_size: payload.nodes.filter((n) => n.ready).length,
    items,
  };
}

/**
 * The coordination primitive - what makes Lattice a scheduler rather than a
 * report. Atomic: two agents calling at once must never get the same issue.
 */
export async function claimNextIssue(repo: string, agentId: string, leaseMinutes = 45) {
  const ready = await listReadyWork(repo, 25, true);
  if ('error' in ready) return { claimed: false, reason: 'not_analysed' };

  for (const candidate of ready.items) {
    const ok = await store.tryClaim(repo, candidate.number, agentId, leaseMinutes);
    if (!ok) continue;

    const ctx = await buildIssueContext(repo, candidate.number);
    const consumers = (ctx?.dependents ?? [])
      .filter((d) => d.edge.blocking)
      .map((d) => `#${d.number} (${d.edge.type}: ${d.edge.rationale})`);

    return {
      claimed: true,
      issue: candidate,
      lease_expires_at: new Date(Date.now() + leaseMinutes * 60_000).toISOString(),
      base_ref: 'main',
      briefing: [
        `You are working #${candidate.number}: ${candidate.title}.`,
        candidate.unblocks.length
          ? `It blocks ${candidate.unblocks.map((n) => `#${n}`).join(', ')} (blast radius ${candidate.blast_radius}).`
          : 'Nothing currently depends on it.',
        ...consumers.map((c) => `${c} - keep the interface you expose stable.`),
        candidate.on_critical_path
          ? 'It is on the critical path: prefer a correct minimal change over a broad refactor.'
          : '',
        'If you discover an unrecorded blocker, call report_dependency rather than working around it.',
      ].filter(Boolean).join('\n'),
    };
  }
  return { claimed: false, reason: ready.items.length ? 'all_claimed' : 'no_ready_work' };
}

export async function getIssueContext(repo: string, number: number) {
  const ctx = await buildIssueContext(repo, number);
  if (!ctx) return { error: 'not_found' };
  return {
    issue: { number: ctx.issue.number, title: ctx.issue.title, url: ctx.issue.htmlUrl,
             state: ctx.issue.state, labels: ctx.issue.labels },
    blockers: ctx.blockers.map((b) => ({
      number: b.number, title: b.title, state: b.state,
      blocking: b.edge.blocking, why: b.edge.rationale,
    })),
    dependents: ctx.dependents.map((d) => ({
      number: d.number, title: d.title,
      what_they_need_from_you: d.edge.rationale, type: d.edge.type,
    })),
    why_this_matters: ctx.schedule ? reasonFor(ctx.schedule) : 'unscheduled',
    recommended_base_ref: 'main',
  };
}

/**
 * The only place an inferred edge's justification exists - nothing is written
 * to GitHub, so this is how anyone checks why an edge is there.
 */
export async function explainDependency(repo: string, blocked: number, blockedBy: number) {
  const edge = await store.getEdge(repo, blocked, blockedBy);
  if (!edge) return { error: 'not_found' };
  return {
    blocked, blocked_by: blockedBy, type: edge.type, confidence: edge.confidence,
    source: edge.source, rationale: edge.rationale, evidence: edge.evidence ?? null,
    blocking: edge.blocking, pinned: edge.pinned, first_seen_run: edge.firstSeenRun ?? null,
  };
}

/** The graph delta: an agent finishes and immediately learns what it unlocked. */
export async function reportProgress(
  repo: string, agentId: string, number: number,
  status: string, prUrl?: string, branch?: string, note?: string,
) {
  const before = await buildGraphPayload(repo);
  const readyBefore = new Set((before?.nodes ?? []).filter((n) => n.ready).map((n) => n.number));

  await store.updateLease(repo, number, { status, prUrl, branch, note });
  if (status === 'done') await store.closeIssueLocally(repo, number);

  const issues = await store.getIssues(repo);
  const edges = await store.getEdges(repo);
  const schedule = computeSchedule(issues, edges);
  const state = await store.getRepoState(repo);
  if (state?.latestRunId) await store.saveSchedule(repo, schedule, state.latestRunId);

  const newlyReady = [...schedule.entries.values()]
    .filter((e) => e.ready && !readyBefore.has(e.number))
    .map((e) => e.number);

  return {
    ok: true,
    graph_delta: {
      newly_ready: newlyReady,
      critical_path_changed:
        JSON.stringify(schedule.criticalPath) !== JSON.stringify(before?.criticalPath ?? []),
      remaining_days: schedule.criticalPathDays,
    },
  };
}

/**
 * An agent that hit a real wall is better evidence than a model reading titles
 * - but it gets no privileged path. Same validation, same threshold.
 */
export async function reportDependency(
  repo: string, agentId: string, blocked: number, blockedBy: number,
  rationale: string, evidence: string,
) {
  const [a, b] = await Promise.all([store.getIssue(repo, blocked), store.getIssue(repo, blockedBy)]);
  if (!a || !b) return { accepted: false, reason: 'unknown_issue' };
  if (blocked === blockedBy) return { accepted: false, reason: 'self_edge' };

  const haystack = `${a.title}\n${a.body}\n${b.title}\n${b.body}`.toLowerCase().replace(/\s+/g, ' ');
  const quote = evidence.toLowerCase().replace(/\s+/g, ' ').trim();
  if (quote && !haystack.includes(quote)) {
    return { accepted: false, reason: 'fabricated_evidence' };
  }

  const existing = await store.getEdges(repo);
  if (existing.some((e) => e.blocked === blockedBy && e.blockedBy === blocked && e.source === 'given')) {
    return { accepted: false, reason: 'contradicts_given' };
  }

  const state = await store.getRepoState(repo);
  const edge: Edge = {
    blocked, blockedBy, type: 'hard_blocker', confidence: 0.9,
    source: 'agent_reported', rationale,
    evidence: quote ? { issue: blocked, quote: evidence } : undefined,
    blocking: true, pinned: false, suppressed: false,
  };
  await store.upsertEdge(repo, edge, state?.latestRunId ?? 'agent');

  const issues = await store.getIssues(repo);
  const edges = await store.getEdges(repo);
  const schedule = computeSchedule(issues, edges);
  if (state?.latestRunId) await store.saveSchedule(repo, schedule, state.latestRunId);

  return {
    accepted: true, blocking: true,
    graph_delta: { newly_blocked: [blocked] },
  };
}

/** "If we finish these two today, what opens up tomorrow?" */
export async function simulateCompletion(repo: string, numbers: number[]) {
  const issues = await store.getIssues(repo);
  const edges = await store.getEdges(repo);
  const before = computeSchedule(issues, edges);
  const after = computeSchedule(
    issues.map((i) => (numbers.includes(i.number) ? { ...i, state: 'closed' as const } : i)),
    edges,
  );
  const readyBefore = new Set([...before.entries.values()].filter((e) => e.ready).map((e) => e.number));
  const newlyReady = [...after.entries.values()]
    .filter((e) => e.ready && !readyBefore.has(e.number))
    .map((e) => ({ number: e.number, title: issues.find((i) => i.number === e.number)?.title ?? '' }));

  return {
    newly_ready: newlyReady,
    new_critical_path: after.criticalPath,
    days_saved: before.criticalPathDays - after.criticalPathDays,
    max_parallelism_after: [...after.entries.values()].filter((e) => e.ready).length,
  };
}

export { rankReady };
