# 13 · Use Lattice from a GitHub Copilot App repository

This guide connects a separate repository in the GitHub Copilot App to a
running Lattice instance. Copilot then has the scheduling tools alongside the
repository's normal coding tools.

## Before you start

You need:

1. A Lattice instance with a completed analysis for the repository whose issues
   you want to schedule.
2. An MCP URL that the Copilot App can reach:

   ```text
   https://lattice.example.com/mcp
   ```

   For local work on the same machine, use `http://localhost:3001/mcp`.
3. A value for `LATTICE_MCP_TOKEN` on the Lattice server. This enables bearer
   authentication for `/mcp`.

Do not put the token in Git, issue text, or `.github/github-app.yml`.

## 1. Configure the MCP server in the Copilot App

In the GitHub Copilot App, open **Settings** → **MCP Servers** and add a custom
server with these values:

| Field | Value |
|---|---|
| Name | `lattice` |
| Type | `HTTP` |
| URL | `https://lattice.example.com/mcp` |
| HTTP headers | `{"Authorization":"Bearer <your LATTICE_MCP_TOKEN>"}` |
| Tools | Select all Lattice tools |

The Copilot App automatically makes configured MCP servers available in its
repositories. Confirm that the `lattice` server reports the seven tools before
starting work.

For Copilot CLI on the same machine, the equivalent setup is:

```bash
export LATTICE_MCP_TOKEN='replace-with-a-secret'

copilot mcp add --transport http \
  --header "Authorization: Bearer $LATTICE_MCP_TOKEN" \
  --tools '*' \
  lattice https://lattice.example.com/mcp
```

Use `copilot mcp show lattice` to confirm the connection.

## 2. Add instructions to the separate repository

Create `.github/github-app.yml` in the repository where you will use Copilot.
This file guides the agent; it does not store the MCP server or its token.

```yaml
instructions: |
  Use the Lattice MCP server before starting issue work.

  1. Call get_issue_context for the assigned issue.
  2. If no issue is assigned, call claim_next_issue with a stable agent_id.
  3. Stay within the issue scope and preserve interfaces required by dependents.
  4. Call report_progress with status "started" before implementation.
  5. Call report_progress with status "pr_opened" after opening a pull request.
  6. If an unrecorded issue blocks the work, call report_dependency with
     verbatim evidence from the relevant issue instead of working around it.
```

When the Copilot App asks you to trust this repository configuration, review
and accept it. The app does not apply changed repository configuration until
you do.

## 3. Start an agent session

Ask Copilot for one of these actions:

```text
Use Lattice to find work I can start now in repo "owner/repository".
```

```text
Use Lattice to get the context for issue #123 before making changes.
```

```text
Use Lattice to report that issue #123 is blocked by #45. The evidence is:
"..."
```

If the Lattice instance schedules a different repository from the one open in
the Copilot App, tell Copilot the target explicitly:

```text
Use the Lattice tools with repo "owner/scheduled-repo".
```

## Typical agent flow

1. `claim_next_issue` atomically leases a ready issue and returns a briefing.
2. `get_issue_context` explains its blockers and dependents.
3. The agent implements the issue in the open repository.
4. `report_progress` records `started`, `pr_opened`, `blocked`, or `done` and
   returns what became ready.
5. `report_dependency` adds a validated, evidence-backed blocker when the
   schedule is missing one.

`done` closes the issue only in Lattice's local store so it can recalculate the
schedule. It never closes or edits the GitHub issue.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Copilot cannot connect | Verify the URL ends in `/mcp`, is reachable from the App, and uses HTTPS outside local development. |
| `unauthorized` | The `Authorization` header must be `Bearer <LATTICE_MCP_TOKEN>`, matching the Lattice server's environment. |
| `not_analysed` | The tool has no stored graph for that `owner/repo`; run an analysis first, then call the tool with the explicit `repo` argument. |
| No work is available | All ready issues may be leased; retry later or call `list_ready_work` with `exclude_claimed: false`. |
| The tools are missing | Check the Copilot App's MCP Servers settings and confirm the `lattice` server is enabled. |
