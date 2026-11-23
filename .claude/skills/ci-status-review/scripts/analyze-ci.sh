#!/usr/bin/env bash
# Gather CI check status from a PR and/or discover local CI workflows.
# For failed checks, also fetches job logs.
# Does NOT categorize — just returns raw data for the LLM to interpret.
#
# Usage: analyze-ci.sh <owner> <repo> [pr_number]
#   If pr_number is given, fetches check status and failure logs from the PR.
#   Always scans .github/workflows/ for available workflow definitions.
#
# Output: JSON with pr_checks (if PR given), failures (with logs), and local_workflows.

set -euo pipefail

owner="${1:?Usage: analyze-ci.sh <owner> <repo> [pr_number]}"
repo="${2:?Usage: analyze-ci.sh <owner> <repo> [pr_number]}"
pr_number="${3:-}"

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")

# Fetch PR checks if PR number given
pr_checks='null'
failures='[]'
if [ -n "$pr_number" ]; then
  pr_checks=$(gh pr checks "$pr_number" --repo "$owner/$repo" \
    --json name,bucket,link,startedAt,completedAt,description \
    2>/dev/null || echo '[]')

  # For each failed check, fetch job logs
  failed=$(echo "$pr_checks" | jq -c '[.[] | select(.bucket == "fail" or .bucket == "cancel")]')
  count=$(echo "$failed" | jq 'length')

  for i in $(seq 0 $((count - 1))); do
    name=$(echo "$failed" | jq -r ".[$i].name")
    link=$(echo "$failed" | jq -r ".[$i].link")
    bucket=$(echo "$failed" | jq -r ".[$i].bucket")

    run_id=$(echo "$link" | grep -oE '/runs/[0-9]+' | grep -oE '[0-9]+' | head -1)
    if [ -z "$run_id" ]; then
      failures=$(echo "$failures" | jq -c --arg name "$name" --arg bucket "$bucket" \
        '. + [{name: $name, bucket: $bucket, error: "could not extract run_id"}]')
      continue
    fi

    job_ids=$(gh api "repos/$owner/$repo/actions/runs/$run_id/jobs" \
      --jq '[.jobs[] | select(.conclusion == "failure" or .conclusion == "cancelled") | .id]' 2>/dev/null || echo '[]')

    job_count=$(echo "$job_ids" | jq 'length')
    if [ "$job_count" -eq 0 ]; then
      failures=$(echo "$failures" | jq -c --arg name "$name" --arg run_id "$run_id" --arg bucket "$bucket" \
        '. + [{name: $name, run_id: $run_id, bucket: $bucket, error: "no failed job found"}]')
      continue
    fi

    for j in $(seq 0 $((job_count - 1))); do
      job_id=$(echo "$job_ids" | jq -r ".[$j]")
      log_file=$(mktemp)
      gh api "repos/$owner/$repo/actions/jobs/$job_id/logs" 2>/dev/null \
        | tail -150 | tail -c 65536 > "$log_file" || echo "(logs unavailable)" > "$log_file"

      failures=$(echo "$failures" | jq -c \
        --arg name "$name" --arg run_id "$run_id" --arg job_id "$job_id" --arg bucket "$bucket" \
        --rawfile log_tail "$log_file" \
        '. + [{name: $name, run_id: $run_id, job_id: $job_id, bucket: $bucket, log_tail: $log_tail}]')
      rm -f "$log_file"
    done
  done
fi

# Scan local workflow files
local_workflows='[]'
workflow_dir="$repo_root/.github/workflows"
if [ -d "$workflow_dir" ]; then
  for f in "$workflow_dir"/*.yml "$workflow_dir"/*.yaml; do
    [ -f "$f" ] || continue
    filename=$(basename "$f")
    wf_name=$(grep -m1 '^name:' "$f" | sed 's/^name:[[:space:]]*//' | tr -d "'\"")

    jobs=$(awk '
      /^  [a-zA-Z_-]+:$/ { job=$1; gsub(/:$/,"",job) }
      /run:/ && job {
        cmd=$0; gsub(/^[[:space:]]*run:[[:space:]]*/,"",cmd); gsub(/\|$/,"",cmd)
        if (length(cmd) > 0 && cmd !~ /^\|/) print job ": " cmd
      }
    ' "$f" 2>/dev/null | head -20 || echo "")

    triggers=$(awk '/^on:/{found=1; next} found && /^[^ ]/{found=0} found{print}' "$f" | grep -oE '(push|pull_request|workflow_dispatch|issue_comment|schedule)' 2>/dev/null | sort -u | tr '\n' ',' | sed 's/,$//' || echo "")

    local_workflows=$(echo "$local_workflows" | jq -c \
      --arg file "$filename" --arg name "$wf_name" --arg jobs "$jobs" --arg triggers "$triggers" \
      '. + [{file: $file, name: $name, jobs: $jobs, triggers: $triggers}]')
  done
fi

jq -n \
  --argjson pr_checks "$pr_checks" \
  --argjson failures "$failures" \
  --argjson local_workflows "$local_workflows" \
  '{pr_checks: $pr_checks, failures: $failures, local_workflows: $local_workflows}'
