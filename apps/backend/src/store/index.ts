import { randomUUID } from 'node:crypto';
import type {
  CycleBreak, Edge, GraphPayload, Issue, Rejection, RunSummary, RunTrigger, ScheduleEntry,
} from '@lattice/types';
import { getDb } from './db.js';
import type { Schedule } from '../graph/schedule.js';

const row = <T>(rows: T[]): T | null => rows[0] ?? null;

/* ─────────────────────────────────── runs ─────────────────────────────────── */

export async function startRun(repo: string, trigger: RunTrigger, model: string, clusterSize: number) {
  const db = await getDb();
  const id = randomUUID();
  await db.query(
    `INSERT INTO runs (id, repo, trigger, model, cluster_size) VALUES ($1,$2,$3,$4,$5)`,
    [id, repo, trigger, model, clusterSize],
  );
  return id;
}

export async function finishRun(
  id: string,
  patch: Partial<{
    status: string; requests: number; cacheHits: number; edgesProposed: number;
    edgesKept: number; edgesBlocking: number; rejectionCounts: Record<string, number>;
    error: string | null;
  }>,
) {
  const db = await getDb();
  await db.query(
    `UPDATE runs SET
       finished_at = now(),
       duration_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000,
       status = COALESCE($2, status),
       requests = COALESCE($3, requests),
       cache_hits = COALESCE($4, cache_hits),
       edges_proposed = COALESCE($5, edges_proposed),
       edges_kept = COALESCE($6, edges_kept),
       edges_blocking = COALESCE($7, edges_blocking),
       rejection_counts = COALESCE($8, rejection_counts),
       error = $9
     WHERE id = $1`,
    [id, patch.status ?? null, patch.requests ?? null, patch.cacheHits ?? null,
     patch.edgesProposed ?? null, patch.edgesKept ?? null, patch.edgesBlocking ?? null,
     patch.rejectionCounts ? JSON.stringify(patch.rejectionCounts) : null, patch.error ?? null],
  );
}

const toRun = (r: Record<string, any>): RunSummary => ({
  id: r.id, repo: r.repo, trigger: r.trigger,
  startedAt: new Date(r.started_at).toISOString(),
  finishedAt: r.finished_at ? new Date(r.finished_at).toISOString() : null,
  durationMs: r.duration_ms === null ? null : Math.round(Number(r.duration_ms)),
  status: r.status, model: r.model,
  requests: Number(r.requests), cacheHits: Number(r.cache_hits),
  edgesProposed: Number(r.edges_proposed), edgesKept: Number(r.edges_kept),
  edgesBlocking: Number(r.edges_blocking),
  rejectionCounts: typeof r.rejection_counts === 'string'
    ? JSON.parse(r.rejection_counts) : (r.rejection_counts ?? {}),
  error: r.error ?? null,
});

export async function listRuns(repo: string, limit = 20): Promise<RunSummary[]> {
  const db = await getDb();
  const rows = await db.query<Record<string, any>>(
    `SELECT * FROM runs WHERE repo = $1 ORDER BY started_at DESC LIMIT $2`, [repo, limit]);
  return rows.map(toRun);
}

export async function getRun(id: string): Promise<RunSummary | null> {
  const db = await getDb();
  const r = row(await db.query<Record<string, any>>(`SELECT * FROM runs WHERE id = $1`, [id]));
  return r ? toRun(r) : null;
}

export async function getRunDetail(id: string) {
  const db = await getDb();
  const run = await getRun(id);
  if (!run) return null;
  const rejections = await db.query<Record<string, any>>(
    `SELECT * FROM rejections WHERE run_id = $1`, [id]);
  const cycles = await db.query<Record<string, any>>(
    `SELECT * FROM cycle_breaks WHERE run_id = $1`, [id]);
  const belowThreshold = await db.query<Record<string, any>>(
    `SELECT * FROM edges WHERE repo = $1 AND blocking = false AND suppressed = false
     ORDER BY confidence DESC`, [run.repo]);
  return {
    ...run,
    rejections: rejections.map((r) => ({
      blocked: r.blocked, blockedBy: r.blocked_by, reason: r.reason,
      confidence: r.confidence, rationale: r.rationale,
    })),
    cycleBreaks: cycles.map(parseCycle),
    belowThreshold: belowThreshold.map(toEdge),
  };
}

