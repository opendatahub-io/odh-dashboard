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
  python3 -c 'import json,sys; print(json.dumps({"test":sys.argv[1],"status":sys.argv[2],"detail":sys.argv[3]}))' \
    "${name}" "${status}" "${detail}" >> "${RESULTS_DIR}/layer3.ndjson"
}

workload_owned_by_uid() {
  local owner_uid="$1"
  OWNER_UID="${owner_uid}" kubectl get workloads -n kueue-sentinel -o json | python3 -c '
import json
import os
import sys

owner_uid = os.environ["OWNER_UID"]
for item in json.load(sys.stdin).get("items", []):
    for ref in item.get("metadata", {}).get("ownerReferences", []):
        if ref.get("uid") == owner_uid:
            print(item["metadata"]["name"])
            raise SystemExit(0)
'
}

wait_for_workload_admitted() {
  local workload_name="$1"
  local admitted=""
  for _ in $(seq 1 30); do
    admitted="$(kubectl get workload "${workload_name}" -n kueue-sentinel \
      -o jsonpath='{.status.conditions[?(@.type=="Admitted")].status}' 2>/dev/null || true)"
    if [[ "${admitted}" == "True" ]]; then
      return 0
    fi
    sleep 5
  done
  return 1
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

TRAINJOB_UID="$(kubectl get trainjob sentinel-trainjob-integration -n kueue-sentinel -o jsonpath='{.metadata.uid}')"

log "Waiting for a Workload owned by the TrainJob"
WORKLOAD_NAME=""
for _ in $(seq 1 30); do
  WORKLOAD_NAME="$(workload_owned_by_uid "${TRAINJOB_UID}" || true)"
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
  log "Waiting for Workload admission"
  if wait_for_workload_admitted "${WORKLOAD_NAME}"; then
    record_result "workload_admitted" "pass" "Workload admitted by Kueue"
  else
    record_result "workload_admitted" "fail" "Workload not admitted within timeout"
    LAYER3_FAILED=true
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
  if wait_for_workload_admitted "${WORKLOAD_NAME}"; then
    record_result "workload_resume" "pass" "Workload readmitted after resume"
  else
    record_result "workload_resume" "fail" "Workload not readmitted after resume"
    LAYER3_FAILED=true
  fi
fi

log "PATCH TrainJob spec.trainer.numNodes (expect immutability, matches scaling.ts)"
PATCH_OUTPUT="$(kubectl patch trainjob sentinel-trainjob-integration -n kueue-sentinel \
  --type=merge -p '{"spec":{"trainer":{"numNodes":3}}}' 2>&1)" || true
if [[ "${PATCH_OUTPUT}" == *"field is immutable"* ]]; then
  record_result "trainjob_scale_immutable" "pass" \
    "TrainJob scale patch rejected as immutable"
else
  log "Unexpected immutability patch output: ${PATCH_OUTPUT}"
  record_result "trainjob_scale_immutable" "fail" \
    "expected immutability rejection for spec.trainer patch"
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
