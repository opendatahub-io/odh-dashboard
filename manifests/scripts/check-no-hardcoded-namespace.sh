#!/usr/bin/env bash
set -euo pipefail

MANIFEST_DIR="${1:-manifests}"

violations=0

while IFS= read -r -d '' file; do
  rel="${file#./}"

  matches=$(yq eval-all \
    'select(.apiVersion != null and .kind != null and .metadata.namespace != null and .metadata.namespace != "") | .kind + "/" + .metadata.name + " has metadata.namespace=\"" + .metadata.namespace + "\""' \
    "$file" 2>/dev/null || true)

  if [[ -n "$matches" ]]; then
    while IFS= read -r line; do
      echo "ERROR: $rel: $line"
      ((violations++))
    done <<< "$matches"
  fi
done < <(find "$MANIFEST_DIR" \( -name '*.yaml' -o -name '*.yml' \) -print | \
  grep -v '/kustomization\.yaml$' | \
  grep -v '/crd/' | \
  sort | \
  tr '\n' '\0')

if (( violations > 0 )); then
  echo ""
  echo "FAIL: Found $violations resource(s) with hardcoded metadata.namespace."
  echo "The operator injects namespace at deploy time via kustomize.WithNamespace()."
  echo "Remove the metadata.namespace field from these resources."
  exit 1
fi

echo "PASS: No hardcoded metadata.namespace found in manifest resources."
