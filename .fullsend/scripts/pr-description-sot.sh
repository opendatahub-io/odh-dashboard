#!/usr/bin/env bash
# Shared required-heading list. Sourced by pre-review.sh (skip the agent)
# and post-review.sh (add findings if the agent ran anyway).
#
# Edit REQUIRED_PR_HEADINGS to change what the host enforces. Optional
# template sections (review criteria/checklists) are not listed.
REQUIRED_PR_HEADINGS=(
  "Description"
  "How Has This Been Tested?"
  "Test Impact"
)

# Print required headings that are missing or have no real content in $1.
# HTML comments and placeholders (N/A, none, TBD, TODO) do not count.
sot_missing_headings() {
  local body="${1:-}"
  local py
  py="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/pr-description-sot.py"
  printf '%s' "${body}" | python3 "${py}" "${REQUIRED_PR_HEADINGS[@]}"
}
