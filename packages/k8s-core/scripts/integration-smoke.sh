#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURES_DIR="${SCRIPT_DIR}/test-manifests"
RESULTS_DIR="${RESULTS_DIR:-/tmp/kueue-sentinel-results}"
OUTPUT_FILE="${OUTPUT_FILE:-${RESULTS_DIR}/layer3-results.json}"

mkdir -p "${RESULTS_DIR}"
rm -f "${RESULTS_DIR}/layer3.ndjson"

LAYER3_FAILED=false

log() {
  echo "[kueue-integration] $*"
}

record_result() {
  local name="$1"
  local status="$2"
  local detail="$3"
  printf '{"test":"%s","status":"%s","detail":"%s"}\n' "${name}" "${status}" "${detail}" >> "${RESULTS_DIR}/layer3.ndjson"
}

kubectl create namespace kueue-sentinel --dry-run=client -o yaml | kubectl apply -f -
kubectl label namespace kueue-sentinel kueue.openshift.io/managed=true --overwrite

log "Ensuring base resources exist"
kubectl apply -f "${FIXTURES_DIR}/resourceflavor.yaml"
kubectl apply -f "${FIXTURES_DIR}/clusterqueue.yaml"
kubectl apply -f "${FIXTURES_DIR}/localqueue.yaml"
kubectl apply -f "${FIXTURES_DIR}/clustertrainingruntime.yaml"

log "Submitting integration TrainJob"
kubectl apply -f "${FIXTURES_DIR}/trainjob-integration.yaml"

log "Unsuspending TrainJob to trigger Kueue admission"
kubectl patch trainjob sentinel-trainjob-integration -n kueue-sentinel \
  --type=merge -p '{"spec":{"suspend":false}}'

log "Waiting for TrainJob suspend=false"
if kubectl wait --for=jsonpath='{.spec.suspend}'=false trainjob/sentinel-trainjob-integration \
  -n kueue-sentinel --timeout=180s; then
  record_result "trainjob_unsuspend" "pass" "TrainJob unsuspended successfully"
else
  record_result "trainjob_unsuspend" "fail" "TrainJob did not unsuspend within timeout"
  LAYER3_FAILED=true
fi

log "Waiting for a Workload owned by the TrainJob"
WORKLOAD_NAME=""
for _ in $(seq 1 30); do
  WORKLOAD_NAME="$(kubectl get workloads -n kueue-sentinel -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)"
  if [[ -n "${WORKLOAD_NAME}" ]]; then
    break
  fi
  sleep 5
done

if [[ -z "${WORKLOAD_NAME}" ]]; then
  record_result "workload_created" "fail" "No Workload created for TrainJob"
  LAYER3_FAILED=true
else
  record_result "workload_created" "pass" "Workload ${WORKLOAD_NAME} created"
fi

if [[ -n "${WORKLOAD_NAME}" ]]; then
  log "Checking Workload admission status"
  ADMITTED="$(kubectl get workload "${WORKLOAD_NAME}" -n kueue-sentinel \
    -o jsonpath='{.status.conditions[?(@.type=="Admitted")].status}' 2>/dev/null || true)"
  if [[ "${ADMITTED}" == "True" ]]; then
    record_result "workload_admitted" "pass" "Workload admitted by Kueue"
  else
    QUOTA_RESERVED="$(kubectl get workload "${WORKLOAD_NAME}" -n kueue-sentinel \
      -o jsonpath='{.status.conditions[?(@.type=="QuotaReserved")].status}' 2>/dev/null || true)"
    if [[ "${QUOTA_RESERVED}" == "True" ]]; then
      record_result "workload_admitted" "pass" "Workload quota reserved (admission in progress)"
    else
      record_result "workload_admitted" "fail" "Workload not admitted; check runtime patches / queue wiring"
      LAYER3_FAILED=true
    fi
  fi

  log "PATCH Workload spec.active=false (pause)"
  kubectl patch workload "${WORKLOAD_NAME}" -n kueue-sentinel \
    --type=merge -p '{"spec":{"active":false}}'
  EVICTED=""
  for _ in $(seq 1 30); do
    EVICTED="$(kubectl get workload "${WORKLOAD_NAME}" -n kueue-sentinel \
      -o jsonpath='{.status.conditions[?(@.type=="Evicted")].status}' 2>/dev/null || true)"
    if [[ "${EVICTED}" == "True" ]]; then
      break
    fi
    sleep 2
  done
  if [[ "${EVICTED}" == "True" ]]; then
    record_result "workload_pause" "pass" "Workload evicted after pause"
  else
    record_result "workload_pause" "fail" "Workload did not show Evicted condition after pause"
    LAYER3_FAILED=true
  fi

  log "PATCH Workload spec.active=true (resume)"
  kubectl patch workload "${WORKLOAD_NAME}" -n kueue-sentinel \
    --type=merge -p '{"spec":{"active":true}}'
  record_result "workload_resume" "pass" "Workload resume patch accepted"
fi

log "PATCH TrainJob spec.trainer.numNodes (expect immutability, matches scaling.ts)"
PATCH_OUTPUT="$(kubectl patch trainjob sentinel-trainjob-integration -n kueue-sentinel \
  --type=merge -p '{"spec":{"trainer":{"numNodes":3}}}' 2>&1)" || true
if [[ "${PATCH_OUTPUT}" == *"field is immutable"* ]]; then
  record_result "trainjob_scale_immutable" "pass" \
    "TrainJob scale patch rejected as immutable (matches dashboard scaling.ts)"
else
  record_result "trainjob_scale_immutable" "fail" \
    "expected immutability rejection for spec.trainer patch, got: ${PATCH_OUTPUT}"
  LAYER3_FAILED=true
fi

log "DELETE TrainJob"
if kubectl delete trainjob sentinel-trainjob-integration -n kueue-sentinel --wait=true --timeout=120s; then
  if kubectl get trainjob sentinel-trainjob-integration -n kueue-sentinel >/dev/null 2>&1; then
    record_result "trainjob_delete" "fail" "TrainJob still exists after delete"
    LAYER3_FAILED=true
  else
    record_result "trainjob_delete" "pass" "TrainJob deleted successfully"
  fi
else
  record_result "trainjob_delete" "fail" "TrainJob delete failed"
  LAYER3_FAILED=true
fi

python3 - <<'PY' "${RESULTS_DIR}/layer3.ndjson" "${OUTPUT_FILE}"
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

if [[ "${LAYER3_FAILED}" == "true" ]]; then
  exit 1
fi
