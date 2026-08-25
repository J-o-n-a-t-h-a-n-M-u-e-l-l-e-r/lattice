# 00 · Context

## The challenge

Microsoft Hackathon 2026 — *"Collaboration using GitHub Planning & Tracking Tools in the Agentic Age"*.

The organising question, verbatim:

> **What does good collaboration look like when part of your team isn't human?**

Entries are expected to use GitHub's planning and tracking primitives — Issues, Projects, milestones, sub-issues, Actions, the GraphQL API — together with AI agents.

## Judging criteria (verbatim, with our read on each)

| Criterion | What they said | How Lattice answers it |
|---|---|---|
| **Answers the challenge** | *"Does it actually say something about collaboration in the agentic age?"* | Coordination between human and non-human teammates **is** scheduling. Not a generic AI feature with a collaboration label on it. |
| **Agentic depth** | *"Are agents doing meaningful work, with sensible human checkpoints — or is AI bolted on?"* | The model does the genuinely hard part — semantic inference over a whole backlog — and it runs unsupervised. **See the note below: this criterion is the one we trade against.** |
| **Craft** | *"Does it work? Can someone else run it from your README?"* | `DEMO_MODE=1` fixture path means a judge with no tokens still sees the whole app. Budget real time for the README — it is scored. |
| **Collaboration, shown** | *"Your issues and board are part of the submission. We'd rather see a messy honest trail than a tidy fake one."* | We dogfood: our own issues, analysed by our own tool. Run history and the rejection log are queryable, so the trail of what the system proposed, rejected and cut is visible per run. |
| **Demo** | *"Can you make a stranger understand it in two minutes?"* | See [`07-demo-script.md`](07-demo-script.md). Designed backwards from the two minutes. |

### ⚠️ The deliberate trade on "Agentic depth"

The criterion asks for *"sensible human checkpoints"*. **Lattice has no approval gate**, by design: a scheduler that stops for a human on every edge is not a scheduler. This is a real risk against that criterion and we should meet it head-on rather than hope it isn't noticed.

The argument to make:

- **It is non-destructive by construction.** Lattice never writes to GitHub — not dependencies, not comments, not labels. There is no action it can take that a human has to undo. That is what earns it the right to run unsupervised, and it is a much stronger answer than a checkbox someone clicks 25 times.
- **The guards are structural.** Verbatim-evidence validation, a blocking threshold, immutable `given` edges. Constraints on what the system may conclude, rather than a gate in front of what it does.
- **Humans correct rather than approve.** Pin, suppress, or edit `blocked_by` directly on GitHub. Control without a bottleneck.
- **Agents feed the graph.** `report_dependency` means the system gets more accurate as work happens — a more interesting answer to "collaboration with non-human teammates" than an approval queue.
- **Humans still hold the pen.** Editing `blocked_by` on GitHub is treated as immutable ground truth the model may not contradict. Data flows toward GitHub only when a human puts it there.

Be ready to say this in one breath if a judge asks. It is a defensible position, but only if it's argued rather than glossed over.

Also stated: **"Being unfinished is not disqualifying. A half-built thing with clear thinking beats a polished thing with none."** And, on the honest-retro field: **"Honesty scores well."**

Both of those shape our strategy. We ship a narrow, working, well-explained thing and we write down what didn't work.

## Submission requirements (hard)

From the hackathon repo's issue templates:

- **Code lives in our own repo.** The README there is explicit: *"Your code lives wherever you want — a separate repo is completely fine and usually easier."* This repo is that repo.
- **An idea issue must be filed first**, before the hackathon starts, using `1-challenge-idea.yml`. Required fields: `summary`, `problem`, `agentic_angle`, `effort`, `availability`, plus both acknowledgement checkboxes.
- **One submission issue per team**, using `2-project-submission.yml`. Required: `team`, `members`, `idea_issue` (must link our idea issue), `what_it_does`, `repo`, `demo`, `agentic`, `how_we_collaborated` — **marked "this is scored"** — `learned`, and four checkboxes:
  - Organizers can access the code repository (public, or we've invited them)
  - The repo has a README that explains how to run the project
  - The demo link works for someone outside our team
  - We linked the original idea issue

**Consequence:** keep a running notes file during the hackathon, including the things that went wrong. `how_we_collaborated` and `learned` are scored free-text and they are much easier to write from notes than from memory at hour 17.

## Prior art on the hackathon board — and how we differ

Two organizer examples are adjacent:

- **#4 `/split`** — decompose an epic into sub-issues and route the mechanical ones to Copilot.
- **#7 Splitter** — the paired example submission.

**Decomposition is not ordering.** Those create *hierarchy* (parent → child). Lattice creates the *blocking relation between siblings* and the schedule that falls out of it. Worth one explicit sentence in our submission — it shows we read the board.

Notably, #7's own retrospective flags exactly our gap: they added a `blocked-on-human` label at hour 20 because *"the interesting queue wasn't 'what's in progress' but 'what's waiting on one of us to look at it.'"*

Also on the board: **#9 "[Idea] AI Sprint Planner"** (team "Claude plan") — a different team, adjacent idea. A sprint plan is downstream of exactly this graph. Worth cross-linking from our idea issue; the templates explicitly encourage linking near-duplicates.

## What we deliberately are not building

- **File-level conflict detection.** Mapping issues to the code they'd touch and flagging pairs that would collide was considered and dropped. The dependency graph already gives a deterministic answer to what can run in parallel — wave 0 is mutually independent by construction — and bolting a fuzzy text-similarity score on top of a computed result only adds a way to be wrong.
- **Writing anything back to GitHub.** Deliberate, not a shortcut — see above.
- Projects v2 custom-field writing, auth/multi-tenancy.
