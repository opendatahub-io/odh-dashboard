#!/usr/bin/env bash
# Classify review threads from fetch-review-threads.sh for deduplication.
# Identifies threads posted by prior preflight runs (by severity badge pattern)
# and categorizes each by reply status so the skill can avoid re-posting
# dismissed suggestions.
#
# Usage: classify-prior-threads.sh [--pr-author <login>]
# Input:  JSON array of threads (from fetch-review-threads.sh) on stdin
# Output: JSON object with preflight_threads (classified) and other_threads

set -euo pipefail

pr_author=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pr-author) pr_author="$2"; shift 2 ;;
    *) echo "Usage: classify-prior-threads.sh [--pr-author <login>]" >&2; exit 1 ;;
  esac
done

threads=$(cat)

jq -c --arg pr_author "$pr_author" '{
  preflight_threads: [
    .[]
    | select(
        .first_comment
        | test("_(🔴 Critical|🟠 Major|🟡 Minor|🧹 Nit(pick)?)_ · _")
      )
    | {
        path,
        line,
        author,
        first_comment,
        comment_count,
        replies,
        non_bot_replies: [
          .replies[] | select(.author | test("\\[bot\\]$") | not)
        ],
        disposition: (
          if ([.replies[] | select(.author | test("\\[bot\\]$") | not)] | length) == 0
          then "no_reply"
          elif ($pr_author != "") and ([.replies[] | select(.author == $pr_author)] | length > 0)
          then "author_replied"
          else "reviewer_replied"
          end
        )
      }
  ],
  other_threads: [
    .[]
    | select(
        .first_comment
        | test("_(🔴 Critical|🟠 Major|🟡 Minor|🧹 Nit(pick)?)_ · _")
        | not
      )
  ]
}' <<< "$threads"
