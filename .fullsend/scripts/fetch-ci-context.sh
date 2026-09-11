#!/usr/bin/env bash
# Host-only CI adapters for Fullsend. Reuses Dashboard's existing analysis
# and flake-classification implementations; it only normalizes their output.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RUN_DIR="${SCRIPT_DIR}/../.run"
ANALYZE_CI="${ROOT_DIR}/.claude/skills/preflight/scripts/analyze-ci.sh"
CLASSIFY_CI="${ROOT_DIR}/scripts/classify-ci-failures.py"

write_unavailable() {
  local reason="$1"
  mkdir -p "${RUN_DIR}"
  python3 - "${RUN_DIR}" "${reason}" <<'PY'
import json, sys
from pathlib import Path
dest, reason = Path(sys.argv[1]), sys.argv[2]
(dest / "ci-status.json").write_text(json.dumps({
  "id": "ci-status-review", "dimension": "ci-status-review",
  "kind": "cli-adapter", "output": "check:ci-status", "status": "unavailable",
  "check": {"id": "ci-status-review", "status": "could-not-verify", "summary": reason},
}, indent=2) + "\n", encoding="utf-8")
(dest / "ci-flake-classifier.json").write_text(json.dumps({
  "id": "ci-flake-classifier", "dimension": "ci-flake-classifier",
  "kind": "cli-adapter", "output": "classifier:ci-flake", "status": "unavailable",
  "classifier": {"id": "ci-flake-classifier", "status": "unavailable", "summary": reason, "classifications": []},
}, indent=2) + "\n", encoding="utf-8")
PY
}

normalize_results() {
  local raw_file="$1" classification_file="$2"
  python3 - "${RUN_DIR}" "${raw_file}" "${classification_file}" <<'PY'
import json, sys
from pathlib import Path

dest, raw_path, classification_path = map(Path, sys.argv[1:])
dest.mkdir(parents=True, exist_ok=True)
raw = json.loads(raw_path.read_text(encoding="utf-8"))
checks = raw.get("pr_checks")
classifier_data = None
if classification_path.is_file():
    try:
        candidate = json.loads(classification_path.read_text(encoding="utf-8"))
        if isinstance(candidate.get("classifications"), list):
            classifier_data = candidate
    except (OSError, json.JSONDecodeError):
        classifier_data = None

classification = {"id": "ci-flake-classifier", "status": "unavailable", "summary": "No failed CI checks required classification.", "classifications": []}
if classifier_data is not None:
    rows = classifier_data["classifications"]
    classification = {
        "id": "ci-flake-classifier", "status": "completed",
        "summary": f"{len(rows)} CI failure(s) classified.",
        "classifications": [{
            "subject": row.get("check_name", "unnamed check"),
            "classification": row.get("classification", "unknown"),
            "reason": "; ".join(signal.get("detail", "") for signal in row.get("signals", []) if signal.get("detail")) or "No classifier rationale returned.",
        } for row in rows],
    }

if not isinstance(checks, list):
    check = {"id": "ci-status-review", "status": "could-not-verify", "summary": "CI checks were unavailable from the host."}
else:
    failed = [x for x in checks if x.get("bucket") in ("fail", "cancel")]
    pending = [x for x in checks if x.get("bucket") in ("pending", "skipping")]
    if failed:
        non_blocking = {"flaky", "suspected_flaky", "external_unknown"}
        by_name = {row["subject"]: row["classification"] for row in classification["classifications"]}
        blocking = [x for x in failed if by_name.get(x.get("name", "unnamed check")) not in non_blocking]
        if blocking:
            check = {"id": "ci-status-review", "status": "fail", "summary": f"{len(blocking)} of {len(failed)} failed/cancelled CI check(s) are blocking.", "details": [x.get("name", "unnamed check") for x in blocking]}
        else:
            check = {"id": "ci-status-review", "status": "warning", "summary": f"{len(failed)} failed/cancelled CI check(s) were classified as non-blocking.", "details": [x.get("name", "unnamed check") for x in failed]}
    elif pending:
        check = {"id": "ci-status-review", "status": "warning", "summary": f"{len(pending)} CI check(s) are still pending.", "details": [x.get("name", "unnamed check") for x in pending]}
    else:
        check = {"id": "ci-status-review", "status": "pass", "summary": f"{len(checks)} CI check(s) completed without failure."}

def envelope(id, output, value, status="ok"):
    return {"id": id, "dimension": id, "kind": "cli-adapter", "output": output, "status": status, output.split(":", 1)[0]: value}

(dest / "ci-status.json").write_text(json.dumps(envelope("ci-status-review", "check:ci-status", check), indent=2) + "\n", encoding="utf-8")
(dest / "ci-flake-classifier.json").write_text(json.dumps(envelope("ci-flake-classifier", "classifier:ci-flake", classification, classification["status"]), indent=2) + "\n", encoding="utf-8")
PY
}

