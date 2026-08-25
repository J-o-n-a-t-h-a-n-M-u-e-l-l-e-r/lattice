import { runPipeline } from '../infer/run.js';
import { defaultRepo } from '../config.js';

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const repo = value('repo') ?? defaultRepo();
const clusterSize = value('cluster-size');

console.log(`\n  lattice · analysing ${repo}\n`);
const started = Date.now();

try {
  const result = await runPipeline({
    repo,
    trigger: 'manual',
    cached: flag('cached'),
    clusterSize: clusterSize === undefined ? undefined : Number(clusterSize),
    onProgress: (line) => console.log(`  ${line}`),
  });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n  run ${result.runId} · ${result.status} · ${secs}s\n`);
  process.exit(0);
} catch (err) {
  console.error(`\n  failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
}
