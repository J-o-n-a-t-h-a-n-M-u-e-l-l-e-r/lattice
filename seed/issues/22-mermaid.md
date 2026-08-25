# [S] ~~Mermaid DAG emitter~~ (superseded)
<!-- labels: lane:graph,size:S -->
**This issue is obsolete. Do not implement it.**

The deliverable is a **real interactive graph** — a polished, deployed Next.js app where you click a node to see its blockers, its dependents, the evidence behind each edge, and a link through to the issue on GitHub. See #25 and #26.

A static Mermaid diagram is not a smaller version of that; it's a different and worse thing, and building it would have absorbed polish time that belongs in the real view.

What survives is **#51** — serialising the scheduled graph into the payload the UI consumes.
