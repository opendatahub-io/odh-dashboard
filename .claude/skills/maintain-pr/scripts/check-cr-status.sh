#!/usr/bin/env bash
# Check if a CodeRabbit review is still in progress on a PR.
#
# Usage: check-cr-status.sh <pr_number>
# Output: "in_progress" or "complete"

set -euo pipefail

pr_number="${1:?Usage: check-cr-status.sh <pr_number>}"

count=$(gh pr view "$pr_number" --json comments,reviews --jq '
  [
    (.comments[]?
      | select(.author.login == "coderabbitai" or .author.login == "coderabbit[bot]" or .author.login == "coderabbitai[bot]")
      | .body // empty),
    (.reviews[]?
      | select(.author.login == "coderabbitai" or .author.login == "coderabbit[bot]" or .author.login == "coderabbitai[bot]")
      | .body // empty)
  ]
  | map(select(test("Come back again in a few minutes")))
  | length
')

if [ "$count" -gt 0 ]; then
  echo "in_progress"
else
  echo "complete"
fi
