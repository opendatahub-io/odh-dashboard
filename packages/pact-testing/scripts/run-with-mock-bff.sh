#!/bin/bash

# Source shared shell helpers
source "$(dirname "$0")/../dist/helpers/shell-helpers.sh"

# Set up variables
PACKAGE_ROOT="$(cd "$(dirname "$0")/.." || exit 1; pwd)"
PACT_DIR="$PACKAGE_ROOT/pact"
TEST_RUN_DIR="$PACT_DIR/pact-test-results/$(date +%Y%m%d_%H%M%S)"

# Create test results directory
mkdir -p "$TEST_RUN_DIR"

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
export PACKAGE_NAME="pact-testing"

# Run contract tests
TEST_EXIT_CODE=0
if ! npm run test:contract > "$TEST_RUN_DIR/contract-test-output.log" 2>&1; then
  TEST_EXIT_CODE=1
fi

# Display test summary
display_test_summary "$TEST_RUN_DIR"

# Open HTML report if not in CI
if [ -z "$CI" ]; then
  open_html_report "$TEST_RUN_DIR"
fi

exit $TEST_EXIT_CODE
