#!/usr/bin/env bash
# Build a Claude prompt for autofix or iteration mode.
# Usage: build-prompt.sh TICKET_KEY --mode autofix|iterate
# Reads: /tmp/issuetype.txt, /tmp/summary.txt, /tmp/description.txt, /tmp/comments.txt
# Reads (iterate only): /tmp/review_comments.txt, /tmp/ci_failures.txt
# Writes: .jira-ticket-context.md
# Outputs to GITHUB_OUTPUT: value (multiline prompt)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/common.sh"

ticket="${1:?Usage: build-prompt.sh TICKET_KEY --mode autofix|iterate}"
shift
mode=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode) mode="$2"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done
: "${mode:?--mode is required (autofix or iterate)}"

# Write context file from /tmp data
write_ticket_context "$ticket"

# Determine type-specific instruction
issue_type=$(cat /tmp/issuetype.txt)
case "$issue_type" in
  Bug)
    instruction="This is a bug report. Find the root cause and fix the bug. If an existing test suite covers this area, add a test that reproduces the issue. Do not create a new test suite if none exists."
    ;;
  Spike)
    if [[ "$mode" == "autofix" ]]; then
      instruction="This is a research spike. Investigate the topic and write your findings to a file called .jira-findings.md. Do NOT make any code changes."
    else
      instruction="Implement the changes as described."
    fi
    ;;
  *)
    instruction="This is a feature request / task. Implement the feature as described."
    ;;
esac

# Build prompt
{
  echo 'value<<PROMPT_EOF'

  if [[ "$mode" == "iterate" ]]; then
    echo "You are resolving Jira ticket ${ticket}. ${instruction}"
    echo ""
    echo "An automated fix was previously submitted as a pull request, but it received feedback that needs to be addressed. Your job is to produce an improved fix that addresses ALL of the feedback below."
    echo ""
    echo "Read the file .jira-ticket-context.md for the original ticket details."
    echo ""
    echo "INSTRUCTIONS:"
    echo "1. Read CLAUDE.md and/or AGENTS.md first if they exist."
    echo "2. If the feedback requires code changes, you MUST commit before finishing."
    echo "   If the feedback is minor or already addressed, it is OK to make no changes."
    echo "3. Commit message format:"
    echo "   Subject: ${ticket}: <short description>"
    echo "   Body: At least one sentence explaining the changes."
    echo "   Trailers:"
    echo "     Closes ${ticket}"
    echo "     Co-Authored-By: Claude <noreply@anthropic.com>"
    echo "4. Do NOT commit the .jira-ticket-context.md file."
    echo ""

    if [[ -f /tmp/review_comments.txt ]] && [[ -s /tmp/review_comments.txt ]]; then
      echo "--- Review Comments to Address ---"
      cat /tmp/review_comments.txt
      echo "Address every comment. If you cannot address one, explain why in a code comment."
      echo ""
    fi

    if [[ -f /tmp/ci_failures.txt ]] && [[ -s /tmp/ci_failures.txt ]]; then
      echo "--- CI Failures to Fix ---"
      cat /tmp/ci_failures.txt
      echo "Fix the issues that caused these failures."
      echo ""
    fi
  else
    echo "You are resolving Jira ticket ${ticket}. ${instruction}"
    echo ""
    echo "Read the file .jira-ticket-context.md in the repository root for full ticket details including description and comments."
    echo ""
    echo "INSTRUCTIONS:"
    echo "1. Read CLAUDE.md and/or AGENTS.md first if they exist in the repository."
    echo "2. You MUST produce a git commit before finishing. The working tree MUST be clean when done."
    echo "3. Commit message format:"
    echo "   Subject: ${ticket}: <short description>"
    echo "   Body: At least one sentence explaining the purpose and impact."
    echo "   Trailers (each on its own line):"
    echo "     Closes ${ticket}"
    echo "     Co-Authored-By: Claude <noreply@anthropic.com>"
    echo "4. Do NOT commit the .jira-ticket-context.md file."
    echo "5. Stage your changes and commit."
    echo "6. Verify the working tree is clean with 'git status'."
  fi

  echo 'PROMPT_EOF'
} >> "$GITHUB_OUTPUT"
