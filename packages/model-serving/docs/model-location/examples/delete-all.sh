#!/bin/bash

# Delete all model location examples from a project
# Usage: ./delete-all.sh [namespace]
# If no namespace provided, uses current namespace

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="${1:-$(oc project -q 2>/dev/null || echo "default")}"

echo "=== Deleting model location examples from namespace: $NAMESPACE ==="
echo ""

# Delete deployments first (before connections they reference)
echo "--- Deleting InferenceService examples ---"
for file in "$SCRIPT_DIR"/inferenceservice/*.yaml; do
    if [ -f "$file" ]; then
        echo "Deleting: $(basename "$file")"
        oc delete -n "$NAMESPACE" -f "$file" --ignore-not-found
    fi
done
echo ""

echo "--- Deleting LLMInferenceService examples ---"
for file in "$SCRIPT_DIR"/llminferenceservice/*.yaml; do
    if [ -f "$file" ]; then
        echo "Deleting: $(basename "$file")"
        oc delete -n "$NAMESPACE" -f "$file" --ignore-not-found
    fi
done
echo ""

# Delete connections
echo "--- Deleting Connections ---"
for file in "$SCRIPT_DIR"/connections/*.yaml; do
    if [ -f "$file" ]; then
        echo "Deleting: $(basename "$file")"
        oc delete -n "$NAMESPACE" -f "$file" --ignore-not-found
    fi
done
echo ""

# Delete PVCs last
echo "--- Deleting PVCs ---"
for file in "$SCRIPT_DIR"/pvcs/*.yaml; do
    if [ -f "$file" ]; then
        echo "Deleting: $(basename "$file")"
        oc delete -n "$NAMESPACE" -f "$file" --ignore-not-found
    fi
done
echo ""

echo "=== Done! ==="
