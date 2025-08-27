#!/bin/bash
set -euo pipefail

# Resolve script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

RESULTS_DIR="${CONTRACT_TEST_RESULTS_DIR:-$PWD/contract-tests/contract-test-results/latest}"
GEN_TS="$PKG_ROOT/src/reporting/generate-html-report.ts"

if [[ ! -f "$GEN_TS" ]]; then
  echo "Report generator not found: $GEN_TS" >&2
  exit 1
fi

export CONTRACT_TEST_RESULTS_DIR="$RESULTS_DIR"

node --loader ts-node/esm "$GEN_TS"

