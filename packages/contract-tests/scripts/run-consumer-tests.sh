#!/bin/bash
set -euo pipefail

print_help() {
  cat <<'EOF'
Usage: run-consumer-tests.sh --consumer-dir <path> [--package-name <name>] [--results-dir <path>]

Runs Jest contract tests in the consumer directory with the shared preset.

Options:
  --consumer-dir <path>   Path to the consumer contract-tests directory
  --package-name <name>   Package label for reports (defaults to consumer dir name)
  --results-dir <path>    Results directory (defaults to consumer/contract-test-results/<timestamp>)
  -h, --help              Show this help
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

CONSUMER_DIR=""
PACKAGE_NAME=""
RESULTS_DIR=""

require_arg() {
  if [[ $# -lt 2 || -z "$2" || "$2" == -* ]]; then echo "Missing value for $1"; print_help; exit 2; fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --consumer-dir)
      require_arg "$1" "${2:-}"; CONSUMER_DIR="$2"; shift 2;;
    --package-name)
      require_arg "$1" "${2:-}"; PACKAGE_NAME="$2"; shift 2;;
    --results-dir)
      require_arg "$1" "${2:-}"; RESULTS_DIR="$2"; shift 2;;
    -h|--help)
      print_help; exit 0;;
    *) echo "Unknown option: $1"; print_help; exit 2;;
  esac
done

if [[ -z "$CONSUMER_DIR" ]]; then echo "--consumer-dir is required"; print_help; exit 2; fi
CONSUMER_DIR="$(cd "$CONSUMER_DIR" && pwd)"
if [[ -z "$PACKAGE_NAME" ]]; then PACKAGE_NAME="$(basename "$CONSUMER_DIR")"; fi

if [[ -z "$RESULTS_DIR" ]]; then
  TIMESTAMP=$(date +%Y%m%d_%H%M%S)
  RESULTS_DIR="$CONSUMER_DIR/contract-test-results/$TIMESTAMP"
fi
mkdir -p "$RESULTS_DIR"

export JEST_HTML_REPORTERS_PUBLIC_PATH="$RESULTS_DIR"
export JEST_HTML_REPORTERS_FILE_NAME="contract-test-report.html"
export JEST_HTML_REPORTERS_EXPAND=true
export JEST_HTML_REPORTERS_PAGE_TITLE="Contract Test Report"
export JEST_HTML_REPORTERS_JSON=true
export PACKAGE_NAME="$PACKAGE_NAME"
export CONTRACT_TEST_RESULTS_DIR="$RESULTS_DIR"
export CONTRACT_TEST_MODULE="$PACKAGE_NAME"

pushd "$CONSUMER_DIR" >/dev/null
JEST_PRESET="$PACKAGE_ROOT/jest.preset.js"
npx --yes jest --config "$JEST_PRESET" --colors
exit_code=$?
popd >/dev/null

exit "$exit_code"


