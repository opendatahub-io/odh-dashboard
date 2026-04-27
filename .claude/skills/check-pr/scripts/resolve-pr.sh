#!/usr/bin/env bash
# Resolve a PR number and fetch its metadata.
# Used by check-pr skill.
#
# Usage: resolve-pr.sh [pr-number-or-url]
#   If no argument, detects from the current branch.
#
# Output: JSON with all PR metadata needed by downstream skills.

set -euo pipefail

input="${1:-}"

# Extract PR number from URL or use directly
if [ -n "$input" ]; then
  pr_number=$(echo "$input" | grep -oE '[0-9]+$' | head -1)
else
  pr_number=$(gh pr list --head "$(git branch --show-current)" --state open --json number --jq '.[0].number' 2>/dev/null)
fi

if [ -z "$pr_number" ] || [ "$pr_number" = "null" ]; then
  echo '{"error": "no PR found"}' >&2
  exit 1
fi

# Fetch everything in one call
pr_json=$(gh pr view "$pr_number" --json title,headRefName,baseRefName,mergeable,mergeStateStatus,number,body,author,labels,additions,deletions,changedFiles,reviewDecision,headRepositoryOwner)
owner=$(gh repo view --json owner --jq '.owner.login')
repo=$(gh repo view --json name --jq '.name')
current_branch=$(git branch --show-current)

echo "$pr_json" | jq -c --arg owner "$owner" --arg repo "$repo" --arg current_branch "$current_branch" '. + {owner: $owner, repo: $repo, current_branch: $current_branch}'
