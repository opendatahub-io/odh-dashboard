#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURES_DIR="${SCRIPT_DIR}/test-manifests"
RESULTS_DIR="${RESULTS_DIR:-/tmp/kueue-sentinel-results}"
OUTPUT_FILE="${OUTPUT_FILE:-${RESULTS_DIR}/layer2-results.json}"

mkdir -p "${RESULTS_DIR}"
rm -f "${RESULTS_DIR}/layer2.ndjson"

LAYER2_FAILED=false

log() {
  echo "[kueue-dryrun] $*"
}

record_result() {
  local name="$1"
  local status="$2"
  local detail="$3"
  printf '{"test":"%s","status":"%s","detail":"%s"}\n' "${name}" "${status}" "${detail}" >> "${RESULTS_DIR}/layer2.ndjson"
}

kubectl create namespace kueue-sentinel --dry-run=client -o yaml | kubectl apply -f -
kubectl label namespace kueue-sentinel kueue.openshift.io/managed=true --overwrite

log "Applying base Kueue resources"
kubectl apply -f "${FIXTURES_DIR}/resourceflavor.yaml"
kubectl apply -f "${FIXTURES_DIR}/clusterqueue.yaml"
kubectl apply -f "${FIXTURES_DIR}/localqueue.yaml"
kubectl apply -f "${FIXTURES_DIR}/clustertrainingruntime.yaml"

log "CREATE Workload (dry-run=server)"
if kubectl apply --dry-run=server -f "${FIXTURES_DIR}/workload-pause.yaml"; then
  record_result "create_workload" "pass" "server dry-run accepted Workload create"
else
  record_result "create_workload" "fail" "server dry-run rejected Workload create"
  LAYER2_FAILED=true
fi

log "CREATE TrainJob basic (dry-run=server)"
if kubectl apply --dry-run=server -f "${FIXTURES_DIR}/trainjob-submit.yaml"; then
  record_result "create_trainjob" "pass" "server dry-run accepted TrainJob create"
else
  record_result "create_trainjob" "fail" "server dry-run rejected TrainJob create"
  LAYER2_FAILED=true
fi

log "CREATE TrainJob integration (dry-run=server)"
if kubectl apply --dry-run=server -f "${FIXTURES_DIR}/trainjob-integration.yaml"; then
  record_result "create_trainjob_integration" "pass" "server dry-run accepted integration TrainJob create"
else
  record_result "create_trainjob_integration" "fail" "server dry-run rejected integration TrainJob create"
  LAYER2_FAILED=true
fi

log "CREATE TrainJob scale (dry-run=server)"
if kubectl apply --dry-run=server -f "${FIXTURES_DIR}/trainjob-scale.yaml"; then
  record_result "create_trainjob_scale" "pass" "server dry-run accepted scaled TrainJob create"
else
  record_result "create_trainjob_scale" "fail" "server dry-run rejected scaled TrainJob create"
  LAYER2_FAILED=true
fi

log "Applying Workload and TrainJob resources for patch dry-run validation"
kubectl apply -f "${FIXTURES_DIR}/workload-pause.yaml"
kubectl apply -f "${FIXTURES_DIR}/trainjob-integration.yaml"

log "PATCH Workload spec.active (dry-run=server)"
if kubectl patch workload sentinel-workload -n kueue-sentinel \
  --type=merge -p '{"spec":{"active":false}}' --dry-run=server; then
  record_result "patch_workload_active" "pass" "server dry-run accepted Workload pause patch"
else
  record_result "patch_workload_active" "fail" "server dry-run rejected Workload pause patch"
  LAYER2_FAILED=true
fi

log "PATCH TrainJob spec.suspend (dry-run=server)"
if kubectl patch trainjob sentinel-trainjob-integration -n kueue-sentinel \
  --type=merge -p '{"spec":{"suspend":true}}' --dry-run=server; then
  record_result "patch_trainjob_suspend" "pass" "server dry-run accepted TrainJob suspend patch"
else
  record_result "patch_trainjob_suspend" "fail" "server dry-run rejected TrainJob suspend patch"
  LAYER2_FAILED=true
fi

python3 - <<'PY' "${RESULTS_DIR}/layer2.ndjson" "${OUTPUT_FILE}"
import json
import sys
from pathlib import Path

ndjson = Path(sys.argv[1])
output = Path(sys.argv[2])
results = []
if ndjson.exists():
    for line in ndjson.read_text(encoding="utf-8").splitlines():
        if line.strip():
            results.append(json.loads(line))

payload = {
    "status": "fail" if any(item["status"] == "fail" for item in results) else "pass",
    "tests": results,
}
output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
print(json.dumps(payload))
PY

if [[ "${LAYER2_FAILED}" == "true" ]]; then
  exit 1
fi
