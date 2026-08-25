import type { Edge, Rejection, RunTrigger } from '@lattice/types';
import { edgeKey } from '@lattice/types';
import { fetchGivenEdges, fetchIssues, fetchSubIssueEdges } from '../github/fetch.js';
import { makeAcyclic } from '../graph/acyclic.js';
import { computeSchedule } from '../graph/schedule.js';
import * as store from '../store/index.js';
import { extractEdges, MODEL } from './llm.js';
import { BLOCK_THRESHOLD, clusterIssues, mergeEdges } from './merge.js';
import { validateEdges } from './validate.js';

export interface RunOptions {
  repo: string;                 // "owner/name"
  trigger?: RunTrigger;
  clusterSize?: number;
  cached?: boolean;             // reuse the stored issue snapshot, skip GitHub
  existingRunId?: string;       // a run row already created by the API
  onProgress?: (line: string) => void;
}

export interface RunResult {
  runId: string;
  status: 'ok' | 'partial' | 'failed';
  requests: number;
  cacheHits: number;
  edgesProposed: number;
  edgesKept: number;
  edgesBlocking: number;
  rejectionCounts: Record<string, number>;
  cycleBreaks: number;
}

/**
 * The pipeline, end to end. Triggered by issue events, a schedule, or by hand.
 * It ends at the store: nothing is written to GitHub.
 */