const parseJson = (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : v);
const parseCycle = (r: Record<string, any>): CycleBreak => ({
  cycle: parseJson(r.cycle), victim: parseJson(r.victim),
  alternatives: parseJson(r.alternatives) ?? [], reason: r.reason,
});

/* ────────────────────────────────── issues ────────────────────────────────── */

export async function saveIssues(repo: string, issues: Issue[]) {
  const db = await getDb();
  for (const i of issues) {
    await db.query(
      `INSERT INTO issues (repo, number, database_id, node_id, title, body, labels,
                           milestone, state, html_url, effort_days, fetched_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
       ON CONFLICT (repo, number) DO UPDATE SET
         database_id = EXCLUDED.database_id, node_id = EXCLUDED.node_id,
         title = EXCLUDED.title, body = EXCLUDED.body, labels = EXCLUDED.labels,
         milestone = EXCLUDED.milestone, state = EXCLUDED.state,
         html_url = EXCLUDED.html_url,
         effort_days = COALESCE(EXCLUDED.effort_days, issues.effort_days),
         fetched_at = now()`,
      [repo, i.number, i.databaseId, i.nodeId, i.title, i.body,
       JSON.stringify(i.labels), i.milestone, i.state, i.htmlUrl, i.effortDays],
    );
  }
}

const toIssue = (r: Record<string, any>): Issue => ({
  number: Number(r.number), databaseId: Number(r.database_id), nodeId: r.node_id,
  title: r.title, body: r.body ?? '', labels: parseJson(r.labels) ?? [],
  milestone: r.milestone, state: r.state, htmlUrl: r.html_url,
  effortDays: r.effort_days === null ? null : Number(r.effort_days),
});

export async function getIssues(repo: string): Promise<Issue[]> {
  const db = await getDb();
  const rows = await db.query<Record<string, any>>(
    `SELECT * FROM issues WHERE repo = $1 ORDER BY number`, [repo]);
  return rows.map(toIssue);
}

export async function getIssue(repo: string, number: number): Promise<Issue | null> {
  const db = await getDb();
  const r = row(await db.query<Record<string, any>>(
    `SELECT * FROM issues WHERE repo = $1 AND number = $2`, [repo, number]));
  return r ? toIssue(r) : null;
}

export async function setEffortEstimates(repo: string, estimates: Map<number, number>) {
  const db = await getDb();
  for (const [number, days] of estimates) {
    await db.query(`UPDATE issues SET effort_days = $3 WHERE repo = $1 AND number = $2`,
      [repo, number, days]);
  }
}

/* ─────────────────────────────────── edges ────────────────────────────────── */

const toEdge = (r: Record<string, any>): Edge => ({
  blocked: Number(r.blocked), blockedBy: Number(r.blocked_by), type: r.type,
  confidence: Number(r.confidence), source: r.source, rationale: r.rationale ?? '',
  evidence: r.evidence_quote
    ? { issue: Number(r.evidence_issue), quote: r.evidence_quote }
    : undefined,
  blocking: Boolean(r.blocking), pinned: Boolean(r.pinned), suppressed: Boolean(r.suppressed),
});

/**
 * Replace the inferred graph for a repo. Human intent survives: `pinned` and
 * `suppressed` flags are carried over, and rows the pipeline no longer infers
 * are removed only if they were inferred in the first place.
 */
export async function replaceGraph(repo: string, edges: Edge[], runId: string) {
  const db = await getDb();
  const existing = await db.query<Record<string, any>>(
    `SELECT * FROM edges WHERE repo = $1`, [repo]);
  const flags = new Map(existing.map((r) => [
    `${r.blocked}<-${r.blocked_by}`,
    { pinned: Boolean(r.pinned), suppressed: Boolean(r.suppressed), firstSeen: r.first_seen_run },
  ]));

  await db.query(`DELETE FROM edges WHERE repo = $1 AND pinned = false`, [repo]);

  for (const e of edges) {
    const prev = flags.get(`${e.blocked}<-${e.blockedBy}`);
    await db.query(
      `INSERT INTO edges (repo, blocked, blocked_by, type, confidence, source, rationale,
                          evidence_issue, evidence_quote, blocking, pinned, suppressed,
                          first_seen_run, last_seen_run)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (repo, blocked, blocked_by) DO UPDATE SET
         type = EXCLUDED.type, confidence = EXCLUDED.confidence,
         source = EXCLUDED.source, rationale = EXCLUDED.rationale,
         evidence_issue = EXCLUDED.evidence_issue, evidence_quote = EXCLUDED.evidence_quote,
         blocking = EXCLUDED.blocking, last_seen_run = EXCLUDED.last_seen_run`,
      [repo, e.blocked, e.blockedBy, e.type, e.confidence, e.source, e.rationale,
       e.evidence?.issue ?? null, e.evidence?.quote ?? null,
       e.blocking, prev?.pinned ?? e.pinned, prev?.suppressed ?? e.suppressed,
       prev?.firstSeen ?? runId, runId],
    );
  }
}

