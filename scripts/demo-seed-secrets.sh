#!/usr/bin/env bash
set -euo pipefail

NS="${1:-model-serving}"

echo "Seeding demo secrets in namespace: $NS"

oc delete secret demo-db-credentials demo-api-config demo-connection-filtered -n "$NS" --ignore-not-found

oc create secret generic demo-db-credentials -n "$NS" \
  --from-literal=DB_HOST=postgres.svc.cluster.local \
  --from-literal=DB_PORT=5432 \
  --from-literal=DB_USER=appuser \
  --from-literal=DB_PASSWORD=s3cret-pa55

oc create secret generic demo-api-config -n "$NS" \
  --from-literal=API_KEY=sk-demo-1234567890 \
  --from-literal=API_URL=https://api.example.com/v2 \
  --from-literal=API_VERSION=v2

oc create secret generic demo-connection-filtered -n "$NS" \
  --from-literal=ENDPOINT=https://s3.amazonaws.com \
  --from-literal=TOKEN=fake-token
oc annotate secret demo-connection-filtered -n "$NS" \
  opendatahub.io/connection-type-ref=s3

echo "Done. Created 3 secrets (2 visible in dropdown, 1 filtered as connection)."
echo "  demo-db-credentials  — 4 keys (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD)"
echo "  demo-api-config      — 3 keys (API_KEY, API_URL, API_VERSION)"
echo "  demo-connection-filtered — filtered out (has connection-type-ref annotation)"
