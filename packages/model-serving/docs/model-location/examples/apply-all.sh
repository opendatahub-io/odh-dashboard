#!/bin/bash

# Apply all model location examples to a project
# Usage: ./apply-all.sh [namespace]
# If no namespace provided, uses current namespace

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NAMESPACE="${1:-$(oc project -q 2>/dev/null || echo "default")}"

echo "=== Applying model location examples to namespace: $NAMESPACE ==="
echo ""

# Apply PVCs first (they are referenced by deployments)
echo "--- Applying PVCs ---"
for file in "$SCRIPT_DIR"/pvcs/*.yaml; do
    if [ -f "$file" ]; then
        echo "Applying: $(basename "$file")"
        oc apply -n "$NAMESPACE" -f "$file"
    fi
done
echo ""

# Apply connections (they are referenced by deployments)
echo "--- Applying Connections ---"
for file in "$SCRIPT_DIR"/connections/*.yaml; do
    if [ -f "$file" ]; then
        echo "Applying: $(basename "$file")"
        oc apply -n "$NAMESPACE" -f "$file"
    fi
done
echo ""

# Apply InferenceService examples
echo "--- Applying InferenceService examples ---"
for file in "$SCRIPT_DIR"/inferenceservice/*.yaml; do
    if [ -f "$file" ]; then
        echo "Applying: $(basename "$file")"
        oc apply -n "$NAMESPACE" -f "$file"
    fi
done
echo ""

# Apply LLMInferenceService examples
echo "--- Applying LLMInferenceService examples ---"
for file in "$SCRIPT_DIR"/llminferenceservice/*.yaml; do
    if [ -f "$file" ]; then
        echo "Applying: $(basename "$file")"
        oc apply -n "$NAMESPACE" -f "$file"
    fi
done
echo ""

echo "=== Done! ==="
echo ""
echo "To list InferenceServices:"
echo "  oc get inferenceservices -n $NAMESPACE"
echo ""
echo "To list LLMInferenceServices:"
echo "  oc get llminferenceservices -n $NAMESPACE"
echo ""
echo "To delete all examples, run:"
echo "  ./delete-all.sh $NAMESPACE"
