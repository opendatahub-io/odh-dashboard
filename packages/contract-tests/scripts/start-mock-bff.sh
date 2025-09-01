#!/bin/bash

set -euo pipefail

print_help() {
  cat <<'EOF'
Usage: start-mock-bff.sh --bff-dir <path> [--port <number>]

Builds and starts a Go BFF in mock mode and waits for readiness.

Options:
  --bff-dir <path>   Path to the Go BFF project (with Makefile/setup-envtest)
  --port <number>    Port to run the BFF on (default: 8080)
  -h, --help         Show this help
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
fi

BFF_DIR=""
PORT="8080"

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
    --port)
      require_arg "$1" "${2:-}"
      PORT="$2"; shift 2;;
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

BFF_DIR="$(cd "$BFF_DIR" && pwd)"

if ! command -v go >/dev/null 2>&1; then
  echo "❌ Go is not installed or not in PATH"
  exit 1
fi

pushd "$BFF_DIR" >/dev/null
log_info "Building Mock BFF server..."
go build -o bff-mock ./cmd
log_success "BFF server built successfully"

# Provision envtest assets if setup helper missing (best effort)
if [[ -z "${KUBEBUILDER_ASSETS:-}" && -x ./bin/setup-envtest-release-0.17 ]]; then
  ASSETS_PATH=$(./bin/setup-envtest-release-0.17 use 1.29.0 --print path || true)
  if [[ -n "$ASSETS_PATH" ]]; then
    export KUBEBUILDER_ASSETS="$ASSETS_PATH"
  fi
fi

BFF_LOG_FILE="${BFF_DIR}/bff-mock.log"
log_info "Starting Mock BFF server on port ${PORT}..."
./bff-mock --mock-k8s-client --mock-mr-client --port "$PORT" > "$BFF_LOG_FILE" 2>&1 &
BFF_PID=$!
echo "$BFF_PID" > "$BFF_DIR/bff.pid"
log_success "Mock BFF started (PID: $BFF_PID) logs: $BFF_LOG_FILE"
popd >/dev/null

# Wait for readiness
for i in $(seq 1 30); do
  if curl -s -f "http://localhost:${PORT}/healthcheck" >/dev/null 2>&1; then
    log_success "Mock BFF is ready on http://localhost:${PORT}"
    break
  fi
  if ! kill -0 "$BFF_PID" 2>/dev/null; then
    log_error "BFF process died early. Logs:"; tail -n 200 "$BFF_LOG_FILE" || true; exit 1
  fi
  sleep 1
done

if ! curl -s -f "http://localhost:${PORT}/healthcheck" >/dev/null 2>&1; then
  log_error "Timed out waiting for Mock BFF to become ready"; tail -n 200 "$BFF_LOG_FILE" || true; exit 1
fi

export CONTRACT_MOCK_BFF_URL="http://localhost:${PORT}"
echo "$CONTRACT_MOCK_BFF_URL" > "$BFF_DIR/bff.url"
log_info "CONTRACT_MOCK_BFF_URL=$CONTRACT_MOCK_BFF_URL"

exit 0


