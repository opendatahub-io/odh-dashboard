#!/usr/bin/env bash
# Resolve PR review threads and post iteration summary to Jira.
# Usage: resolve-threads.sh TICKET_KEY
# Env: PR_URL, NEXT_ITERATION, REVIEW_COUNT, HAS_CI_FAILURES, MAX_ITERATIONS, JIRA_*, GH_TOKEN
# Reads: /tmp/review_threads.json

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

ticket="${1:?Usage: resolve-threads.sh TICKET_KEY}"

# Resolve each review thread: batch reply + resolve into a single GraphQL call
for thread_id in $(jq -r '.[].thread_id' /tmp/review_threads.json 2>/dev/null); do
  gh api graphql -f query='
    mutation($id: ID!, $body: String!) {
      reply: addPullRequestReviewThreadReply(input: {pullRequestReviewThreadId: $id, body: $body}) {
        comment { id }
      }
      resolve: resolveReviewThread(input: {threadId: $id}) {
        thread { isResolved }
      }
    }' -f id="$thread_id" \
       -f body="Addressed in the latest revision — please re-review." || true
done

# Build summary
summary_parts=""
if [[ "$REVIEW_COUNT" -gt 0 ]]; then
  summary_parts="addressed ${REVIEW_COUNT} review comment(s)"
fi
if [[ "$HAS_CI_FAILURES" == "true" ]]; then
  if [[ -n "$summary_parts" ]]; then
    summary_parts="${summary_parts} and CI failures"
  else
    summary_parts="addressed CI failures"
  fi
fi

jira_comment "$ticket" "Iteration ${NEXT_ITERATION}/${MAX_ITERATIONS}: ${summary_parts}.\n\n${PR_URL}"
