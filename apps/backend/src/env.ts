import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

/**
 * Load .env from the repo root, so running from anywhere in the workspace
 * behaves the same. Imported for its side effect, first thing, by every
 * entrypoint - nothing else in the codebase reads a dotfile.
 */
let dir = dirname(fileURLToPath(import.meta.url));
for (let i = 0; i < 6; i++) {
  const candidate = resolve(dir, '.env');
  if (existsSync(candidate)) { config({ path: candidate }); break; }
  dir = resolve(dir, '..');
}

// Convenience: fall back to the gh CLI's token so a local run needs no setup.
if (!process.env.GITHUB_TOKEN) {
  try {
    const { execSync } = await import('node:child_process');
    const token = execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
    if (token) process.env.GITHUB_TOKEN = token;
  } catch { /* gh not installed or not logged in - that's fine */ }
}
