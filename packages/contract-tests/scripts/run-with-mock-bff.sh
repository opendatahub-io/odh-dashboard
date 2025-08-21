#!/bin/bash

# Enable strict mode
set -euo pipefail

# Resolve script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Try dist helpers first, then fall back to src
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
    echo "💡 Try building the package first"
    exit 1
fi

# Set up variables
CONTRACT_DIR="$PACKAGE_ROOT/contract-tests"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEST_RUN_DIR="$CONTRACT_DIR/contract-test-results/$TIMESTAMP"

# Create test results directory
mkdir -p "$TEST_RUN_DIR"

# Ensure TEST_RUN_DIR is absolute
TEST_RUN_DIR="$(cd "$TEST_RUN_DIR" && pwd)"

# Export environment variables for Jest HTML Reporter
export JEST_HTML_REPORTERS_PUBLIC_PATH="$TEST_RUN_DIR"
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
export PACKAGE_NAME="contract-testing"

# Run contract tests
TEST_EXIT_CODE=0
if ! npm run test:contract > "$TEST_RUN_DIR/contract-test-output.log" 2>&1; then
  TEST_EXIT_CODE=1
fi

# Display test summary
display_test_summary "$TEST_RUN_DIR"

# Open HTML report if not in CI
if [[ "${CI:-}" != "true" ]]; then
  if ! open_html_report "$TEST_RUN_DIR" 2>/dev/null; then
    log_warning "Could not open HTML report in browser"
  fi
fi

exit $TEST_EXIT_CODE