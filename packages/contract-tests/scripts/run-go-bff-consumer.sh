#!/bin/bash

set -euo pipefail

print_help() {
  cat <<'EOF'
Usage: run-go-bff-consumer.sh --bff-dir <path> --consumer-dir <path> [--package-name <name>]

Builds and starts a Go BFF in mock mode, waits for readiness, then runs contract
tests for the consumer directory using the shared Jest harness.

Options:
  --bff-dir <path>         Path to the Go BFF project (with Makefile/setup-envtest)
  --consumer-dir <path>    Path to the consumer contract-tests directory
  --package-name <name>    Package label for reports (defaults to consumer dir name)
  -h, --help               Show this help
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

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
  exit 1
fi

BFF_DIR=""
CONSUMER_DIR=""
PACKAGE_NAME=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bff-dir)
      BFF_DIR="$2"; shift 2;;
    --consumer-dir)
      CONSUMER_DIR="$2"; shift 2;;
    --package-name)
      PACKAGE_NAME="$2"; shift 2;;
    -h|--help)
      print_help; exit 0;;
    *)
      echo "Unknown option: $1"; print_help; exit 2;;
  esac
done

if [[ -z "$BFF_DIR" || -z "$CONSUMER_DIR" ]]; then
  echo "--bff-dir and --consumer-dir are required"
  print_help
  exit 2
fi

BFF_DIR="$(cd "$BFF_DIR" && pwd)"
CONSUMER_DIR="$(cd "$CONSUMER_DIR" && pwd)"
if [[ -z "$PACKAGE_NAME" ]]; then
  PACKAGE_NAME="$(basename "$CONSUMER_DIR")"
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="$CONSUMER_DIR/contract-test-results/$TIMESTAMP"
mkdir -p "$RESULTS_DIR"

export JEST_HTML_REPORTERS_PUBLIC_PATH="$RESULTS_DIR"
export JEST_HTML_REPORTERS_FILE_NAME="contract-test-report.html"
export JEST_HTML_REPORTERS_EXPAND=true
export JEST_HTML_REPORTERS_PAGE_TITLE="Contract Test Report"
export JEST_HTML_REPORTERS_JSON=true
export PACKAGE_NAME="$PACKAGE_NAME"

# Ensure Go is present
if ! command -v go >/dev/null 2>&1; then
  log_error "Go is not installed or not in PATH"
  exit 1
fi
log_success "Go found: $(go version)"

log_info "Building Mock BFF server..."
pushd "$BFF_DIR" >/dev/null
if ! go build -o bff-mock ./cmd; then
  log_error "Failed to build BFF server"
  exit 1
fi

# Provision envtest assets if setup helper missing
if [[ -z "${KUBEBUILDER_ASSETS:-}" ]]; then
  if [[ ! -x ./bin/setup-envtest-release-0.17 ]]; then
    if command -v make >/dev/null 2>&1; then
      log_info "setup-envtest missing; attempting to provision via 'make envtest'"
      if make envtest; then
        :
      else
        log_warning "make envtest failed; proceeding without KUBEBUILDER_ASSETS"
      fi
    fi
  fi
  if [[ -x ./bin/setup-envtest-release-0.17 ]]; then
    ASSETS_PATH=$(./bin/setup-envtest-release-0.17 use 1.29.0 --print path || true)
    if [[ -n "$ASSETS_PATH" ]]; then
      export KUBEBUILDER_ASSETS="$ASSETS_PATH"
      log_info "Setting KUBEBUILDER_ASSETS to: $KUBEBUILDER_ASSETS"
    else
      log_warning "setup-envtest did not return assets path; continuing without KUBEBUILDER_ASSETS"
    fi
  else
    log_warning "setup-envtest binary not found; continuing without KUBEBUILDER_ASSETS"
  fi
fi

BFF_LOG_FILE="$RESULTS_DIR/bff-mock.log"
log_info "Starting Mock BFF server on port 8080..."
./bff-mock --mock-k8s-client --mock-mr-client --port 8080 > "$BFF_LOG_FILE" 2>&1 &
BFF_PID=$!
popd >/dev/null

cleanup() {
  if kill -0 "$BFF_PID" 2>/dev/null; then
    log_info "Stopping Mock BFF server (PID: $BFF_PID)"
    kill "$BFF_PID" 2>/dev/null || true
    sleep 2
    kill -9 "$BFF_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Wait for healthcheck
log_info "Waiting for Mock BFF to be ready..."
for i in $(seq 1 30); do
  if curl -s -f "http://localhost:8080/healthcheck" >/dev/null 2>&1; then
    log_success "Mock BFF is ready!"
    break
  fi
  if ! kill -0 "$BFF_PID" 2>/dev/null; then
    log_error "BFF process died early. Logs:"
    cat "$BFF_LOG_FILE" || true
    exit 1
  fi
  sleep 1
done

export CONTRACT_MOCK_BFF_URL="http://localhost:8080"

# Use shared CLI to run consumer tests
log_info "Running consumer contract tests..."
"$PACKAGE_ROOT/scripts/run-consumer-with-mock-bff.sh" -c "$CONSUMER_DIR" -n "$PACKAGE_NAME" || exit $?

display_test_summary "$RESULTS_DIR"

if [[ "${CI:-}" != "true" ]]; then
  open_html_report "$RESULTS_DIR" 2>/dev/null || true
fi

complete_test_summary "$PACKAGE_NAME" "$RESULTS_DIR"


