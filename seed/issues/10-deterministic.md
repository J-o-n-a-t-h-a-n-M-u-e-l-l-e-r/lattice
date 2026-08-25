# [I] ~~Deterministic extractors for explicit dependency phrasing~~ (superseded)
<!-- labels: lane:inference,size:M -->
**This issue is obsolete. Do not implement it.**

The original plan regex-extracted directional phrases ("blocked by #12", "depends on #7") from issue prose.

**Cut.** Free-text dependency phrasing is inconsistent, and parsing it *well* means handling code fences, quoted text, negation and ambiguous direction — a pile of brittle special cases for a signal the model already reads perfectly well. The model sees the same prose and reports it as an edge with the quote attached as evidence, which is strictly more useful than a regex hit.

What remains is **#6** — deterministic edges sourced from the GitHub API rather than from text: existing native `blocked_by` and sub-issue hierarchy.

**Known consequence:** the LLM is now load-bearing with no cheap fallback. On a repo with no pre-existing dependencies, the graph is entirely inferred. Mitigations are the response cache and the committed fixture. See `docs/02-inference-pipeline.md` and `docs/08-risks.md`.
