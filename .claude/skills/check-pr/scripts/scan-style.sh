#!/usr/bin/env bash
# Scan a PR diff for common style issues without loading the full diff into context.
#
# Usage: scan-style.sh <pr_number>
# Output: JSON array of findings with file, line, category, and message.

set -euo pipefail

pr_number="${1:?Usage: scan-style.sh <pr_number>}"

findings='[]'

add_finding() {
  local file="$1" line="$2" category="$3" message="$4"
  findings=$(echo "$findings" | jq -c \
    --arg file "$file" --arg line "$line" --arg cat "$category" --arg msg "$message" \
    '. + [{file: $file, line: $line, category: $cat, message: $msg}]')
}

# Get only added lines from the diff (lines starting with +, excluding +++ headers)
diff_output=$(gh pr diff "$pr_number" 2>/dev/null) || { echo '[]'; exit 0; }

current_file=""
line_num=0

while IFS= read -r line; do
  # Track current file
  if [[ "$line" =~ ^\+\+\+\ b/(.*) ]]; then
    current_file="${BASH_REMATCH[1]}"
    continue
  fi

  # Track line numbers from @@ headers
  if [[ "$line" =~ ^@@.*\+([0-9]+) ]]; then
    line_num="${BASH_REMATCH[1]}"
    continue
  fi

  # Only check added lines
  if [[ "$line" =~ ^\+ ]] && [[ ! "$line" =~ ^\+\+\+ ]]; then
    content="${line:1}"

    # console.log / console.debug / console.warn left in
    if echo "$content" | grep -qE 'console\.(log|debug|warn|error)\('; then
      add_finding "$current_file" "$line_num" "debug" "console statement left in code"
    fi

    # eslint-disable or ts-ignore
    if echo "$content" | grep -qE 'eslint-disable|@ts-ignore|@ts-expect-error'; then
      add_finding "$current_file" "$line_num" "suppression" "lint/type suppression added"
    fi

    # Inline styles in JSX
    if echo "$content" | grep -qE 'style=\{' && [[ "$current_file" =~ \.(tsx|jsx)$ ]]; then
      add_finding "$current_file" "$line_num" "inline-style" "inline style in React component"
    fi

    # TODO/FIXME/HACK
    if echo "$content" | grep -qiE '(TODO|FIXME|HACK|XXX):?'; then
      add_finding "$current_file" "$line_num" "todo" "TODO/FIXME/HACK comment added"
    fi

    line_num=$((line_num + 1))
  elif [[ ! "$line" =~ ^- ]]; then
    line_num=$((line_num + 1))
  fi
done <<< "$diff_output"

# Check for large file changes
gh pr diff "$pr_number" --stat 2>/dev/null | while IFS= read -r stat_line; do
  if [[ "$stat_line" =~ ^[[:space:]]*(.+)\|[[:space:]]+([0-9]+) ]]; then
    file="${BASH_REMATCH[1]}"
    changes="${BASH_REMATCH[2]}"
    file=$(echo "$file" | xargs)
    if [ "$changes" -gt 500 ] 2>/dev/null; then
      add_finding "$file" "0" "large-change" "$changes lines changed in single file"
    fi
  fi
done

echo "$findings" | jq '.'
