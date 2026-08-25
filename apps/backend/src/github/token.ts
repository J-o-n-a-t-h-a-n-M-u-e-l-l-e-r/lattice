import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

/**
 * Resolve the GitHub token lazily rather than once at boot.
 *
 * Reading it at startup meant a long-running server kept holding a token that
 * had since expired or been revoked, and re-authenticating the gh CLI had no
 * effect until you restarted the process. Now a 401 drops the cache and the
 * next call picks up whatever `gh auth login` just wrote.
 */
let cached: { token: string; at: number } | null = null;
const TTL_MS = 60_000;

export async function getToken(): Promise<string> {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.token;

  try {
    const { stdout } = await run('gh', ['auth', 'token']);
    const token = stdout.trim();
    if (!token) throw new Error('empty');
    cached = { token, at: Date.now() };
    return token;
  } catch {
    throw new Error(
      'No GitHub token. Set GITHUB_TOKEN, or run `gh auth login`. '
      + 'GitHub requires authentication even for public repositories.');
  }
}

/** Called on a 401 so the next attempt re-reads from the keyring. */
export function invalidateToken(): void {
  cached = null;
  delete process.env.GITHUB_TOKEN;
}
