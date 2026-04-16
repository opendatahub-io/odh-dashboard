#!/usr/bin/env bash
# Query Jira for new or review tickets and output a GitHub Actions matrix.
# Usage: fetch-tickets.sh --new|--review
# Env: JIRA_EMAIL, JIRA_API_TOKEN, JIRA_BASE_URL, JIRA_PROJECT, LABEL_*, MANUAL_TICKETS (optional)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

mode="${1:?Usage: fetch-tickets.sh --new|--review}"

if [[ "$mode" == "--new" ]] && [[ -n "${MANUAL_TICKETS:-}" ]]; then
  matrix=$(echo "$MANUAL_TICKETS" | tr ',' '\n' | \
    jq -R '{key: .}' | jq -sc '{include: .}')
  echo "matrix=$matrix" >> "$GITHUB_OUTPUT"
  echo "has_tickets=true" >> "$GITHUB_OUTPUT"
  exit 0
fi

if [[ "$mode" == "--new" ]]; then
  jql="project = ${JIRA_PROJECT} \
    AND labels = \"${LABEL_TRIGGER}\" \
    AND labels not in (\"${LABEL_PENDING}\", \"${LABEL_DONE}\", \"${LABEL_NEEDS_INFO}\", \"${LABEL_REVIEW}\") \
    AND status != Closed"
elif [[ "$mode" == "--review" ]]; then
  jql="project = ${JIRA_PROJECT} \
    AND labels = \"${LABEL_REVIEW}\" \
    AND status != Closed"
else
  echo "Unknown mode: $mode" >&2
  exit 1
fi

response=$(jira_search "$jql")
count=$(echo "$response" | jq '.total')
echo "Found $count ${mode#--} ticket(s)"

if [[ "$count" -eq 0 ]]; then
  echo "has_tickets=false" >> "$GITHUB_OUTPUT"
  echo 'matrix={"include":[]}' >> "$GITHUB_OUTPUT"
  exit 0
fi

matrix=$(echo "$response" | jq -c '{include: [.issues[] | {key: .key}]}')
echo "matrix=$matrix" >> "$GITHUB_OUTPUT"
echo "has_tickets=true" >> "$GITHUB_OUTPUT"
