import { defaultRepo } from '../config.js';
import * as tools from '../mcp/tools.js';

/**
 * A local agent that drives the same loop Copilot does: claim, read the
 * briefing, report progress, see what it unblocked.
 *
 * Two jobs. It is how the lease logic gets tested under concurrency (run it
 * with --agents 3), and it is the demo fallback when Copilot is queued -
 * same tools, three seconds, no seat required.
 */
const args = process.argv.slice(2);
const value = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const repo = value('repo') ?? defaultRepo();
const count = Number(value('agents') ?? '1');
const dryRun = !args.includes('--complete');

async function runAgent(name: string): Promise<number | null> {
  const claim = await tools.claimNextIssue(repo, name, 5);
  if (!claim.claimed) {
    console.log(`  ${name}: nothing to claim (${'reason' in claim ? claim.reason : ''})`);
    return null;
  }
  const issue = claim.issue!;
  console.log(`\n  ${name} claimed #${issue.number} — ${issue.title}`);
  console.log(`  ${'─'.repeat(70)}`);
  for (const line of claim.briefing!.split('\n')) console.log(`  │ ${line}`);
  console.log(`  ${'─'.repeat(70)}`);

  if (dryRun) {
    // Deliberately HOLD the lease. Releasing here would let the next agent
    // claim the same issue and the concurrency test would prove nothing.
    console.log(`  ${name}: holding the lease (pass --complete to close the issue instead)`);
    return issue.number;
  }

  const done = await tools.reportProgress(repo, name, issue.number, 'done');
  const delta = done.graph_delta;
  console.log(`  ${name}: done. newly ready → ${delta.newly_ready.map((n) => `#${n}`).join(', ') || 'nothing'}`);
  console.log(`  remaining critical path: ${delta.remaining_days}d`);
  return issue.number;
}

console.log(`\n  lattice · ${count} agent(s) against ${repo}`);
const claimed = await Promise.all(
  Array.from({ length: count }, (_, i) => runAgent(`agent-${String.fromCharCode(97 + i)}`)));

const numbers = claimed.filter((n): n is number => n !== null);
if (numbers.length !== new Set(numbers).size) {
  console.error(`\n  FAIL: two agents claimed the same issue (${numbers.join(', ')})\n`);
  process.exit(1);
}
if (numbers.length > 1) {
  console.log(`\n  ${numbers.length} agents, ${new Set(numbers).size} distinct issues — leases are atomic.`);
}
if (dryRun) {
  for (const n of numbers) await tools.reportProgress(repo, 'cleanup', n, 'abandoned');
  console.log(`  released ${numbers.length} lease(s).`);
}
console.log();
process.exit(0);
