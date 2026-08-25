# [G] ~~Receipt comments on applied edges~~ (superseded)
<!-- labels: lane:github-io,size:S -->
**This issue is obsolete. Do not implement it.**

The original plan posted a comment on each blocked issue explaining why the edge existed, since GitHub's dependency API stores no reasoning.

**Cut**, for three reasons: it's noise on every issue in the repo, it doesn't survive re-runs cleanly (the pipeline now runs on every issue event, so comments would multiply or need reconciling), and it turns a quiet background process into a notification spammer.

The reasoning still exists and is still retrievable — it lives in the store and comes back through the `explain_dependency` MCP tool and the `/runs` UI. See `docs/11-graph-store.md`.
