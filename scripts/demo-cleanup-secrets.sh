#!/usr/bin/env bash
set -euo pipefail

NS="${1:-model-serving}"

echo "Cleaning up demo secrets in namespace: $NS"
oc delete secret -n "$NS" -l demo-seed=existing-secret-test --ignore-not-found
oc delete secret demo-db-credentials demo-api-config demo-connection-filtered -n "$NS" --ignore-not-found
echo "Done."
