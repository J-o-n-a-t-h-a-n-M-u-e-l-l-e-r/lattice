import './env.js';
import { createServer } from 'node:http';
import { getRequestListener } from '@hono/node-server';
import { Hono } from 'hono';
import { apiRoutes } from './api/routes.js';
import { handleMcpRequest } from './mcp/server.js';
import { getDb } from './store/db.js';
import { defaultRepo } from './config.js';

const PORT = Number(process.env.PORT ?? '3001');

const app = new Hono();
app.route('/api', apiRoutes());
app.get('/', (c) => c.json({ name: 'lattice-backend', repo: defaultRepo(), mcp: '/mcp' }));

const honoListener = getRequestListener(app.fetch);

const server = createServer(async (req, res) => {
  // MCP needs the raw Node req/res, so it bypasses Hono entirely.
  if (req.url?.startsWith('/mcp')) {
    const expected = process.env.LATTICE_MCP_TOKEN;
    if (expected) {
      const got = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
      if (got !== expected) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'unauthorized' }));
        return;
      }
    }
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const text = Buffer.concat(chunks).toString('utf8');
    try {
      await handleMcpRequest(req, res, text ? JSON.parse(text) : undefined);
    } catch (err) {
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    }
    return;
  }
  await honoListener(req, res);
});

await getDb();
server.listen(PORT, () => {
  console.log(`[lattice] backend on http://localhost:${PORT}`);
  console.log(`[lattice]   REST  /api/graph?repo=${defaultRepo()}`);
  console.log(`[lattice]   MCP   /mcp`);
});

/**
 * Close the database before exiting. PGlite writes to a real Postgres data
 * directory, and a hard kill mid-write corrupts it - which is exactly how the
 * store was lost once already. SIGKILL still cannot be caught, so `npm run
 * import` exists as the recovery path.
 */
let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    if (closing) return;
    closing = true;
    console.log(`\n[lattice] ${signal} - closing database...`);
    server.close();
    try {
      const { getDb } = await import('./store/db.js');
      await (await getDb()).close();
    } catch { /* nothing to close */ }
    process.exit(0);
  });
}