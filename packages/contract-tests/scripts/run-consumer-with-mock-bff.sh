#!/bin/bash

#Run contract tests for a consumer package using the shared mock BFF harness.

# Resolve package root (this script lives in packages/contract-tests/scripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PACKAGE_ROOT/../.." && pwd)"

# Load shell helpers from src
HELPERS_SRC="$PACKAGE_ROOT/src/helpers/shell-helpers.sh"
if [[ -f "$HELPERS_SRC" ]]; then
  # shellcheck disable=SC1090
  source "$HELPERS_SRC"
else
  echo "❌ Could not find shell helpers in src/"
  exit 1
fi

CONSUMER_DIR="$(pwd)"
JEST_CONFIG=""
RESULTS_DIR=""
PACKAGE_NAME=""
WATCH_MODE=false
OPEN_REPORT=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -c|--consumer-dir)
      CONSUMER_DIR="$2"; shift 2;;
    -j|--jest-config)
      JEST_CONFIG="$2"; shift 2;;
    -r|--results-dir)
      RESULTS_DIR="$2"; shift 2;;
    -n|--package-name)
      PACKAGE_NAME="$2"; shift 2;;
    -w|--watch)
      WATCH_MODE=true; shift;;
    -o|--open)
      OPEN_REPORT=true; shift;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [options]"
      echo "This is an internal script - use odh-ct-bff-consumer instead"
      exit 2;;
  esac
done

# Normalize paths
CONSUMER_DIR="$(cd "$CONSUMER_DIR" && pwd)"

if [[ -z "$PACKAGE_NAME" ]]; then
  PACKAGE_NAME="$(basename "$CONSUMER_DIR")"
fi

# Determine default jest config if not provided
if [[ -z "$JEST_CONFIG" ]]; then
  if [[ -f "$CONSUMER_DIR/jest.contract.config.js" ]]; then
    JEST_CONFIG="$CONSUMER_DIR/jest.contract.config.js"
  else
    log_warning "No jest.contract.config.js found in $CONSUMER_DIR; Jest will use defaults"
  fi
fi

# Results directory (prefer injected env or flag to avoid duplicate timestamps)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
if [[ -z "${RESULTS_DIR:-}" ]]; then
  RESULTS_DIR="${CONTRACT_TEST_RESULTS_DIR:-}"
fi
if [[ -z "${RESULTS_DIR:-}" ]]; then
  RESULTS_DIR="$CONSUMER_DIR/contract-test-results/$TIMESTAMP"

  # Clean up old result directories (age-based pruning)
  if [[ -d "$CONSUMER_DIR/contract-test-results" ]]; then
    if cd "$CONSUMER_DIR/contract-test-results" 2>/dev/null; then
      # Remove directories older than 1 day, but exclude current run
      # Use find with -exec to safely remove old directories
      find . -mindepth 1 -maxdepth 1 -type d -mtime +1 ! -name "$TIMESTAMP" -exec rm -rf {} + 2>/dev/null || true
      cd - >/dev/null 2>&1 || true
    else
      log_warning "Could not access results directory for cleanup: $CONSUMER_DIR/contract-test-results"
    fi
  fi
fi
mkdir -p "$RESULTS_DIR"
RESULTS_DIR="$(cd "$RESULTS_DIR" && pwd)"

# Reporter env
export CONTRACT_TEST_RESULTS_DIR="$RESULTS_DIR"
export JEST_HTML_REPORTERS_PUBLIC_PATH="$RESULTS_DIR"
export JEST_HTML_REPORTERS_FILE_NAME="contract-test-report.html"
export JEST_HTML_REPORTERS_EXPAND=true
export JEST_HTML_REPORTERS_PAGE_TITLE="Contract Test Report"
export JEST_HTML_REPORTERS_HIDE_ICON=false
export JEST_HTML_REPORTERS_INCLUDE_FAILURE_MSG=true
export JEST_HTML_REPORTERS_INCLUDE_CONSOLE_LOG=true
export JEST_HTML_REPORTERS_INCLUDE_COVERAGE_REPORT=true
export JEST_HTML_REPORTERS_INLINE_SOURCE=true
export JEST_HTML_REPORTERS_DARK_THEME=false
export JEST_HTML_REPORTERS_USE_CSS_FILE=false
export JEST_HTML_REPORTERS_JSON=true
export PACKAGE_NAME="$PACKAGE_NAME"

# Ensure Node can resolve workspace-hoisted modules from repository root
export NODE_PATH="$REPO_ROOT/node_modules${NODE_PATH:+:$NODE_PATH}"

# Run tests
pushd "$CONSUMER_DIR" >/dev/null

CMD=(npx --yes jest)
if [[ -n "$JEST_CONFIG" ]]; then
  CMD+=(--config "$JEST_CONFIG")
fi
if [[ "$WATCH_MODE" == true ]]; then
  CMD+=(--watch)
fi

TEST_LOG="$RESULTS_DIR/contract-test-output.log"
log_info "Test output: $TEST_LOG"
set +e
"${CMD[@]}" 2>&1 | tee "$TEST_LOG"
EXIT_CODE=${PIPESTATUS[0]}
set -e

display_test_summary "$RESULTS_DIR"


popd >/dev/null
exit $EXIT_CODE


