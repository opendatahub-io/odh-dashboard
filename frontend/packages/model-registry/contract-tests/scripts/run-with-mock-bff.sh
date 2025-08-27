#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}" )" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
REPO_ROOT="$(cd "$PACKAGE_ROOT/../../.." && pwd)"

"$REPO_ROOT/packages/contract-tests/scripts/run-go-bff-consumer.sh" \
  --bff-dir "$PACKAGE_ROOT/upstream/bff" \
  --consumer-dir "$PACKAGE_ROOT/contract-tests" \
  --package-name "model-registry"