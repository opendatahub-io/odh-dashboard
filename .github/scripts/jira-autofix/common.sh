#!/usr/bin/env bash
# Shared helpers for jira-autofix scripts.
# Source this file; requires JIRA_EMAIL, JIRA_API_TOKEN, JIRA_BASE_URL env vars.

set -euo pipefail

jira_comment() {
  local ticket="$1" body="$2"
  curl -sf \
    -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
    -H "Content-Type: application/json" \
    -X POST "$JIRA_BASE_URL/rest/api/2/issue/$ticket/comment" \
    -d "$(jq -n --arg body "$body" '{body: $body}')"
}

jira_labels() {
  local ticket="$1" add="$2" remove="${3:-}"
  local payload
  if [[ -n "$remove" ]]; then
    payload="{\"update\":{\"labels\":[{\"add\":\"${add}\"},{\"remove\":\"${remove}\"}]}}"
  else
    payload="{\"update\":{\"labels\":[{\"add\":\"${add}\"}]}}"
  fi
  curl -sf \
    -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
    -H "Content-Type: application/json" \
    -X PUT "$JIRA_BASE_URL/rest/api/2/issue/$ticket" \
    -d "$payload"
}

jira_search() {
  local jql="$1"
  curl -sf \
    -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
    -H "Content-Type: application/json" \
    "$JIRA_BASE_URL/rest/api/2/search" \
    -G --data-urlencode "jql=$jql" \
    --data-urlencode "fields=key" \
    --data-urlencode "maxResults=10"
}

jira_get_ticket() {
  local ticket="$1"
  curl -sf \
    -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
    -H "Content-Type: application/json" \
    "$JIRA_BASE_URL/rest/api/2/issue/$ticket" \
    -G --data-urlencode "fields=summary,description,issuetype,comment"
}

# Parse ticket JSON response into /tmp files
parse_ticket_response() {
  local response="$1"
  echo "$response" | jq -r '.fields.summary' > /tmp/summary.txt
  echo "$response" | jq -r '.fields.description // "No description provided"' > /tmp/description.txt
  echo "$response" | jq -r '.fields.issuetype.name' > /tmp/issuetype.txt
  echo "$response" | jq -r '
    [.fields.comment.comments[]
     | select(.author.emailAddress // "" | test("@redhat\\.com$"; "i"))
     | "[\(.author.displayName)]: \(.body)"]
    | join("\n---\n")' > /tmp/comments.txt
}

# Write .jira-ticket-context.md from /tmp files
write_ticket_context() {
  local ticket="$1"
  {
    echo "# ${ticket}: $(cat /tmp/summary.txt)"
    echo ""
    echo "## Issue Type"
    cat /tmp/issuetype.txt
    echo ""
    echo "## Description"
    cat /tmp/description.txt
    echo ""
    echo "## Comments (Red Hat employees only)"
    cat /tmp/comments.txt
  } > .jira-ticket-context.md
}