run_producer() {
  if [[ ! "${PR_NUMBER:-}" =~ ^[1-9][0-9]*$ ]] || [[ ! "${REPO_FULL_NAME:-}" =~ ^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$ ]]; then
    write_unavailable "CI host context is unavailable: missing valid PR_NUMBER or REPO_FULL_NAME."
    return 0
  fi
  if [[ ! -x "${ANALYZE_CI}" || ! -f "${CLASSIFY_CI}" ]]; then
    write_unavailable "CI host context is unavailable: canonical preflight CI tooling is missing."
    return 0
  fi

  mkdir -p "${RUN_DIR}"
  local owner repo raw_file classifier_file
  owner="${REPO_FULL_NAME%%/*}"
  repo="${REPO_FULL_NAME#*/}"
  raw_file="$(mktemp)"
  classifier_file="$(mktemp)"
  trap 'rm -f "${raw_file}" "${classifier_file}"' RETURN

  if ! "${ANALYZE_CI}" "${owner}" "${repo}" "${PR_NUMBER}" > "${raw_file}"; then
    write_unavailable "CI host context is unavailable: analyze-ci.sh failed."
    return 0
  fi
  if ! jq empty "${raw_file}" >/dev/null 2>&1; then
    write_unavailable "CI host context is unavailable: analyze-ci.sh returned invalid JSON."
    return 0
  fi

  if jq -e '(.pr_checks | type == "array") and any(.[]; .bucket == "fail" or .bucket == "cancel")' "${raw_file}" >/dev/null; then
    if ! python3 "${CLASSIFY_CI}" "${PR_NUMBER}" --repo "${REPO_FULL_NAME}" > "${classifier_file}" || ! jq empty "${classifier_file}" >/dev/null 2>&1; then
      # Absence is deliberate: normalizer emits the explicit unavailable
      # classifier envelope rather than attempting to parse partial output.
      rm -f "${classifier_file}"
    fi
  fi
  normalize_results "${raw_file}" "${classifier_file}"
  echo "Wrote host CI adapter envelopes to ${RUN_DIR}"
}

run_self_test() {
  local tmp raw classified
  tmp="$(mktemp -d)"
  raw="${tmp}/raw.json"
  classified="${tmp}/classified.json"
  printf '%s' '{"pr_checks":[{"name":"unit","bucket":"fail"}],"failures":[],"local_workflows":[]}' > "${raw}"
  printf '%s' '{"classifications":[{"check_name":"unit","classification":"flaky","signals":[{"detail":"rerun passed"}]}]}' > "${classified}"
  RUN_DIR="${tmp}/out" normalize_results "${raw}" "${classified}"
  jq -e '.check.status == "warning" and .check.id == "ci-status-review"' "${tmp}/out/ci-status.json" >/dev/null
  jq -e '.classifier.status == "completed" and .classifier.classifications[0].classification == "flaky"' "${tmp}/out/ci-flake-classifier.json" >/dev/null
  printf '%s' '{"pr_checks":[{"name":"unit","bucket":"fail"},{"name":"lint","bucket":"cancel"}],"failures":[],"local_workflows":[]}' > "${raw}"
  printf '%s' '{"classifications":[{"check_name":"unit","classification":"flaky","signals":[{"detail":"rerun passed"}]},{"check_name":"lint","classification":"genuine","signals":[{"detail":"deterministic lint error"}]}]}' > "${classified}"
  RUN_DIR="${tmp}/mixed" normalize_results "${raw}" "${classified}"
  jq -e '.check.status == "fail" and (.check.details | index("lint"))' "${tmp}/mixed/ci-status.json" >/dev/null
  RUN_DIR="${tmp}/unavailable" write_unavailable "fixture unavailable"
  jq -e '.check.status == "could-not-verify"' "${tmp}/unavailable/ci-status.json" >/dev/null
  jq -e '.classifier.status == "unavailable"' "${tmp}/unavailable/ci-flake-classifier.json" >/dev/null
  rm -rf "${tmp}"
  echo "PASS CI adapter: all-flaky failures are warnings"
  echo "PASS CI adapter: mixed failures retain blocking status"
  echo "All CI adapter self-tests passed"
}

if [[ "${1:-}" == "--self-test" ]]; then
  run_self_test
  exit 0
fi

run_producer
