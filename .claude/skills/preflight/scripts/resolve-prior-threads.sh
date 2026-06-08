#!/usr/bin/env bash
# Resolve prior preflight review threads that have been addressed by new commits.
# Posts a reply noting the resolving commit and collapses the thread via GraphQL.
#
# Usage: resolve-prior-threads.sh <owner> <repo> <pr_number>
# Input:  JSON object from classify-prior-threads.sh on stdin
# Output: JSON object with resolved (array) and skipped (array) threads

set -euo pipefail

owner="${1:?Usage: resolve-prior-threads.sh <owner> <repo> <pr_number>}"
repo="${2:?Usage: resolve-prior-threads.sh <owner> <repo> <pr_number>}"
pr_number="${3:?Usage: resolve-prior-threads.sh <owner> <repo> <pr_number>}"

input=$(cat)

resolved='[]'
skipped='[]'

add_resolved() {
  local path="$1" line="$2" reason="$3"
  resolved=$(echo "$resolved" | jq -c --arg p "$path" --arg l "$line" --arg r "$reason" \
    '. + [{path: $p, line: ($l | tonumber? // null), reason: $r}]')
}

add_skipped() {
  local path="$1" line="$2" reason="$3"
  skipped=$(echo "$skipped" | jq -c --arg p "$path" --arg l "$line" --arg r "$reason" \
    '. + [{path: $p, line: ($l | tonumber? // null), reason: $r}]')
}

line_in_diff_hunk() {
  local old_sha="$1" path="$2" target_line="$3"
  local hunks
  hunks=$(git diff "$old_sha"..HEAD -- "$path" 2>/dev/null | grep '^@@' || true)
  [ -z "$hunks" ] && return 1

  while IFS= read -r hunk; do
    local range start length end
    range=$(echo "$hunk" | grep -oE '\+[0-9]+(,[0-9]+)?' | head -1)
    start="${range#+}"
    start="${start%%,*}"
    if [[ "$range" == *,* ]]; then
      length="${range#*,}"
    else
      length=1
    fi
    end=$((start + length - 1))
    if [ "$target_line" -ge "$start" ] && [ "$target_line" -le "$end" ]; then
      return 0
    fi
  done <<< "$hunks"
  return 1
}

resolve_thread() {
  local thread_id="$1" database_id="$2" sha="$3"

  # Post reply noting the resolving commit
  gh api "repos/$owner/$repo/pulls/$pr_number/comments/$database_id/replies" \
    -f body="Resolved — addressed in \`$sha\`." >/dev/null 2>&1 || true

  # Collapse the thread via GraphQL
  gh api graphql -f query='
    mutation($id: ID!) {
      resolveReviewThread(input: {threadId: $id}) {
        thread { isResolved }
      }
    }
  ' -f id="$thread_id" >/dev/null 2>&1 || true
}

thread_count=$(echo "$input" | jq '.preflight_threads | length')

for (( i=0; i<thread_count; i++ )); do
  thread=$(echo "$input" | jq -c ".preflight_threads[$i]")
  disposition=$(echo "$thread" | jq -r '.disposition')
  path=$(echo "$thread" | jq -r '.path // ""')
  line=$(echo "$thread" | jq -r '.line // "null"')
  thread_id=$(echo "$thread" | jq -r '.thread_id // ""')
  database_id=$(echo "$thread" | jq -r '.database_id // ""')
  created_at=$(echo "$thread" | jq -r '.created_at // ""')

  # Only auto-resolve no_reply threads
  if [ "$disposition" != "no_reply" ]; then
    add_skipped "$path" "$line" "disposition: $disposition"
    continue
  fi

  # Skip file-level comments (no line anchor)
  if [ "$line" = "null" ] || [ -z "$line" ]; then
    add_skipped "$path" "$line" "no line anchor"
    continue
  fi

  # Skip if missing required fields
  if [ -z "$thread_id" ] || [ -z "$database_id" ] || [ -z "$created_at" ]; then
    add_skipped "$path" "$line" "missing thread_id, database_id, or created_at"
    continue
  fi

  # File deleted → resolve (finding is moot)
  if [ ! -f "$path" ]; then
    resolve_sha=$(git log -1 --format=%h -- "$path" 2>/dev/null || echo "HEAD")
    resolve_thread "$thread_id" "$database_id" "$resolve_sha"
    add_resolved "$path" "$line" "file deleted"
    continue
  fi

  # Check if file was modified after the thread was posted
  commits_after=$(git log --after="$created_at" --oneline -- "$path" 2>/dev/null || true)
  if [ -z "$commits_after" ]; then
    add_skipped "$path" "$line" "file not modified since thread posted"
    continue
  fi

  # Find the commit just before the thread was posted
  old_sha=$(git log --before="$created_at" -1 --format=%H -- "$path" 2>/dev/null || true)
  if [ -z "$old_sha" ]; then
    resolve_sha=$(git log --after="$created_at" -1 --format=%h -- "$path")
    resolve_thread "$thread_id" "$database_id" "$resolve_sha"
    add_resolved "$path" "$line" "file created after thread"
    continue
  fi

  # Check if the specific line was in a modified hunk
  if line_in_diff_hunk "$old_sha" "$path" "$line"; then
    resolve_sha=$(git log --after="$created_at" -1 --format=%h -- "$path")
    resolve_thread "$thread_id" "$database_id" "$resolve_sha"
    add_resolved "$path" "$line" "line modified in $resolve_sha"
  else
    add_skipped "$path" "$line" "line not in modified hunk"
  fi
done

jq -n --argjson resolved "$resolved" --argjson skipped "$skipped" \
  '{resolved: $resolved, skipped: $skipped}'
