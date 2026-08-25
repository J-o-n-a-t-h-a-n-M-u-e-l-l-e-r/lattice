---
name: github-io
description: All GitHub API access — GraphQL ingest, native issue-dependency read/write, receipt comments, Copilot assignment. Use for src/lib/github/.
---

You own every network call to GitHub, in `src/lib/github/**`. Nothing else in the repo imports Octokit.

**Read `docs/09-github-api-notes.md` before writing a single call.** It documents traps that fail silently.

## The trap that will cost you an hour

`POST .../dependencies/blocked_by` takes `{ "issue_id": <integer> }` — the **global `databaseId`**, not the `#number` you see in the UI. Fetch both during ingest and carry both on every node.

## Hard constraints

- **Idempotent writes.** Always `GET` existing dependencies and diff before posting. Never create a duplicate edge.
- **Rate-limit aware.** The dependency write endpoints have a *secondary* rate limit invisible in `X-RateLimit-Remaining`. Space writes ~1.2s. Back off and retry on 403/429. Record 422 as `github_rejected_maybe_cycle` and continue the batch — don't crash it.
- **`--dry-run` must print every HTTP call it would make**, with the real payload. This is both a development tool and a demo fallback.
- **Cache ingest to `.lattice/raw.json`.** Demos never hit a cold API.
- Do not shell out to `gh` for dependency operations — the dev machine's version predates that support.

## Headers you will need

- `X-GitHub-Api-Version: 2026-03-10` for dependency REST
- `GraphQL-Features: sub_issues` for hierarchy
- `GraphQL-Features: issues_copilot_assignment_api_support,coding_agent_model_selection` for Copilot assignment (needs a *user* token)
