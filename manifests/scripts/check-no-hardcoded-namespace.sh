#!/usr/bin/env bash
set -euo pipefail

MANIFEST_DIR="${1:-manifests}"

if [[ ! -d "$MANIFEST_DIR" ]]; then
  printf 'ERROR: manifest directory %s does not exist\n' "$MANIFEST_DIR" >&2
  exit 2
fi

violations=0

while IFS= read -r -d '' file; do
  rel="${file#./}"

  if ! matches=$(yq eval-all \
    'select(tag == "!!map") | select(.apiVersion != null and .kind != null and .metadata.namespace != null and .metadata.namespace != "") | .kind + "/" + .metadata.name + " has metadata.namespace=\"" + .metadata.namespace + "\""' \
    "$file"); then
    printf 'ERROR: failed to inspect %s\n' "$rel" >&2
    exit 2
  fi

  if [[ -n "$matches" ]]; then
    while IFS= read -r line; do
      echo "ERROR: $rel: $line"
      ((++violations))
    done <<< "$matches"
  fi
done < <(find "$MANIFEST_DIR" \( -name '*.yaml' -o -name '*.yml' \) \
  -not -path '*/kustomization.yaml' \
  -not -path '*/crd/*' \
  -print0 | sort -z)

if (( violations > 0 )); then
  echo ""
  echo "FAIL: Found $violations resource(s) with hardcoded metadata.namespace."
  echo "The operator injects namespace at deploy time via kustomize.WithNamespace()."
  echo "Remove the metadata.namespace field from these resources."
  exit 1
fi

echo "PASS: No hardcoded metadata.namespace found in manifest resources."
