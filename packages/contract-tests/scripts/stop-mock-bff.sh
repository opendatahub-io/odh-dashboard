#!/bin/bash
set -euo pipefail

print_help() {
  cat <<'EOF'
Usage: stop-mock-bff.sh --bff-dir <path>

Stops a previously started Mock BFF process.

Options:
  --bff-dir <path>   Path to the Go BFF project used by start-mock-bff.sh
  -h, --help         Show this help
EOF
}

BFF_DIR=""

require_arg() {
  if [[ $# -lt 2 || -z "$2" || "$2" == -* ]]; then
    echo "Missing value for $1"; print_help; exit 2
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --bff-dir)
      require_arg "$1" "${2:-}"; BFF_DIR="$2"; shift 2;;
    -h|--help)
      print_help; exit 0;;
    *)
      echo "Unknown option: $1"; print_help; exit 2;;
  esac
done

if [[ -z "$BFF_DIR" ]]; then echo "--bff-dir is required"; print_help; exit 2; fi
BFF_DIR="$(cd "$BFF_DIR" && pwd)"

PID_FILE="$BFF_DIR/bff.pid"
if [[ -f "$PID_FILE" ]]; then
  BFF_PID=$(cat "$PID_FILE" || true)
  if [[ -n "${BFF_PID:-}" ]] && kill -0 "$BFF_PID" 2>/dev/null; then
    kill "$BFF_PID" 2>/dev/null || true
    sleep 2
    kill -9 "$BFF_PID" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

exit 0


