import { z } from 'zod';

/* ────────────────────────────── core vocabulary ───────────────────────────── */

/** Where an edge came from. Governs immutability and how much we trust it. */
export const SourceLayer = z.enum([
  'given',           // native blocked_by read from GitHub — immutable ground truth
  'sub_issue',       // native hierarchy read from GitHub
  'llm',             // inferred by the model
  'agent_reported',  // an agent hit this blocker while doing the work
]);
export type SourceLayer = z.infer<typeof SourceLayer>;

/**
 * The kind of dependency. `ordering_preference` exists so the model has
 * somewhere to put a weak intuition that is not actually a blocker — it is
 * never `blocking`, and having it available measurably reduces the urge to
 * dress topical similarity up as a hard dependency.
 */
export const DependencyType = z.enum([
  'hard_blocker',
  'data_contract',
  'shared_artifact',
  'ordering_preference',
]);
export type DependencyType = z.infer<typeof DependencyType>;

export const Evidence = z.object({
  issue: z.number().int(),
  /** Verbatim span from that issue. Validated against source text; never trusted. */
  quote: z.string(),
});
export type Evidence = z.infer<typeof Evidence>;

export const Edge = z.object({
  blocked: z.number().int(),
  blockedBy: z.number().int(),
  type: DependencyType,
  confidence: z.number().min(0).max(1),
  source: SourceLayer,
  rationale: z.string(),
  evidence: Evidence.optional(),
  /** score >= threshold and not a soft edge: constrains the schedule. */
  blocking: z.boolean().default(false),
  pinned: z.boolean().default(false),
  suppressed: z.boolean().default(false),
});
export type Edge = z.infer<typeof Edge>;

export const Issue = z.object({
  number: z.number().int(),
  /** Global database id. Stable across renames; `number` is the human-facing one. */
  databaseId: z.number().int(),
  nodeId: z.string(),
  title: z.string(),
  body: z.string(),
  labels: z.array(z.string()),
  milestone: z.string().nullable(),
  state: z.enum(['open', 'closed']),
  htmlUrl: z.string(),
  effortDays: z.number().nullable().default(null),
});
export type Issue = z.infer<typeof Issue>;

/* ─────────────────────────────── run artifacts ────────────────────────────── */

export const RejectionReason = z.enum([
  'unknown_or_self_id',
  'fabricated_evidence',
  'contradicts_given',
  'density_cap',
  'suppressed',
  'schema_invalid',
]);
export type RejectionReason = z.infer<typeof RejectionReason>;

export const Rejection = z.object({
  blocked: z.number().int(),
  blockedBy: z.number().int(),
  reason: RejectionReason,
  confidence: z.number().nullable(),
  rationale: z.string(),
});
export type Rejection = z.infer<typeof Rejection>;

export const CycleBreak = z.object({
  /** The actual loop, e.g. [12, 19, 23, 12] — rendered as a path in the UI. */
  cycle: z.array(z.number().int()),
  victim: z.object({ blocked: z.number().int(), blockedBy: z.number().int() }).nullable(),
  alternatives: z.array(z.object({ blocked: z.number().int(), blockedBy: z.number().int() })),
  reason: z.enum(['lowest_weight_arc_on_cycle', 'unresolvable_given_cycle']),
});
export type CycleBreak = z.infer<typeof CycleBreak>;

export const RunTrigger = z.enum(['manual', 'webhook', 'schedule', 'agent']);
export type RunTrigger = z.infer<typeof RunTrigger>;

export const RunSummary = z.object({
  id: z.string(),
  repo: z.string(),
  trigger: RunTrigger,
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  durationMs: z.number().nullable(),
  status: z.enum(['ok', 'partial', 'failed', 'running']),
  model: z.string().nullable(),
  requests: z.number().int(),
  cacheHits: z.number().int(),
  edgesProposed: z.number().int(),
  edgesKept: z.number().int(),
  edgesBlocking: z.number().int(),
  rejectionCounts: z.record(z.number().int()),
  error: z.string().nullable().default(null),
  /** What the pipeline is doing right now. Null once finished. */
  phase: z.string().nullable().default(null),
  phaseDetail: z.string().nullable().default(null),
  progress: z.record(z.unknown()).default({}),
});

/** The pipeline's phases, in order. The UI renders these as a checklist. */
export const RUN_PHASES = [
  { id: 'ingest',    label: 'Reading issues from GitHub' },
  { id: 'given',     label: 'Collecting existing dependencies' },
  { id: 'infer',     label: 'Inferring the dependency graph' },
  { id: 'validate',  label: 'Validating evidence' },
  { id: 'schedule',  label: 'Breaking cycles and scheduling' },
  { id: 'persist',   label: 'Saving the graph' },
] as const;
export type RunSummary = z.infer<typeof RunSummary>;

/* ─────────────────────────── derived schedule + API ───────────────────────── */

export interface ScheduleEntry {
  number: number;
  /** 0 = startable now. Computed over OPEN issues only, so the graph stays live. */
  wave: number;
  blastRadius: number;
  onCriticalPath: boolean;
  slackDays: number;
  ready: boolean;
  effortDays: number;
}

export interface GraphNode extends ScheduleEntry {
  title: string;
  state: 'open' | 'closed';
  labels: string[];
  milestone: string | null;
  htmlUrl: string;
  /** Human sentence, never a bare score: "ready · critical path · unblocks 7". */
  reason: string;
  unblocks: number[];
}

export interface GraphPayload {
  repo: string;
  runId: string | null;
  generatedAt: string;
  nodes: GraphNode[];
  /** The FULL edge set. Transitive reduction is a rendering choice, made in the UI. */
  edges: Edge[];
  criticalPath: number[];
  stats: {
    issues: number;
    edges: number;
    blockingEdges: number;
    waves: number;
    readyCount: number;
    criticalPathDays: number;
  };
  cycleBreaks: CycleBreak[];
}

export interface IssueContext {
  issue: Issue;
  blockers: Array<{ number: number; title: string; state: string; edge: Edge }>;
  dependents: Array<{ number: number; title: string; state: string; edge: Edge }>;
  schedule: ScheduleEntry | null;
}

/* ──────────────────────────── LLM extraction schema ───────────────────────── */

/**
 * What the model is asked to return. Ox Alpha does NOT enforce JSON schemas,
 * so this is the real gate — always `safeParse`, never `parse`.
 */
export const ExtractionResult = z.object({
  edges: z.array(z.object({
    blocked: z.number().int(),
    blockedBy: z.number().int(),
    type: DependencyType,
    confidence: z.number().min(0).max(1),
    rationale: z.string().max(400),
    evidence: Evidence,
  })),
  estimates: z.array(z.object({
    issue: z.number().int(),
    effort_days: z.number(),
  })).default([]),
  notes: z.string().default(''),
});
export type ExtractionResult = z.infer<typeof ExtractionResult>;

export const edgeKey = (blocked: number, blockedBy: number) => `${blocked}<-${blockedBy}`;
