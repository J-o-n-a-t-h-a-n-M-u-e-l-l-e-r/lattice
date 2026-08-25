#!/usr/bin/env bash
# Create the Lattice backlog on GitHub from seed/issues/*.md
#
# Each seed file is:
#   line 1  # <title>
#   line 2  <!-- labels: a,b -->
#   rest    issue body
#
# Files are created in filename order, so NN-*.md becomes issue #NN on a fresh
# repo. Issue bodies cross-reference each other by that number — if you create
# them out of order, or into a repo that already has issues, the references
# will be wrong.
#
# NOTE: we deliberately do NOT set any blocked_by dependencies here. Discovering
# them is the product. The prose in each body is the input.

set -euo pipefail

REPO="${1:-}"
if [[ -z "$REPO" ]]; then
  echo "usage: $0 <owner/repo>" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

echo "==> Creating labels"
create_label() { gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null; }

create_label "lane:foundation" "5319e7" "Shared contract and scaffolding"
create_label "lane:github-io"  "0e8a16" "GitHub API ingest and write-back"
create_label "lane:inference"  "d93f0b" "Dependency inference pipeline"
create_label "lane:graph"      "fbca04" "Graph algorithms and scheduling"
create_label "lane:ui"         "1d76db" "Next.js web app"
create_label "lane:mcp"        "b60205" "MCP server and agent coordination"
create_label "lane:demo"       "c5def5" "Demo, docs, evaluation, submission"
create_label "size:S"          "ededed" "A few hours"
create_label "size:M"          "d4c5f9" "Half a day"
create_label "size:L"          "f9d0c4" "A full day"

echo "==> Creating issues"
n=0
for f in seed/issues/*.md; do
  title=$(head -1 "$f" | sed 's/^# //')
  labels=$(sed -n '2p' "$f" | sed -n 's/.*labels: *\(.*\) *-->.*/\1/p' | tr -d ' ')
  body=$(tail -n +3 "$f")

  url=$(gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels")
  n=$((n + 1))
  printf '  %-70s %s\n' "$title" "$url"
  sleep 1   # be kind to the secondary rate limit
done

echo "==> Created $n issues"
echo
echo "Deliberately NOT set: any blocked_by dependencies."
echo "Finding those is the point. Run 'npm run analyze' against this repo."
