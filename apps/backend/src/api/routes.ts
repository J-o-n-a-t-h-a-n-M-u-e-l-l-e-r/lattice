import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { runPipeline } from '../infer/run.js';
import * as store from '../store/index.js';
import { buildGraphPayload, buildIssueContext } from './graph.js';
import { defaultRepo } from '../config.js';

export function apiRoutes() {
  const app = new Hono();
  app.use('*', cors());

  // Bearer auth. The web app holds this token and nothing else - no database
  // URL, no GitHub token, no model key.
  app.use('*', async (c, next) => {
    const expected = process.env.LATTICE_API_TOKEN;
    if (expected) {
      const got = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
      if (got !== expected) return c.json({ error: 'unauthorized' }, 401);
    }
    await next();
  });

  const repoOf = (c: any) => c.req.query('repo') ?? defaultRepo();

  app.get('/graph', async (c) => {
    const repo = repoOf(c);
    const payload = await buildGraphPayload(repo);
    if (!payload) {
      return c.json({ error: 'not_analysed', detail: `No run yet for ${repo}.`, repo }, 404);
    }
    if (payload.runId) c.header('ETag', `"${payload.runId}"`);
    return c.json(payload);
  });

  app.get('/runs', async (c) => {
    const limit = Number(c.req.query('limit') ?? '20');
    return c.json(await store.listRuns(repoOf(c), limit));
  });

  app.get('/runs/:id', async (c) => {
    const detail = await store.getRunDetail(c.req.param('id'));
    if (!detail) return c.json({ error: 'not_found' }, 404);
    return c.json(detail);
  });

  app.get('/issues/:number', async (c) => {
    const ctx = await buildIssueContext(repoOf(c), Number(c.req.param('number')));
    if (!ctx) return c.json({ error: 'not_found' }, 404);
    return c.json(ctx);
  });

  app.get('/edges/:blocked/:blockedBy', async (c) => {
    const edge = await store.getEdge(
      repoOf(c), Number(c.req.param('blocked')), Number(c.req.param('blockedBy')));
    if (!edge) return c.json({ error: 'not_found' }, 404);
    return c.json(edge);
  });

  // Human nudges: correction after the fact, never a gate in front.
  app.post('/edges/:blocked/:blockedBy/:flag', async (c) => {
    const flag = c.req.param('flag');
    if (flag !== 'pin' && flag !== 'suppress') return c.json({ error: 'bad_flag' }, 400);
    const body = await c.req.json().catch(() => ({ value: true }));
    await store.setEdgeFlag(
      repoOf(c), Number(c.req.param('blocked')), Number(c.req.param('blockedBy')),
      flag === 'pin' ? 'pinned' : 'suppressed', body.value !== false);
    return c.json({ ok: true });
  });

  app.get('/repos', async (c) => c.json(await store.listRepos()));

  /**
   * Starts a run and returns immediately. A full analysis takes minutes, so
   * blocking here would just time out - the client polls GET /runs/:id.
   */
  app.post('/runs', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const repo = normaliseRepo(body.repo ?? defaultRepo());
    if (!repo) return c.json({ error: 'bad_repo', detail: 'Expected owner/name or a GitHub URL.' }, 400);

    const inFlight = await store.runningRun(repo);
    if (inFlight) return c.json({ runId: inFlight, repo, status: 'running', existing: true }, 202);

    const runId = await store.startRun(repo, 'manual', '(starting)', 0);
    void runPipeline({ repo, trigger: 'manual', existingRunId: runId })
      .catch((err) => console.error(`[lattice] run failed for ${repo}:`, err.message));
    return c.json({ runId, repo, status: 'running' }, 202);
  });

  app.post('/webhook', async (c) => {
    const event = c.req.header('x-github-event');
    if (event !== 'issues') return c.json({ ok: true, skipped: event }, 202);
    const body = await c.req.json().catch(() => ({}));
    const repo = body?.repository?.full_name ?? defaultRepo();
    scheduleDebounced(repo);
    return c.json({ ok: true, queued: repo }, 202);
  });

  app.get('/health', async (c) => c.json({ ok: true, repo: defaultRepo() }));

  return app;
}

/**
 * Debounce so an editing spree is one run, not five. The free-model quota is
 * 50 requests a day; five runs for one burst of edits is how you lose it.
 */
/** Accepts "owner/name", a github.com URL, or a git remote. */
export function normaliseRepo(input: string): string | null {
  const s = String(input ?? '').trim().replace(/\.git$/, '');
  if (!s) return null;
  const url = /github\.com[/:]([^/]+)\/([^/?#]+)/i.exec(s);
  if (url) return `${url[1]}/${url[2]}`;
  const plain = /^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/.exec(s);
  return plain ? `${plain[1]}/${plain[2]}` : null;
}

const pending = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_MS = Number(process.env.LATTICE_DEBOUNCE_MS ?? '60000');

export function scheduleDebounced(repo: string) {
  clearTimeout(pending.get(repo));
  pending.set(repo, setTimeout(() => {
    pending.delete(repo);
    runPipeline({ repo, trigger: 'webhook' }).catch((err) => {
      console.error(`[lattice] webhook run failed for ${repo}:`, err.message);
    });
  }, DEBOUNCE_MS));
}
