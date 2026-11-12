#!/usr/bin/env bash
set -euo pipefail

for tool in git jq; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "App-config tests require '$tool' for subtree integration checks. See docs/dev-setup.md (Test prerequisites)." >&2
    exit 1
  fi
done

jest --silent "$@"
node --test "$(dirname "$0")/package-subtree-files.integration.cjs"
