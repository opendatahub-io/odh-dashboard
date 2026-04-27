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

# Get all non-passing checks (fail, cancel, error, timed_out, etc.)
failed_checks=$(gh pr checks "$pr_number" --repo "$owner/$repo" --json name,bucket,link \
  --jq '[.[] | select(.bucket != "pass" and .bucket != "pending" and .bucket != "skipping")]' 2>/dev/null || echo '[]')

count=$(echo "$failed_checks" | jq 'length')
if [ "$count" -eq 0 ]; then
  echo '[]'
  exit 0
fi

results='[]'
for i in $(seq 0 $((count - 1))); do
  name=$(echo "$failed_checks" | jq -r ".[$i].name")
  link=$(echo "$failed_checks" | jq -r ".[$i].link")

  run_id=$(echo "$link" | grep -oE '/runs/[0-9]+' | grep -oE '[0-9]+' | head -1)

  if [ -z "$run_id" ]; then
    results=$(echo "$results" | jq -c --arg name "$name" '. + [{name: $name, error: "could not extract run_id"}]')
    continue
  fi

  # Get ALL failed job IDs (not just the first — matrix jobs can have multiple failures)
  job_ids=$(gh api "repos/$owner/$repo/actions/runs/$run_id/jobs" \
    --jq '[.jobs[] | select(.conclusion == "failure") | .id]' 2>/dev/null || echo '[]')

  job_count=$(echo "$job_ids" | jq 'length')
  if [ "$job_count" -eq 0 ]; then
    results=$(echo "$results" | jq -c --arg name "$name" --arg run_id "$run_id" \
      '. + [{name: $name, run_id: $run_id, error: "no failed job found"}]')
    continue
  fi

  for j in $(seq 0 $((job_count - 1))); do
    job_id=$(echo "$job_ids" | jq -r ".[$j]")

    # Write logs to temp file to avoid ARG_MAX with jq --arg
    log_file=$(mktemp)
    gh api "repos/$owner/$repo/actions/jobs/$job_id/logs" 2>/dev/null \
      | tail -150 | tail -c 65536 > "$log_file" || echo "(logs unavailable)" > "$log_file"

    results=$(echo "$results" | jq -c \
      --arg name "$name" \
      --arg run_id "$run_id" \
      --arg job_id "$job_id" \
      --rawfile log_tail "$log_file" \
      '. + [{name: $name, run_id: $run_id, job_id: $job_id, log_tail: $log_tail}]')
    rm -f "$log_file"
  done
done

echo "$results" | jq '.'
