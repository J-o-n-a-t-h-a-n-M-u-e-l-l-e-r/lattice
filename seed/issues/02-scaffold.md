# [F] Scaffold the Next.js app and toolchain
<!-- labels: lane:foundation,size:S -->
**What**

`create-next-app` with TypeScript, Tailwind, and the App Router. Add `tsx` for running scripts, `vitest` for the graph unit tests, and strict TypeScript settings. Set up the directory skeleton from `docs/01-architecture.md#layout` so nobody has to guess where their files go.

Add npm scripts: `dev`, `build`, `analyze` (runs `scripts/analyze.ts`), `apply`, `agent`, `test`.

**Why it matters**

Four workstreams can't start until there is a project to put code in. This should be the fastest issue in the repo — do it in the first hour, in parallel with the types contract, and don't gold-plate it.

**Scope**

- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `vitest.config.ts`
- Empty directory skeleton with `.gitkeep` files

**Done when**

- [ ] `npm run dev` serves a page
- [ ] `npm test` runs (zero tests is fine)
- [ ] `npx tsx scripts/analyze.ts` executes a stub without crashing
- [ ] `.env.example` values are read at entrypoints only

**Depends on:** nothing, but the directory skeleton should match the layout the types contract in #1 assumes.
