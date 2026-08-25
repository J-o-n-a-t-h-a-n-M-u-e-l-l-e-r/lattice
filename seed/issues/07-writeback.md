# [G] Idempotent, rate-limited `blocked_by` write-back
<!-- labels: lane:github-io,size:M -->
**What**

`src/lib/github/write.ts` — take approved edges and POST them to `/repos/{o}/{r}/issues/{n}/dependencies/blocked_by` with header `X-GitHub-Api-Version: 2026-03-10`.

The full shape is in `docs/09-github-api-notes.md#write-path-shape`. Follow it.

**Why it matters**

This is the money shot of the demo — the moment GitHub itself becomes the source of truth and the project stops being a side database. It is also the single most failure-prone call in the repo:

- The body is `{ "issue_id": <databaseId> }`. **Not the `#number`.**
- The endpoint has a *secondary* rate limit, invisible in `X-RateLimit-Remaining`. Space writes ~1.2s apart and back off on 403/429. Bursting 30 edges during a live demo is exactly how this fails on stage.
- A 422 usually means GitHub detected a cycle against edges already in the repo. Record it as `github_rejected_maybe_cycle` and **continue the batch** — do not crash.
- Always GET existing dependencies and diff first.

**Scope**

- `src/lib/github/write.ts`

**Done when**

- [ ] Running it twice creates no duplicate edges
- [ ] 403/429 backs off and retries rather than failing the run
- [ ] 422 is recorded and the batch continues
- [ ] Uses `databaseId`, verified against a real issue

**Depends on:** the shared types contract in #1, and the existing-dependency read in #6 for the diff.
