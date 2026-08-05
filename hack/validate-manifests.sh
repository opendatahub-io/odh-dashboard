#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

FAILED=0

# --- Kustomize build validation ---
TARGETS=(
  manifests/odh
  manifests/rhoai
  manifests/odh/standalone
  manifests/rhoai/standalone
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

# --- params.env sync check ---
echo ""
echo "=== params.env sync check ==="
PARENT="manifests/sidecar/params.env"
if [[ ! -f "$PARENT" ]]; then
  echo "  ERROR: Parent params.env not found at $PARENT"
  FAILED=1
else
  for module_params in manifests/modules/*/params.env; do
    [[ -f "$module_params" ]] || continue
    MODULE_DIR=$(dirname "$module_params")
    MODULE_NAME=$(basename "$MODULE_DIR")

    DRIFT=0
    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ "$line" =~ ^#.* || -z "$line" ]] && continue
      key="${line%%=*}"
      value="${line#*=}"

      parent_line=$(grep "^${key}=" "$PARENT" 2>/dev/null || true)
      [[ -n "$parent_line" ]] || continue

      parent_value="${parent_line#*=}"
      if [[ "$value" != "$parent_value" ]]; then
        if [[ "$DRIFT" -eq 0 ]]; then
          echo "  DRIFT in ${MODULE_NAME}/params.env:"
          DRIFT=1
        fi
        echo "    key '${key}': module='${value}' parent='${parent_value}'"
        FAILED=1
      fi
    done < "$module_params"

    if [[ "$DRIFT" -eq 0 ]]; then
      printf "  %-35s%s\n" "$MODULE_NAME" "OK"
    fi
  done
fi

echo ""
if [[ "$FAILED" -eq 1 ]]; then
  echo "VALIDATION FAILED"
  exit 1
fi
echo "ALL CHECKS PASSED"