export async function runPipeline(opts: RunOptions): Promise<RunResult> {
  const { repo } = opts;
  const [owner, name] = repo.split('/');
  if (!owner || !name) throw new Error(`repo must be "owner/name", got "${repo}"`);
  const clusterSize = opts.clusterSize ?? Number(process.env.LATTICE_CLUSTER_SIZE ?? '0');
  const log = opts.onProgress ?? (() => {});

  const runId = opts.existingRunId
    ?? await store.startRun(repo, opts.trigger ?? 'manual', MODEL, clusterSize);

  try {
    // ---- L0 ingest -------------------------------------------------------
    let issues = opts.cached ? await store.getIssues(repo) : [];
    if (issues.length === 0) {
      log(`fetching issues from ${repo}...`);
      issues = await fetchIssues(owner, name);
      await store.saveIssues(repo, issues);
    }
    const open = issues.filter((i) => i.state === 'open');
    log(`${issues.length} issues (${open.length} open)`);

    // A guard, not a limit we are proud of. The whole backlog goes to the model
    // in one request, so a repo with a thousand open issues would blow the
    // context, take an age, and eat a day's request quota for a graph nobody
    // could read. Raise LATTICE_MAX_ISSUES once clustering (#12) is enabled.
    const maxIssues = Number(process.env.LATTICE_MAX_ISSUES ?? '300');
    if (open.length > maxIssues && clusterSize === 0) {
      throw new Error(
        `${open.length} open issues exceeds LATTICE_MAX_ISSUES=${maxIssues}. ` +
        `Set LATTICE_CLUSTER_SIZE to enable the clustered path, or raise the cap.`);
    }

    // ---- L1 given edges: API-sourced, no text parsing --------------------
    let given: Edge[] = [];
    if (!opts.cached) {
      given = [
        ...(await fetchGivenEdges(owner, name, issues)),
        ...(await fetchSubIssueEdges(owner, name)),
      ];
    }
    log(`${given.length} given edges (native blocked_by + sub-issue hierarchy)`);

    // ---- L2/L3 inference -------------------------------------------------
    const existing = await store.getEdges(repo);
    const suppressed = new Set(
      existing.filter((e) => e.suppressed).map((e) => edgeKey(e.blocked, e.blockedBy)));
    const pinned = existing.filter((e) => e.pinned);

    const clusters = clusterIssues(open, clusterSize);
    log(`${clusters.length} cluster(s), model ${MODEL}`);

    let requests = 0;
    let cacheHits = 0;
    let proposed = 0;
    let failedClusters = 0;
    const inferred: Edge[][] = [];
    const rejections: Rejection[] = [];
    const estimates = new Map<number, number>();

    for (const [i, cluster] of clusters.entries()) {
      const ctx = given
        .filter((g) => cluster.some((c) => c.number === g.blocked))
        .map((g) => [g.blocked, g.blockedBy] as [number, number]);

      const outcome = await extractEdges(cluster, ctx);
      requests += outcome.requests;
      if (outcome.cacheHit) cacheHits++;

      if (!outcome.result) {
        failedClusters++;
        log(`  cluster ${i + 1}/${clusters.length}: FAILED (${outcome.error ?? 'unknown'})`);
        continue;
      }

      proposed += outcome.result.edges.length;
      const { kept, rejected } = validateEdges(outcome.result.edges, cluster, given, suppressed);
      inferred.push(kept);
      rejections.push(...rejected);
      for (const est of outcome.result.estimates) estimates.set(est.issue, est.effort_days);
      log(`  cluster ${i + 1}/${clusters.length}: ${outcome.result.edges.length} proposed, ` +
          `${kept.length} kept, ${rejected.length} rejected${outcome.cacheHit ? ' (cached)' : ''}`);
    }

    if (estimates.size > 0) await store.setEffortEstimates(repo, estimates);

    // ---- L5 merge + threshold -------------------------------------------
    const merged = mergeEdges([given, pinned, ...inferred]);
    log(`${merged.length} edges after merge (threshold ${BLOCK_THRESHOLD})`);

    // ---- L6 make acyclic (automatic; given edges are immutable) ----------
    const nodes = open.map((i) => i.number);
    const blocking = merged.filter((e) => e.blocking);
    const nonBlocking = merged.filter((e) => !e.blocking);
    const { dag, breaks, excluded } = makeAcyclic(nodes, blocking);

    const survived = new Set(dag.map((e) => edgeKey(e.blocked, e.blockedBy)));
    const finalEdges: Edge[] = [
      ...dag,
      // A cut edge is not deleted from the graph - it stops blocking, stays
      // visible, and keeps its evidence so `/runs` can explain the cut.
      ...blocking
        .filter((e) => !survived.has(edgeKey(e.blocked, e.blockedBy)))
        .map((e) => ({ ...e, blocking: false })),
      ...nonBlocking,
    ];

    if (breaks.length > 0) {
      log(`${breaks.length} cycle(s) broken` +
          (excluded.length ? `, ${excluded.length} issue(s) excluded as unresolvable` : ''));
    }

    // ---- L7 persist ------------------------------------------------------
    await store.replaceGraph(repo, finalEdges, runId);
    await store.saveRejections(runId, repo, rejections);
    await store.saveCycleBreaks(runId, repo, breaks);

    const schedule = computeSchedule(issues, finalEdges);
    await store.saveSchedule(repo, schedule, runId);

    const rejectionCounts: Record<string, number> = {};
    for (const r of rejections) rejectionCounts[r.reason] = (rejectionCounts[r.reason] ?? 0) + 1;

    const edgesBlocking = finalEdges.filter((e) => e.blocking).length;
    const status = failedClusters > 0 ? 'partial' : 'ok';

    await store.finishRun(runId, {
      status, requests, cacheHits,
      edgesProposed: proposed, edgesKept: finalEdges.length, edgesBlocking,
      rejectionCounts,
    });

    log(`done: ${requests} request(s) · ${proposed} proposed · ${finalEdges.length} kept · ` +
        `${edgesBlocking} blocking · ${rejections.length} rejected · ${breaks.length} cycle(s)`);

    return { runId, status, requests, cacheHits, edgesProposed: proposed,
             edgesKept: finalEdges.length, edgesBlocking, rejectionCounts,
             cycleBreaks: breaks.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await store.finishRun(runId, { status: 'failed', error: message });
    throw err;
  }
}
