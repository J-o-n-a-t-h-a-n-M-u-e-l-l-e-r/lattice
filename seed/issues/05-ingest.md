# [G] GraphQL bulk issue ingest
<!-- labels: lane:github-io,size:M -->
**What**

`src/lib/github/fetch.ts` — one paginated GraphQL query, 50 issues per page, capturing per issue: `number`, `id` (node id), **`databaseId`**, `title`, `body`, `labels`, `milestone`, `assignees`, `state`, and `timelineItems` filtered to `CROSS_REFERENCED_EVENT` and `CONNECTED_EVENT`.

Cache the result to `.lattice/raw.json` behind a `--cached` flag.

**Why it matters**

Everything downstream starts here. Two things will bite whoever writes this:

- **Fetch `databaseId` now.** The dependency write endpoint takes the integer database id, not the `#number`. Discovering this later means N extra API calls or a subtle bug where every write silently targets the wrong issue.
- **Never demo off a cold fetch.** The cache flag isn't an optimisation, it's demo insurance.

Read `docs/09-github-api-notes.md` before starting.

**Scope**

- `src/lib/github/fetch.ts`

**Done when**

- [ ] Paginates past 50 issues correctly
- [ ] Both `number` and `databaseId` are present on every node
- [ ] `--cached` reads from `.lattice/raw.json` without touching the network
- [ ] Bodies are preserved in full (truncation happens later, in the inference layer)

**Depends on:** the shared types contract in #1 for the `Issue` shape.
