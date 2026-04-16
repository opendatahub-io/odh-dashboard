#!/usr/bin/env bash
# Pre-flight checks for the iterate job.
# Checks PR state, iteration limits, throttle, and collects feedback.
# Usage: preflight.sh TICKET_KEY
# Env: REPO_OWNER, MAX_ITERATIONS, ITERATION_INTERVAL, LABEL_*, JIRA_*, GH_TOKEN
# Writes: /tmp/summary.txt, /tmp/description.txt, /tmp/issuetype.txt, /tmp/comments.txt,
#         /tmp/review_threads.json, /tmp/review_comments.txt, /tmp/ci_failures.txt
# Outputs to GITHUB_OUTPUT: proceed, pr_number, pr_url, next_iteration, review_count, has_ci_failures

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

ticket="${1:?Usage: preflight.sh TICKET_KEY}"
repo_name="${GITHUB_REPOSITORY#*/}"

# Check PR state before fetching ticket details (avoids unnecessary Jira call)
pr_json=$(gh pr list \
  --head "jira-autofix/$ticket" \
  --state open \
  --json number,url \
  --limit 1)

if [[ $(echo "$pr_json" | jq 'length') -eq 0 ]]; then
  merged_json=$(gh pr list \
    --head "jira-autofix/$ticket" \
    --state merged \
    --json number \
    --limit 1)

  if [[ $(echo "$merged_json" | jq 'length') -gt 0 ]]; then
    echo "PR was merged for $ticket"
    jira_comment "$ticket" "The pull request has been merged."
    jira_labels "$ticket" "$LABEL_DONE" "$LABEL_REVIEW"
    echo "proceed=false" >> "$GITHUB_OUTPUT"
    exit 0
  fi

  echo "No open PR found for $ticket"
  jira_comment "$ticket" "No open pull request found. Cannot iterate."
  jira_labels "$ticket" "$LABEL_NEEDS_INFO" "$LABEL_REVIEW"
  echo "proceed=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

pr_number=$(echo "$pr_json" | jq -r '.[0].number')
pr_url=$(echo "$pr_json" | jq -r '.[0].url')
echo "pr_number=$pr_number" >> "$GITHUB_OUTPUT"
echo "pr_url=$pr_url" >> "$GITHUB_OUTPUT"

# Fetch ticket details (only reached if PR is open)
response=$(jira_get_ticket "$ticket")
parse_ticket_response "$response"

# Count previous iterations
iteration_count=$(echo "$response" | jq \
  '[.fields.comment.comments[] | select(.body | test("Iteration [0-9]+/[0-9]+"))] | length')

if [[ "$iteration_count" -ge "$MAX_ITERATIONS" ]]; then
  echo "Max iterations ($MAX_ITERATIONS) reached for $ticket"
  jira_comment "$ticket" "Reached maximum of ${MAX_ITERATIONS} iterations. Unresolved feedback remains on the PR — a human should take over.\n\n${pr_url}"
  jira_labels "$ticket" "$LABEL_NEEDS_INFO" "$LABEL_REVIEW"
  echo "proceed=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

next_iteration=$((iteration_count + 1))
echo "next_iteration=$next_iteration" >> "$GITHUB_OUTPUT"

# Throttle: first iteration runs immediately; subsequent ones wait ITERATION_INTERVAL.
if [[ "$iteration_count" -gt 0 ]]; then
  last_ts=$(echo "$response" | jq -r \
    '[.fields.comment.comments[] | select(.body | test("Iteration [0-9]+/[0-9]+")) | .created] | sort | last')
  last_epoch=$(date -d "$last_ts" +%s 2>/dev/null || echo "0")
  now_epoch=$(date +%s)
  elapsed=$((now_epoch - last_epoch))

  if [[ "$elapsed" -lt "$ITERATION_INTERVAL" ]]; then
    remaining_min=$(( (ITERATION_INTERVAL - elapsed) / 60 ))
    echo "Throttled: next iteration for $ticket in ~${remaining_min}m"
    echo "proceed=false" >> "$GITHUB_OUTPUT"
    exit 0
  fi
fi

# Collect unresolved review threads
review_data=$(gh api graphql -f query='
  query($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            comments(first: 1) {
              nodes {
                databaseId
                body
                author { login }
                path
                line
              }
            }
          }
        }
      }
    }
  }' -f owner="$REPO_OWNER" \
     -f repo="$repo_name" \
     -F number="$pr_number")

echo "$review_data" | jq '[
  .data.repository.pullRequest.reviewThreads.nodes[]
  | select(.isResolved == false)
  | {
      thread_id: .id,
      comment_id: .comments.nodes[0].databaseId,
      file: .comments.nodes[0].path,
      line: .comments.nodes[0].line,
      body: .comments.nodes[0].body,
      author: .comments.nodes[0].author.login
    }
]' > /tmp/review_threads.json

review_count=$(jq 'length' /tmp/review_threads.json)
echo "review_count=$review_count" >> "$GITHUB_OUTPUT"

if [[ "$review_count" -gt 0 ]]; then
  jq -r '.[] | "File: \(.file) (line \(.line))\nComment by \(.author): \(.body)\n---"' \
    /tmp/review_threads.json > /tmp/review_comments.txt
else
  : > /tmp/review_comments.txt
fi

# Collect CI failures (cap total output to avoid oversized prompts)
ci_failures=""
failed_runs=$(gh run list \
  --branch "jira-autofix/$ticket" \
  --status failure \
  --json databaseId,name \
  --limit 3 2>/dev/null || echo "[]")

for run_id in $(echo "$failed_runs" | jq -r '.[].databaseId'); do
  run_name=$(echo "$failed_runs" | jq -r ".[] | select(.databaseId == $run_id) | .name")
  log=$(gh run view "$run_id" --log-failed 2>&1 | tail -200 || echo "Could not fetch logs")
  ci_failures="${ci_failures}Job: ${run_name} (FAILED)
${log}
---
"
done
echo "${ci_failures:0:50000}" > /tmp/ci_failures.txt

has_ci_failures="false"
if [[ -n "$ci_failures" ]]; then
  has_ci_failures="true"
fi
echo "has_ci_failures=$has_ci_failures" >> "$GITHUB_OUTPUT"

# No-op check
if [[ "$review_count" -eq 0 ]] && [[ "$has_ci_failures" == "false" ]]; then
  latest_conclusion=$(gh run list \
    --branch "jira-autofix/$ticket" \
    --limit 1 \
    --json conclusion \
    --jq '.[0].conclusion // "unknown"' 2>/dev/null || echo "unknown")

  if [[ "$latest_conclusion" == "success" ]]; then
    echo "CI green, no review feedback — marking $ticket done"
    jira_comment "$ticket" "CI is green and there are no unresolved review comments. Marking as done.\n\n${pr_url}"
    jira_labels "$ticket" "$LABEL_DONE" "$LABEL_REVIEW"
  else
    echo "No review feedback, CI not done yet — skipping $ticket"
  fi
  echo "proceed=false" >> "$GITHUB_OUTPUT"
  exit 0
fi

echo "proceed=true" >> "$GITHUB_OUTPUT"
