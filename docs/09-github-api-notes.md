# 09 · GitHub API notes

Verified facts and the gotchas that will silently produce wrong behaviour. **Read this before touching any GitHub call.**

---

## Issue dependencies (GA)

API version header: `X-GitHub-Api-Version: 2026-03-10`

> ### We only ever GET these
>
> **Lattice does not write to GitHub.** The `POST` and `DELETE` endpoints below are documented for completeness and because it is useful to know what we deliberately don't do -- but no code in this repo calls them. GitHub is a data source; the graph lives in the store.

| Method | Path | Used |
|---|---|---|
| `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by` | Yes, every run |
| `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking` | Yes |
| `POST` | `.../dependencies/blocked_by` | Never |
| `DELETE` | `.../dependencies/blocked_by/{issue_id}` | Never |

### Reading dependencies

`GET .../blocked_by` per issue, batched at concurrency 5. Results become `given` edges: confidence 1.0, immutable, and the model may not contradict them. This is also the mechanism by which a human overrules Lattice -- edit `blocked_by` on GitHub and the next run treats it as fact.

Reads are subject to the ordinary hourly rate limit, which is generous. The secondary rate limit that makes write endpoints awkward does not apply because Lattice does not write.

### Still fetch `databaseId`

Even though we never POST, fetch `databaseId` alongside `number` during ingest -- it's the stable identifier across renames and re-numbering, and it costs nothing to select in the GraphQL query we already run. `number` is what humans see; `databaseId` is what identifies the row.

---

## Sub-issues

GraphQL, with header `GraphQL-Features: sub_issues`. Gives `parent` and `subIssues` on an issue.

Read-only, like everything else. Hierarchy is kept distinct from `blocked_by` in the store -- they are different relations.

---

## Local environment notes

- **`gh` on the dev machine is 2.88.1.** Native dependency flags landed in **2.94.0**. The application uses Octokit for GitHub reads.
- The local token lacks `read:project` / `project` scope. Needed only if we ever write Projects v2 fields (`gh auth refresh -s read:project,project`).

---

## Sources

- [Dependencies on issues -- GitHub Changelog](https://github.blog/changelog/2025-08-21-dependencies-on-issues/)
- [REST: issue dependencies](https://docs.github.com/en/rest/issues/issue-dependencies?apiVersion=2026-03-10)
- [Manage sub-issues, types and dependencies from GitHub CLI](https://github.blog/changelog/2026-06-10-manage-sub-issues-types-and-dependencies-from-github-cli/)
