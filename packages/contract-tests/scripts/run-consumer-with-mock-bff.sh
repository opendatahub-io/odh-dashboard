#!/bin/bash

# Strict mode for safety
set -euo pipefail

print_help() {
  cat <<'EOF'
Usage: odh-contract-tests [options]

Run contract tests for a consumer package using the shared mock BFF harness.

Options:
  -c, --consumer-dir <path>   Consumer contract-tests directory (default: CWD)
  -j, --jest-config <path>    Path to consumer jest.contract.config.js (optional)
  -r, --results-dir <path>    Directory to write results (default: <consumer>/contract-test-results/<ts>)
  -n, --package-name <name>   Package name for report metadata (default: consumer dir name)
  -w, --watch                 Run in watch mode
  -h, --help                  Show this help

Examples:
  odh-contract-tests -c packages/model-registry/contract-tests
  odh-contract-tests -c packages/model-registry/contract-tests -w
EOF
}

# Resolve package root (this script lives in packages/contract-tests/scripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PACKAGE_ROOT/../.." && pwd)"

# Load shell helpers from dist or src
HELPERS_DIST="$PACKAGE_ROOT/dist/helpers/shell-helpers.sh"
HELPERS_SRC="$PACKAGE_ROOT/src/helpers/shell-helpers.sh"
if [[ -f "$HELPERS_DIST" ]]; then
  # shellcheck disable=SC1090
  source "$HELPERS_DIST"
elif [[ -f "$HELPERS_SRC" ]]; then
  # shellcheck disable=SC1090
  source "$HELPERS_SRC"
else
  echo "❌ Could not find shell helpers in dist/ or src/"
  echo "💡 Try building the package first: npm -w packages/contract-tests run build"
  exit 1
fi

CONSUMER_DIR="$(pwd)"
JEST_CONFIG=""
RESULTS_DIR=""
PACKAGE_NAME=""
WATCH_MODE=false

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
    -h|--help)
      print_help; exit 0;;
    *)
      echo "Unknown option: $1"; print_help; exit 2;;
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

if [[ "${CI:-}" != "true" ]]; then
  if ! open_html_report "$RESULTS_DIR" 2>/dev/null; then
    log_warning "Could not open HTML report in browser"
  fi
fi

popd >/dev/null
exit $EXIT_CODE


