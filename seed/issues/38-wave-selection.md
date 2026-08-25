# [C] ~~Conflict-free wave selection with visible deferrals~~ (superseded)
<!-- labels: lane:mcp,size:M -->
**This issue is obsolete. Do not implement it.**

Dispatch takes the ready set — wave-0 issues ranked by blast radius — and assigns them. There is no extra filtering step.

**Issues in wave 0 are mutually independent by construction**, so there is nothing to be conflict-free *about*. See #23 for why the similarity-score approach was dropped.

What remains is in #37 (dispatch) and #39 (the briefing, which tells each agent its expected file surface).
