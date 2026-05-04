#!/usr/bin/env bash
# Prompts for a Jira ticket key to provide feature context for the RBAC review.
# If a key is provided, outputs it for the agent to fetch via MCP.
# If skipped (empty input), exits silently.

set -euo pipefail

>&2 printf "Enter the Jira ticket key for the feature being reviewed (e.g. RHOAIENG-12345).\n"
>&2 printf "This helps identify which resources/operations need RBAC gates.\n"
>&2 printf "Press Enter to skip: "

read -r TICKET_KEY

if [[ -z "$TICKET_KEY" ]]; then
  exit 0
fi

# Validate format
if [[ ! "$TICKET_KEY" =~ ^[A-Z][A-Z0-9_]+-[0-9]+$ ]]; then
  >&2 printf "Warning: '%s' doesn't look like a valid Jira key (expected FORMAT-123). Proceeding anyway.\n" "$TICKET_KEY"
fi

cat <<EOF
---
jira_ticket: $TICKET_KEY
instruction: Use the jira_get_issue MCP tool (server: user-atlassian) to fetch this issue.
             Extract the summary, description, and labels. From the description, identify:
             - Which K8s resources (CRDs, ConfigMaps, Secrets, etc.) the feature touches
             - Which API groups and verbs are involved
             - Which user types should have access vs be denied
             Build an expected permission model from this context.
---
EOF
