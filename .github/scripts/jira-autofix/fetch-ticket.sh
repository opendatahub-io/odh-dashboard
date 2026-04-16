#!/usr/bin/env bash
# Fetch a single ticket's details from Jira.
# Usage: fetch-ticket.sh TICKET_KEY
# Writes: /tmp/summary.txt, /tmp/description.txt, /tmp/issuetype.txt, /tmp/comments.txt
# Outputs to GITHUB_OUTPUT: summary, issue_type

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

ticket="${1:?Usage: fetch-ticket.sh TICKET_KEY}"

response=$(jira_get_ticket "$ticket")
parse_ticket_response "$response"

echo "summary=$(cat /tmp/summary.txt)" >> "$GITHUB_OUTPUT"
echo "issue_type=$(cat /tmp/issuetype.txt)" >> "$GITHUB_OUTPUT"
