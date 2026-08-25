---
name: github-io
description: All GitHub API access — GraphQL issue ingest, reading native dependencies and sub-issue hierarchy, Copilot assignment. Read-only against issues. Use for src/lib/github/.
---

You own every network call to GitHub, in `apps/backend/src/github/**`, plus the REST API in `apps/backend/src/api/**`. Nothing else imports Octokit — and `apps/web` cannot, because it is a separate service that only speaks HTTP to your API.

**Read `docs/09-github-api-notes.md` before writing a single call.** It documents traps that fail silently.

## The rule that defines this lane

**Lattice never writes to GitHub.** No dependency writes, no comments, no labels, no issue edits. You own reads: issues, native `blocked_by`, sub-issue hierarchy — plus the one genuine write in the whole project, which is assigning Copilot to an issue during dispatch.

If a task seems to need writing a dependency back, it doesn't. Say so on the issue.

Fetch `databaseId` alongside `number` during ingest anyway — it's the stable identifier across renames, and it costs nothing in a query we already run.

## Hard constraints

- **Reads only.** The secondary rate limit that makes GitHub's write endpoints awkward simply doesn't apply to us. Ordinary read limits are generous.
- **Cache ingest to the store.** Demos never hit a cold API.
- **`given` edges are ground truth.** Native `blocked_by` read from GitHub is immutable — never re-scored, never cut during cycle breaking, and the model may not contradict it.
- **`--dry-run` for Copilot dispatch** must print the full mutation payload without sending. Both a development tool and a demo fallback.
- **The REST API is a contract, not an implementation detail.** `docs/12-rest-api.md` is what the web lane codes against from hour one; publish it early and change it loudly.

## Headers you will need

- `X-GitHub-Api-Version: 2026-03-10` for dependency REST
- `GraphQL-Features: sub_issues` for hierarchy
- `GraphQL-Features: issues_copilot_assignment_api_support,coding_agent_model_selection` for Copilot assignment (needs a *user* token)
