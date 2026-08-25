# [F] Define the shared types contract
<!-- labels: lane:foundation,size:S -->
**What**

Create `src/lib/types.ts` with the data contract every workstream codes against: `Issue`, `EdgeCandidate`, `SourceLayer`, `DependencyType`, `CycleBreak`, `Analysis` (the shape of `.lattice/analysis.json`), `Schedule`, and `Lease`.

The canonical definitions are in `docs/01-architecture.md#data-contract`. Copy them, don't reinvent them.

**Why it matters**

Five people are about to write code in parallel against these shapes. Every other issue in this repo assumes this file exists — the inference layers emit `EdgeCandidate`, the graph layer consumes it, the UI renders it, the MCP server serializes it. Getting the shape wrong here costs everyone an afternoon.

Two details that are easy to get wrong and expensive to fix later:

- `Issue` must carry **both** `number` and `databaseId`. The GitHub dependency write endpoint needs the integer database id, not the `#number`. Conflating them is the most likely silent bug in the whole project.
- `EdgeCandidate.evidence` is not optional in practice. Anything that drops it turns the human review gate into theatre.

**Scope**

- `src/lib/types.ts`

**Done when**

- [ ] Every type in `docs/01-architecture.md#data-contract` is present and exported
- [ ] `Issue` carries `number`, `databaseId`, `nodeId`, `title`, `body`, `labels`, `milestone`, `state`
- [ ] Strict mode compiles clean

**Depends on:** nothing. This is the first thing we write, together, before anyone moves into their lane. Changes to this file after hour one must be announced to the whole team — they invalidate four other people's assumptions.