export async function getEdges(repo: string): Promise<Edge[]> {
  const db = await getDb();
  const rows = await db.query<Record<string, any>>(
    `SELECT * FROM edges WHERE repo = $1`, [repo]);
  return rows.map(toEdge);
}

export async function getEdge(repo: string, blocked: number, blockedBy: number) {
  const db = await getDb();
  const r = row(await db.query<Record<string, any>>(
    `SELECT * FROM edges WHERE repo=$1 AND blocked=$2 AND blocked_by=$3`,
    [repo, blocked, blockedBy]));
  return r ? { ...toEdge(r), firstSeenRun: r.first_seen_run } : null;
}

export async function upsertEdge(repo: string, e: Edge, runId: string) {
  await replaceGraphAppend(repo, e, runId);
}

async function replaceGraphAppend(repo: string, e: Edge, runId: string) {
  const db = await getDb();
  await db.query(
    `INSERT INTO edges (repo, blocked, blocked_by, type, confidence, source, rationale,
                        evidence_issue, evidence_quote, blocking, first_seen_run, last_seen_run)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11)
     ON CONFLICT (repo, blocked, blocked_by) DO UPDATE SET
       confidence = GREATEST(edges.confidence, EXCLUDED.confidence),
       source = EXCLUDED.source, rationale = EXCLUDED.rationale,
       blocking = EXCLUDED.blocking, last_seen_run = EXCLUDED.last_seen_run`,
    [repo, e.blocked, e.blockedBy, e.type, e.confidence, e.source, e.rationale,
     e.evidence?.issue ?? null, e.evidence?.quote ?? null, e.blocking, runId],
  );
}

export async function setEdgeFlag(
  repo: string, blocked: number, blockedBy: number, flag: 'pinned' | 'suppressed', value: boolean,
) {
  const db = await getDb();
  await db.query(
    `UPDATE edges SET ${flag} = $4${flag === 'pinned' && value ? ', blocking = true' : ''}
     WHERE repo=$1 AND blocked=$2 AND blocked_by=$3`,
    [repo, blocked, blockedBy, value]);
}

/* ───────────────────────── rejections, cycles, schedule ───────────────────── */

export async function saveRejections(runId: string, repo: string, rejections: Rejection[]) {
  const db = await getDb();
  for (const r of rejections) {
    await db.query(
      `INSERT INTO rejections (run_id, repo, blocked, blocked_by, reason, confidence, rationale)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [runId, repo, r.blocked, r.blockedBy, r.reason, r.confidence, r.rationale]);
  }
}

export async function saveCycleBreaks(runId: string, repo: string, breaks: CycleBreak[]) {
  const db = await getDb();
  for (const b of breaks) {
    await db.query(
      `INSERT INTO cycle_breaks (run_id, repo, cycle, victim, alternatives, reason)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [runId, repo, JSON.stringify(b.cycle), b.victim ? JSON.stringify(b.victim) : null,
       JSON.stringify(b.alternatives), b.reason]);
  }
}

