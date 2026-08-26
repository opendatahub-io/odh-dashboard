#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

FAILED=0

# --- Kustomize build validation ---
TARGETS=(
  manifests/odh
  manifests/rhoai
  manifests/modules
)

echo "=== Kustomize build validation ==="
for target in "${TARGETS[@]}"; do
  printf "  %-35s" "$target"
  if kustomize build "$target" > /dev/null 2>&1; then
    echo "OK"
  else
    echo "FAIL"
    kustomize build "$target" > /dev/null || true
    FAILED=1
  fi
done

echo ""
if [[ "$FAILED" -eq 1 ]]; then
  echo "VALIDATION FAILED"
  exit 1
fi
echo "ALL CHECKS PASSED"
