#!/bin/bash

set -euo pipefail

print_help() {
  cat <<'EOF'
Usage: run-go-bff-consumer.sh --bff-dir <path> [--consumer-dir <path>] [--package-name <name>]

Starts a Go BFF in mock mode, waits for readiness, then runs contract
tests for the consumer directory using the shared Jest harness.

Options:
  --bff-dir <path>         Path to the Go BFF project (with Makefile/setup-envtest)
  --consumer-dir <path>    Path to the consumer contract-tests directory (defaults to 'contract-tests')
  --package-name <name>    Package label for reports (defaults to consumer dir name)
  -h, --help               Show this help
EOF
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load shell helpers from dist or src. If not found (e.g., script executed via temp symlink),
# try resolving from repository root via git and fallback to workspace path.
HELPERS_DIST="$PACKAGE_ROOT/dist/helpers/shell-helpers.sh"
HELPERS_SRC="$PACKAGE_ROOT/src/helpers/shell-helpers.sh"
if [[ -f "$HELPERS_DIST" ]]; then
  # shellcheck disable=SC1090
  source "$HELPERS_DIST"
elif [[ -f "$HELPERS_SRC" ]]; then
  # shellcheck disable=SC1090
  source "$HELPERS_SRC"
else
  # Attempt to resolve repo root and retry
  if REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null); then
    ALT_PACKAGE_ROOT="$REPO_ROOT/packages/contract-tests"
    ALT_HELPERS_DIST="$ALT_PACKAGE_ROOT/dist/helpers/shell-helpers.sh"
    ALT_HELPERS_SRC="$ALT_PACKAGE_ROOT/src/helpers/shell-helpers.sh"
    if [[ -f "$ALT_HELPERS_DIST" ]]; then
      # shellcheck disable=SC1090
      source "$ALT_HELPERS_DIST"
    elif [[ -f "$ALT_HELPERS_SRC" ]]; then
      # shellcheck disable=SC1090
      source "$ALT_HELPERS_SRC"
    else
      echo "❌ Could not find shell helpers in dist/ or src/"
      exit 1
    fi
    PACKAGE_ROOT="$ALT_PACKAGE_ROOT"
  else
    echo "❌ Could not find shell helpers in dist/ or src/"
    exit 1
  fi
fi

BFF_DIR=""
CONSUMER_DIR=""
PACKAGE_NAME=""
PORT=""

require_arg() {
  if [[ $# -lt 2 || -z "$2" || "$2" == -* ]]; then
    echo "Missing value for $1"
    print_help
    exit 2
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bff-dir)
      require_arg "$1" "${2:-}"
      BFF_DIR="$2"; shift 2;;
    --consumer-dir)
      require_arg "$1" "${2:-}"
      CONSUMER_DIR="$2"; shift 2;;
    --package-name)
      require_arg "$1" "${2:-}"
      PACKAGE_NAME="$2"; shift 2;;
    -h|--help)
      print_help; exit 0;;
    *)
      echo "Unknown option: $1"; print_help; exit 2;;
  esac
done

if [[ -z "$BFF_DIR" ]]; then
  echo "--bff-dir is required"
  print_help
  exit 2
fi

# Set default consumer-dir if not provided
if [[ -z "$CONSUMER_DIR" ]]; then
  CONSUMER_DIR="contract-tests"
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
export CONTRACT_TEST_RESULTS_DIR="$RESULTS_DIR"
export CONTRACT_TEST_MODULE="$PACKAGE_NAME"

# Ensure Go is present
if ! command -v go >/dev/null 2>&1; then
  log_error "Go is not installed or not in PATH"
  exit 1
fi
log_success "Go found: $(go version)"

log_info "Starting Mock BFF server..."
pushd "$BFF_DIR" >/dev/null

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

BFF_LOG_FILE="$RESULTS_DIR/bff.log"
# Use dynamic port to avoid conflicts in parallel execution
if [[ -z "$PORT" ]]; then
  # Find an available port starting from 8080
  PORT=8080
  while lsof -i :$PORT >/dev/null 2>&1; do
    PORT=$((PORT + 1))
  done
fi

log_info "Starting Mock BFF server on port $PORT..."

# Check if pre-built binary exists (from CI cache), otherwise use go run
if [[ -f "./bff-mock" && -x "./bff-mock" ]]; then
  log_info "Using cached BFF binary"
  ./bff-mock --mock-k8s-client --mock-mr-client --port "$PORT" --allowed-origins="*" > "$BFF_LOG_FILE" 2>&1 &
else
  log_info "No cached binary found, using go run"
  go run ./cmd --mock-k8s-client --mock-mr-client --port "$PORT" --allowed-origins="*" > "$BFF_LOG_FILE" 2>&1 &
fi

BFF_PID=$!
echo "$BFF_PID" > "$RESULTS_DIR/bff.pid"
log_info "Mock BFF started (PID: $BFF_PID)"
log_info "BFF logs: $BFF_LOG_FILE"
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
  if curl -s -f "http://localhost:$PORT/healthcheck" >/dev/null 2>&1; then
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

# If loop finished without success, fail explicitly
if ! curl -s -f "http://localhost:$PORT/healthcheck" >/dev/null 2>&1; then
  log_error "Timed out waiting for Mock BFF to become ready"
  log_error "BFF logs (tail):"
  tail -n 200 "$BFF_LOG_FILE" || true
  exit 1
fi

export CONTRACT_MOCK_BFF_URL="http://localhost:$PORT"

# Use shared CLI to run consumer tests
log_info "Running contract tests against Mock BFF..."
CONSUMER_RUNNER="$PACKAGE_ROOT/scripts/run-consumer-with-mock-bff.sh"
"$CONSUMER_RUNNER" -c "$CONSUMER_DIR" -n "$PACKAGE_NAME" -r "$RESULTS_DIR" -j "$PACKAGE_ROOT/jest.preset.js"
exit_code=$?

# Display test summary and open coverage report
display_test_summary "$RESULTS_DIR"

if [[ "${CI:-}" != "true" && "${CONTRACT_TEST_OPEN_REPORT:-}" == "true" ]]; then
  if ! open_html_report "$RESULTS_DIR" 2>/dev/null; then
    log_warning "Could not open HTML coverage report in browser"
  fi
fi

exit "$exit_code"