export async function saveSchedule(repo: string, schedule: Schedule, runId: string) {
  const db = await getDb();
  await db.query(`DELETE FROM schedule WHERE repo = $1`, [repo]);
  for (const e of schedule.entries.values()) {
    await db.query(
      `INSERT INTO schedule (repo, number, wave, blast_radius, on_critical_path,
                             slack_days, ready, effort_days, run_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [repo, e.number, e.wave, e.blastRadius, e.onCriticalPath, e.slackDays,
       e.ready, e.effortDays, runId]);
  }
  await db.query(
    `INSERT INTO repo_state (repo, latest_run_id, critical_path, updated_at)
     VALUES ($1,$2,$3, now())
     ON CONFLICT (repo) DO UPDATE SET
       latest_run_id = EXCLUDED.latest_run_id,
       critical_path = EXCLUDED.critical_path, updated_at = now()`,
    [repo, runId, JSON.stringify(schedule.criticalPath)]);
}

export async function getScheduleEntries(repo: string): Promise<ScheduleEntry[]> {
  const db = await getDb();
  const rows = await db.query<Record<string, any>>(
    `SELECT * FROM schedule WHERE repo = $1`, [repo]);
  return rows.map((r) => ({
    number: Number(r.number), wave: Number(r.wave), blastRadius: Number(r.blast_radius),
    onCriticalPath: Boolean(r.on_critical_path), slackDays: Number(r.slack_days),
    ready: Boolean(r.ready), effortDays: Number(r.effort_days),
  }));
}

export async function getRepoState(repo: string) {
  const db = await getDb();
  const r = row(await db.query<Record<string, any>>(
    `SELECT * FROM repo_state WHERE repo = $1`, [repo]));
  return r ? { latestRunId: r.latest_run_id as string | null, criticalPath: parseJson(r.critical_path) as number[] } : null;
}

export async function getCycleBreaks(repo: string, runId: string | null): Promise<CycleBreak[]> {
  if (!runId) return [];
  const db = await getDb();
  const rows = await db.query<Record<string, any>>(
    `SELECT * FROM cycle_breaks WHERE repo = $1 AND run_id = $2`, [repo, runId]);
  return rows.map(parseCycle);
}

/* ─────────────────────────────── llm cache ────────────────────────────────── */

export async function cacheGet(key: string): Promise<unknown | null> {
  const db = await getDb();
  const r = row(await db.query<Record<string, any>>(
    `SELECT response FROM llm_cache WHERE key = $1`, [key]));
  return r ? parseJson(r.response) : null;
}

export async function cachePut(key: string, model: string, response: unknown) {
  const db = await getDb();
  await db.query(
    `INSERT INTO llm_cache (key, model, response) VALUES ($1,$2,$3)
     ON CONFLICT (key) DO UPDATE SET response = EXCLUDED.response`,
    [key, model, JSON.stringify(response)]);
}

/* ─────────────────────────────────── leases ───────────────────────────────── */

export async function reapExpiredLeases(repo: string) {
  const db = await getDb();
  await db.query(
    `DELETE FROM leases WHERE repo = $1 AND expires_at < now() AND status = 'claimed'`, [repo]);
}

export async function activeLeases(repo: string) {
  await reapExpiredLeases(repo);
  const db = await getDb();
  return db.query<Record<string, any>>(
    `SELECT * FROM leases WHERE repo = $1 AND status IN ('claimed','pr_opened','started')`, [repo]);
}

/** Atomic: two agents calling simultaneously must never get the same issue. */
export async function tryClaim(repo: string, number: number, agentId: string, minutes: number) {
  await reapExpiredLeases(repo);
  const db = await getDb();
  const res = await db.query<Record<string, any>>(
    `INSERT INTO leases (repo, number, agent_id, expires_at, status)
     VALUES ($1,$2,$3, now() + ($4 || ' minutes')::interval, 'claimed')
     ON CONFLICT (repo, number) DO NOTHING
     RETURNING *`,
    [repo, number, agentId, String(minutes)]);
  return res.length > 0;
}

export async function updateLease(
  repo: string, number: number, patch: { status?: string; prUrl?: string; branch?: string; note?: string },
) {
  const db = await getDb();
  if (patch.status === 'done' || patch.status === 'abandoned') {
    await db.query(`DELETE FROM leases WHERE repo=$1 AND number=$2`, [repo, number]);
    return;
  }
  await db.query(
    `UPDATE leases SET status = COALESCE($3, status), pr_url = COALESCE($4, pr_url),
       branch = COALESCE($5, branch), note = COALESCE($6, note)
     WHERE repo=$1 AND number=$2`,
    [repo, number, patch.status ?? null, patch.prUrl ?? null, patch.branch ?? null, patch.note ?? null]);
}

export async function closeIssueLocally(repo: string, number: number) {
  const db = await getDb();
  await db.query(`UPDATE issues SET state='closed' WHERE repo=$1 AND number=$2`, [repo, number]);
}

export type { GraphPayload };
