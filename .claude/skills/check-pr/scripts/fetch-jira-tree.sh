#!/usr/bin/env bash
# Fetch a Jira issue and walk its parent hierarchy up to a given depth.
# Returns a JSON tree: issue → epic → initiative → strategy/RFE.
#
# Usage: fetch-jira-tree.sh <issue-key> [max-depth]
#   issue-key:  e.g. RHOAIENG-12345
#   max-depth:  how many parents to walk (default: 3)
#
# Authentication:
#   Set JIRA_TOKEN (personal access token / bearer token)
#   Optionally set JIRA_BASE_URL (default: https://issues.redhat.com)
#
# Output: JSON with the issue and its parent chain, priority, fix versions,
#         issue type at each level, and a computed tier (1-4).

set -euo pipefail

issue_key="${1:?Usage: fetch-jira-tree.sh <issue-key> [max-depth]}"
max_depth="${2:-3}"

base_url="${JIRA_BASE_URL:-https://issues.redhat.com}"
api_url="$base_url/rest/api/2"

if [ -z "${JIRA_TOKEN:-}" ]; then
  echo '{"error": "JIRA_TOKEN environment variable is not set"}' >&2
  exit 1
fi

fetch_issue() {
  local key="$1"
  local fields="summary,issuetype,priority,status,parent,fixVersions,customfield_12311140,assignee,description"

  curl -sS --fail-with-body \
    -H "Authorization: Bearer $JIRA_TOKEN" \
    -H "Content-Type: application/json" \
    "$api_url/issue/$key?fields=$fields" 2>/dev/null || echo '{"error": "failed to fetch '$key'"}'
}

# Fetch the root issue
root=$(fetch_issue "$issue_key")

if echo "$root" | jq -e '.error // .errorMessages' >/dev/null 2>&1; then
  echo "$root" | jq -c '{error: (.error // .errorMessages[0] // "unknown error"), key: "'"$issue_key"'"}'
  exit 1
fi

# Extract fields from an issue JSON
extract() {
  local issue="$1"
  echo "$issue" | jq -c '{
    key: .key,
    summary: .fields.summary,
    type: .fields.issuetype.name,
    priority: .fields.priority.name,
    status: .fields.status.name,
    assignee: (.fields.assignee.displayName // null),
    has_description: ((.fields.description // "") | length > 0),
    fix_versions: [.fields.fixVersions[]? | .name],
    parent_key: (.fields.parent.key // null)
  }'
}

# Walk the parent chain
chain='[]'
current="$root"
depth=0

while [ "$depth" -le "$max_depth" ]; do
  node=$(extract "$current")
  chain=$(echo "$chain" | jq -c --argjson node "$node" '. + [$node]')

  parent_key=$(echo "$node" | jq -r '.parent_key // empty')
  if [ -z "$parent_key" ]; then
    break
  fi

  current=$(fetch_issue "$parent_key")
  if echo "$current" | jq -e '.error // .errorMessages' >/dev/null 2>&1; then
    break
  fi

  depth=$((depth + 1))
done

# Compute tier
priority=$(echo "$chain" | jq -r '.[0].priority')
types=$(echo "$chain" | jq -r '[.[].type] | join(" > ")')
has_fix_version=$(echo "$chain" | jq '.[0].fix_versions | length > 0')
depth_reached=$(echo "$chain" | jq 'length')

# Tier logic
tier=4
tier_reason="No strategic alignment found"

if [ "$priority" = "Blocker" ]; then
  tier=1
  tier_reason="Blocker priority"
elif echo "$types" | grep -qiE "feature request|rfe|strategy"; then
  tier=1
  tier_reason="Linked to RFE/Strategy via: $types"
elif [ "$has_fix_version" = "true" ]; then
  tier=1
  fix_ver=$(echo "$chain" | jq -r '.[0].fix_versions[0]')
  tier_reason="Has fix version: $fix_ver"
elif [ "$priority" = "Critical" ]; then
  tier=2
  tier_reason="Critical priority"
elif echo "$types" | grep -qi "initiative"; then
  tier=2
  tier_reason="Linked to Initiative via: $types"
elif [ "$depth_reached" -ge 2 ]; then
  tier=3
  tier_reason="Has Epic parent but no Initiative/RFE link"
elif [ "$depth_reached" -eq 1 ]; then
  issue_type=$(echo "$chain" | jq -r '.[0].type')
  has_desc=$(echo "$chain" | jq -r '.[0].has_description')
  if [ "$has_desc" = "true" ] && echo "$issue_type" | grep -qiE "bug|story|task"; then
    tier=3
    tier_reason="Standalone $issue_type with description"
  else
    tier=4
    tier_reason="Standalone issue, no parent hierarchy"
  fi
fi

# Output
echo "$chain" | jq --argjson tier "$tier" --arg reason "$tier_reason" '{
  issue: .[0],
  hierarchy: [.[] | {key, type, summary}],
  hierarchy_path: ([.[].type] | join(" > ")),
  tier: $tier,
  tier_reason: $reason
}'
