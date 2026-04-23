#!/usr/bin/env bash
# Fetch unresolved review threads from a GitHub PR using GraphQL.
# Handles pagination and sanitizes control characters in response bodies.
#
# Usage: fetch-review-threads.sh <owner> <repo> <pr_number>
# Output: JSON array of unresolved, non-outdated review threads with metadata.

set -euo pipefail

owner="${1:?Usage: fetch-review-threads.sh <owner> <repo> <pr_number>}"
repo="${2:?Usage: fetch-review-threads.sh <owner> <repo> <pr_number>}"
pr_number="${3:?Usage: fetch-review-threads.sh <owner> <repo> <pr_number>}"

all_threads='[]'
cursor=""

while :; do
  args=(-F owner="$owner" -F repo="$repo" -F pr="$pr_number")
  if [ -n "$cursor" ]; then
    args+=(-F cursor="$cursor")
  fi

  response=$(gh api graphql "${args[@]}" -f query='
    query($owner:String!, $repo:String!, $pr:Int!, $cursor:String) {
      repository(owner:$owner, name:$repo) {
        pullRequest(number:$pr) {
          title
          reviewThreads(first:100, after:$cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              isResolved
              isOutdated
              comments(first:10) {
                nodes {
                  databaseId
                  body
                  path
                  line
                  startLine
                  author { login }
                }
              }
            }
          }
        }
      }
    }
  ')

  # Sanitize control characters that break jq (CodeRabbit bodies contain these)
  sanitized=$(echo "$response" | tr -d '\000-\010\013\014\016-\037')

  # Extract unresolved, non-outdated threads
  page_threads=$(echo "$sanitized" | jq -c '[
    .data.repository.pullRequest.reviewThreads.nodes[]
    | select(.isResolved == false and .isOutdated == false)
    | {
        author: .comments.nodes[0].author.login,
        path: .comments.nodes[0].path,
        line: .comments.nodes[0].line,
        is_coderabbit: (.comments.nodes[0].author.login | test("coderabbit")),
        comment_count: (.comments.nodes | length),
        first_comment: .comments.nodes[0].body,
        replies: [.comments.nodes[1:][] | {author: .author.login, body: .body}]
      }
  ]')

  all_threads=$(echo "$all_threads" | jq -c --argjson new "$page_threads" '. + $new')

  has_next=$(echo "$sanitized" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage')
  cursor=$(echo "$sanitized" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.endCursor // empty')
  [ "$has_next" = "true" ] || break
done

echo "$all_threads" | jq '.'
