#!/usr/bin/env bash
# Run every cli-adapter listed in dimensions.json. Adapters may write any
# JSON. Payloads that include a findings key are collected into
# `.run/collected.json` for pr-review challenger collect. Context
# snapshots stay at producer_file under `.run/` (host_files copies them).
#
# Each registry row may set "runner" (a producer script). This orchestrator
# only knows dimension ids and paths from the registry.
#
# Usage:
#   run-dimension-producers.sh
#   run-dimension-producers.sh --self-test
set -euo pipefail

_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_ROOT="$(cd "${_DIR}/.." && pwd)"
_REGISTRY="${_ROOT}/dimensions.json"
_COLLECTED="${_ROOT}/.run/collected.json"

write_collected() {
  python3 - "${_ROOT}" "${_COLLECTED}" <<'PY'
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
dest = Path(sys.argv[2])
registry = json.loads((root / "dimensions.json").read_text(encoding="utf-8"))
envelopes = []
for dim in registry.get("dimensions") or []:
    if dim.get("kind") != "cli-adapter":
        continue
    rel = dim.get("producer_file") or f".run/{dim.get('id', 'unknown')}.json"
    path = root / rel
    if not path.is_file():
        continue
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        continue
    if isinstance(payload, dict) and "findings" in payload:
        envelopes.append(payload)
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(json.dumps(envelopes, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(envelopes)} dimension envelope(s) to {dest}")
PY
}

run_producers() {
  python3 - "${_REGISTRY}" "${_ROOT}" <<'PY'
import json
import subprocess
import sys
from pathlib import Path

registry_path = Path(sys.argv[1])
root = Path(sys.argv[2])
registry = json.loads(registry_path.read_text(encoding="utf-8"))
failed = 0
for dim in registry.get("dimensions") or []:
    if dim.get("kind") != "cli-adapter":
        continue
    runner = dim.get("runner")
    if not runner:
        print(f"::warning::dimension {dim.get('id')} has no runner; skipping", file=sys.stderr)
        continue
    out = root / (dim.get("producer_file") or f".run/{dim.get('id')}.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    script = root / runner
    rc = subprocess.call(["bash", str(script), str(out)])
    if rc != 0:
        print(f"::warning::dimension {dim.get('id')} runner exited {rc}", file=sys.stderr)
        failed += 1
sys.exit(1 if failed else 0)
PY
}

self_test() {
  local fail=0
  python3 - "${_REGISTRY}" <<'PY'
import json, sys
from pathlib import Path
registry = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
dims = registry.get("dimensions") or []
assert dims, "registry has no dimensions"
for dim in dims:
    assert dim.get("id"), dim
    kind = dim.get("kind")
    assert kind in ("llm-subagent", "cli-adapter"), dim
    output = dim.get("output") or ""
    assert output == "findings" or output == "context" or output.startswith("section:"), dim
    if kind == "cli-adapter":
        assert dim.get("runner"), f"{dim.get('id')} missing runner"
        assert dim.get("producer_file"), f"{dim.get('id')} missing producer_file"
    if kind == "llm-subagent":
        assert dim.get("definition"), f"{dim.get('id')} missing definition"
print("PASS registry: output findings|context|section and kinds are well-formed")
PY
  local dim_id runner
  while IFS=$'\t' read -r dim_id runner; do
    [[ -z "${runner}" ]] && continue
    if ! bash "${_ROOT}/${runner}" --self-test; then
      echo "FAIL producer self-test for ${dim_id} (${runner})" >&2
      fail=1
    fi
  done < <(python3 - "${_REGISTRY}" <<'PY'
import json, sys
from pathlib import Path
registry = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
for dim in registry.get("dimensions") or []:
    if dim.get("kind") == "cli-adapter" and dim.get("runner"):
        print(f"{dim['id']}\t{dim['runner']}")
PY
)
  local tmp
  tmp="$(mktemp)"
  python3 - "${_ROOT}" "${tmp}" <<'PY'
import json, sys
from pathlib import Path
root = Path(sys.argv[1])
dest = Path(sys.argv[2])
registry = json.loads((root / "dimensions.json").read_text(encoding="utf-8"))
envelopes = []
for dim in registry.get("dimensions") or []:
    if dim.get("kind") != "cli-adapter":
        continue
    rel = dim.get("producer_file") or f".run/{dim.get('id')}.json"
    path = root / rel
    if not path.is_file():
        continue
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, dict) and "findings" in payload:
        envelopes.append(payload)
dest.write_text(json.dumps(envelopes) + "\n", encoding="utf-8")
data = json.loads(dest.read_text(encoding="utf-8"))
assert isinstance(data, list), type(data)
ids = {row.get("dimension") for row in data if isinstance(row, dict)}
reg_ids = {d["id"] for d in registry.get("dimensions") or []}
assert ids <= reg_ids, ids
assert all("findings" in row for row in data), data
assert "jira-snapshot" not in ids, ids
print(f"PASS collected findings envelopes only ({len(data)} dimension(s))")
PY
  rm -f "${tmp}"
  if [[ "${fail}" -ne 0 ]]; then
    exit 1
  fi
  echo "All dimension-producer self-tests passed"
}

if [[ "${1:-}" == "--self-test" ]]; then
  self_test
  exit 0
fi

if ! run_producers; then
  echo "::warning::one or more dimension producers failed; collecting whatever envelopes exist"
fi
write_collected
