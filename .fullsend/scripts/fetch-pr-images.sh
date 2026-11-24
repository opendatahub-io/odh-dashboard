#!/usr/bin/env bash
# Capture images attached to the PR body for the review
# sandbox. Host-side only: REVIEW_TOKEN stays here, never in the sandbox.
#
# Fails open. See fetch_pr_images.py for the allowlist and limits.
set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v python3 >/dev/null 2>&1; then
  echo "::warning::PR image capture skipped: python3 is unavailable"
  exit 0
fi

exec python3 "${_SCRIPT_DIR}/fetch_pr_images.py" "$@"
