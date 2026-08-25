import '../env.js';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { Edge, GraphPayload, Issue } from '@lattice/types';
import { computeSchedule } from '../graph/schedule.js';
import * as store from '../store/index.js';

/**
 * Load a graph from an `artifacts/graph.json` snapshot into the store.
 *
 * Written because a hard kill corrupted the embedded database and re-running
 * the pipeline would have cost another model request and ten minutes. It earns
 * its place beyond that: it seeds a fresh environment, moves a graph between
 * machines, and backs DEMO_MODE without needing any credentials.
 */
const file = process.argv[2] ?? 'artifacts/graph.json';
const payload: GraphPayload = JSON.parse(await readFile(file, 'utf8'));
const repo = payload.repo;

const issues: Issue[] = payload.nodes.map((n) => ({
  number: n.number,
  // The snapshot is the rendered view, so it has no databaseId or body. Neither
  // is needed to render or schedule; the next real run refills them.
  databaseId: n.number,
  nodeId: `imported-${n.number}`,
  title: n.title,
  body: '',
  labels: n.labels,
  milestone: n.milestone,
  state: n.state,
  htmlUrl: n.htmlUrl,
  effortDays: n.effortDays,
}));

const edges: Edge[] = payload.edges;
const runId = payload.runId ?? randomUUID();

await store.startRun(repo, 'manual', '(imported)', 0).then((id) =>
  store.finishRun(id, {
    status: 'ok',
    edgesProposed: edges.length,
    edgesKept: edges.length,
    edgesBlocking: edges.filter((e) => e.blocking).length,
    rejectionCounts: {},
  }));

await store.saveIssues(repo, issues);
await store.replaceGraph(repo, edges, runId);
await store.saveSchedule(repo, computeSchedule(issues, edges), runId);

console.log(`  imported ${issues.length} issues and ${edges.length} edges for ${repo}`);
process.exit(0);
