#!/usr/bin/env bash
# Fetch CI failure details for a GitHub PR.
# Returns failed check names, run/job IDs, and log tails.
#
# Usage: fetch-ci-failures.sh <owner> <repo> <pr_number>
# Output: JSON array of failures with name, run_id, job_id, and log_tail.

set -euo pipefail

owner="${1:?Usage: fetch-ci-failures.sh <owner> <repo> <pr_number>}"
repo="${2:?Usage: fetch-ci-failures.sh <owner> <repo> <pr_number>}"
pr_number="${3:?Usage: fetch-ci-failures.sh <owner> <repo> <pr_number>}"

# Get failed checks — gh pr checks uses 'state' not 'conclusion'
failed_checks=$(gh pr checks "$pr_number" --repo "$owner/$repo" --json name,state,link \
  --jq '[.[] | select(.state == "FAILURE")]' 2>/dev/null || echo '[]')

count=$(echo "$failed_checks" | jq 'length')
if [ "$count" -eq 0 ]; then
  echo '[]'
  exit 0
fi

# For each failure, fetch job logs
results='[]'
for i in $(seq 0 $((count - 1))); do
  name=$(echo "$failed_checks" | jq -r ".[$i].name")
  link=$(echo "$failed_checks" | jq -r ".[$i].link")

  # Extract run ID from URL
  run_id=$(echo "$link" | grep -oE '/runs/[0-9]+' | grep -oE '[0-9]+' | head -1)

  if [ -z "$run_id" ]; then
    results=$(echo "$results" | jq -c --arg name "$name" '. + [{name: $name, error: "could not extract run_id"}]')
    continue
  fi

  # Get failed job ID
  job_id=$(gh api "repos/$owner/$repo/actions/runs/$run_id/jobs" \
    --jq '.jobs[] | select(.conclusion == "failure") | .id' 2>/dev/null | head -1)

  if [ -z "$job_id" ]; then
    results=$(echo "$results" | jq -c --arg name "$name" --arg run_id "$run_id" \
      '. + [{name: $name, run_id: $run_id, error: "no failed job found"}]')
    continue
  fi

  # Fetch log tail
  log_tail=$(gh api "repos/$owner/$repo/actions/jobs/$job_id/logs" 2>/dev/null | tail -150 || echo "(logs unavailable)")

  results=$(echo "$results" | jq -c \
    --arg name "$name" \
    --arg run_id "$run_id" \
    --arg job_id "$job_id" \
    --arg log_tail "$log_tail" \
    '. + [{name: $name, run_id: $run_id, job_id: $job_id, log_tail: $log_tail}]')
done

echo "$results" | jq '.'
