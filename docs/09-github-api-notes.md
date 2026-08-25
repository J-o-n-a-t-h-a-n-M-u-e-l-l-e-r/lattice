# 09 · GitHub API notes

Verified facts and the gotchas that will silently produce wrong behaviour. **Read this before touching any GitHub call.**

---

## Issue dependencies (GA)

API version header: `X-GitHub-Api-Version: 2026-03-10`

| Method | Path |
|---|---|
| `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by` |
| `GET` | `/repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking` |
| `POST` | `/repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by` |
| `DELETE` | `/repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by/{issue_id}` |

### ⚠️ The gotcha that will cost you an hour

`POST` body is `{ "issue_id": <integer> }` — and that is the **global database ID**, *not* the `#number` you see in the UI.

```
❌ { "issue_id": 12 }            // the #number. Silently wrong or 404.
✅ { "issue_id": 3847261953 }    // databaseId from the GraphQL ingest
```

Fetch `databaseId` alongside `number` during L0 ingest and carry both on every node. Conflating them is the single most likely silent bug in the write path.

### Rate limiting

POST and DELETE here are subject to **secondary** rate limiting — the "creating content too quickly" kind, which is not the same as your hourly quota and is not visible in `X-RateLimit-Remaining`.

Space writes ~1.2s apart. On 403/429, back off and retry. Do not burst 30 edges during a live demo.

### Write path shape

```ts
const existing = await getBlockedBy(number);          // diff first — never duplicate
const toAdd = approved.filter(e => !existing.has(e.blockedByDatabaseId));

for (const e of toAdd) {
  await sleep(1200);
  try {
    await octokit.request(
      'POST /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by',
      { ...ctx, issue_number: e.blocked,
        issue_id: e.blockedByDatabaseId,
        headers: { 'X-GitHub-Api-Version': '2026-03-10' } });
    await postReceiptComment(e);
  } catch (err) {
    if (err.status === 403 || err.status === 429) { await backoff(err); retry(); }
    else if (err.status === 422) record(e, 'github_rejected_maybe_cycle');
    else throw err;
  }
}
```

Idempotent (diffs first) and rate-limit aware. Plus a `--dry-run` that prints every HTTP call it *would* make.

**422 usually means GitHub detected a cycle** against edges already in the repo. Record it and route to the review UI — don't crash the batch.

---

## Sub-issues

GraphQL, with header `GraphQL-Features: sub_issues`. Gives `parent` and `subIssues` on an issue.

We **read** these but never write hierarchy into `blocked_by` — GitHub already models it. See `writeBack: false` in [`02-inference-pipeline.md`](02-inference-pipeline.md).

---

## Copilot coding agent assignment

Header: `GraphQL-Features: issues_copilot_assignment_api_support,coding_agent_model_selection`

**Find the bot:**

```graphql
query {
  repository(owner: "OWNER", name: "REPO") {
    suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 100) {
      nodes { login __typename ... on Bot { id } ... on User { id } }
    }
  }
}
```

Look for login `copilot-swe-agent`. Cache the ID.

**Assign:**

```graphql
mutation {
  replaceActorsForAssignable(input: {
    assignableId: "ISSUE_NODE_ID",
    actorIds: ["BOT_ID"],
    agentAssignment: {
      targetRepositoryId: "REPO_NODE_ID",
      baseRef: "main",
      customInstructions: "...",
      customAgent: "",
      model: ""
    }
  }) { assignable { ... on Issue { id title } } }
}
```

Requires a **user token** — PAT or GitHub App user-to-server. An installation token won't do. Fine-grained PAT needs read+write on actions, contents, issues, pull requests; classic needs `repo`.

Concurrency limits are **not documented**. Assume they exist; don't dispatch fifteen at once during a demo.

---

## MCP server configuration for Copilot

Repo **Settings → Copilot → MCP servers**. JSON shape:

```json
{ "mcpServers": { "NAME": {
  "type": "local" | "stdio" | "http" | "sse",
  "command": "...", "args": [], "env": {},      // local only
  "url": "...", "headers": {},                  // remote only
  "tools": ["..."]                              // REQUIRED
} } }
```

Constraints:

- **Tools only.** Resources and prompts from the MCP server are ignored by Copilot cloud agent and Copilot code review.
- **No OAuth** for remote servers. Static bearer token.
- **Secret names must start with `COPILOT_MCP_`**, referenced as `$COPILOT_MCP_FOO` or `${COPILOT_MCP_FOO}`.
- The `tools` allowlist is required. An omitted tool is invisible to the agent.

Also enabled by default alongside yours: the GitHub MCP server and the Playwright MCP server.

---

## Local environment notes

- **`gh` on the dev machine is 2.88.1.** Native dependency flags landed in **2.94.0**. Do **not** put `gh` on the critical path for dependency writes — use Octokit REST directly, which you want anyway for retry and rate-limit control.

  `gh` stays the right tool for the one thing it's great at: bulk-creating the seed issues.
- The local token lacks `read:project` / `project` scope. Needed only if we ever write Projects v2 fields (`gh auth refresh -s read:project,project`).

---

## Sources

- [Dependencies on issues — GitHub Changelog](https://github.blog/changelog/2025-08-21-dependencies-on-issues/)
- [REST: issue dependencies](https://docs.github.com/en/rest/issues/issue-dependencies?apiVersion=2026-03-10)
- [Manage sub-issues, types and dependencies from GitHub CLI](https://github.blog/changelog/2026-06-10-manage-sub-issues-types-and-dependencies-from-github-cli/)
- [Using Copilot cloud agent via the API](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-via-the-api)
- [Configure MCP servers for Copilot coding agent](https://docs.github.com/copilot/how-tos/agents/copilot-coding-agent/extending-copilot-coding-agent-with-mcp)
