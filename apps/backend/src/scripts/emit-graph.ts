import { mkdir, writeFile } from 'node:fs/promises';
import { buildGraphPayload } from '../api/graph.js';
import { defaultRepo } from '../config.js';
import * as store from '../store/index.js';

/**
 * Machine-readable graph output, written by `npm test`.
 *
 * This makes the schedule diffable: change the cycle-breaking weights and the
 * critical-path shift shows up as a reviewable diff rather than a vague feeling
 * that the graph looks different. It is also the cheapest integration test we
 * have - if this comes out well-formed and acyclic, the whole pure core is
 * wired up correctly.
 */
const repo = process.argv.includes('--repo')
  ? process.argv[process.argv.indexOf('--repo') + 1]!
  : defaultRepo();

const payload = await buildGraphPayload(repo);
await mkdir('artifacts', { recursive: true });

if (!payload) {
  console.log(`  no analysis for ${repo} yet - run 'npm run analyze' first`);
  await writeFile('artifacts/graph.json', JSON.stringify({ repo, nodes: [], edges: [] }, null, 2));
  process.exit(0);
}

await writeFile('artifacts/graph.json', JSON.stringify(payload, null, 2));
await writeFile('artifacts/schedule.json', JSON.stringify({
  repo: payload.repo,
  runId: payload.runId,
  criticalPath: payload.criticalPath,
  criticalPathDays: payload.stats.criticalPathDays,
  waves: Object.fromEntries(
    [...new Set(payload.nodes.map((n) => n.wave))].sort((a, b) => a - b).map((w) => [
      `wave_${w}`,
      payload.nodes.filter((n) => n.wave === w).map((n) => ({
        number: n.number, title: n.title, blastRadius: n.blastRadius,
        onCriticalPath: n.onCriticalPath, reason: n.reason,
      })),
    ]),
  ),
}, null, 2));

const runs = await store.listRuns(repo, 1);
console.log(`  artifacts/graph.json    ${payload.nodes.length} nodes, ${payload.edges.length} edges`);
console.log(`  artifacts/schedule.json ${payload.stats.waves} waves, ` +
            `critical path ${payload.criticalPath.length} issues / ${payload.stats.criticalPathDays}d`);
if (runs[0]) console.log(`  latest run: ${runs[0].status}, ${runs[0].requests} request(s)`);
process.exit(0);
