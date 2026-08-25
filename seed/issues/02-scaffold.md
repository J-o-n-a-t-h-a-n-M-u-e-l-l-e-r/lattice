# [F] Scaffold the monorepo and toolchain
<!-- labels: lane:foundation,size:S -->
**What**

An npm-workspaces monorepo with three packages, per `docs/01-architecture.md#layout`:

- `packages/types` — the shared contract, imported by both services
- `apps/backend` — plain Node service: pipeline, store, REST API, MCP
- `apps/web` — Next.js app with Tailwind, the interactive graph

Strict TypeScript, `tsx` for scripts, `vitest` for tests. Root scripts `dev`, `build`, `test` (see #54).

**Why it matters**

Four workstreams can't start until there is a project to put code in. This should be the fastest issue in the repo — do it in the first hour, in parallel with the types contract, and don't gold-plate it.

The workspace split matters from the start: `apps/web` must never be able to import the store or Octokit. Getting that boundary right in hour one is free; retrofitting it later is not.

**Scope**

- Root `package.json` with workspaces, shared `tsconfig` base
- Per-package `package.json`, `next.config.ts`, `tailwind.config.ts`, `vitest.config.ts`
- Directory skeleton with `.gitkeep` files

**Done when**

- [ ] `npm run dev` starts both services
- [ ] `npm test` runs across workspaces (zero tests is fine)
- [ ] `packages/types` imports cleanly from both apps
- [ ] `.env.example` values are read at entrypoints only, and `apps/web` needs only the API URL and token

**Depends on:** nothing. The build and test scripts themselves are #54.
