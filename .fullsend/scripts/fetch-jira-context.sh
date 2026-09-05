#!/usr/bin/env bash
# Host snapshot of a linked Jira issue for the description-jira section LLM.
#
# Parses an issue key from the PR title/body (prefers Product ask / tracking).
# Reads only the existing Dashboard preflight secrets: JIRA_URL,
# JIRA_USERNAME, and JIRA_API_TOKEN. It deliberately produces no mock data.
#
# Writes context JSON — no findings, no GitHub posts, no secrets in the file.
#
# Usage:
#   fetch-jira-context.sh [output.json]
#   fetch-jira-context.sh --self-test
set -euo pipefail

_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_DEFAULT_OUT="${_DIR}/../.run/jira.json"

run_producer() {
  python3 - "${1}" <<'PY'
import json, os, re, sys, urllib.error, urllib.parse, urllib.request
from pathlib import Path

dest = Path(sys.argv[1])
KEY_RE = re.compile(r"\b([A-Z][A-Z0-9]+-\d+)\b")


def section_bodies(body):
    matches = list(re.finditer(r"^(#{1,6})\s+(.+?)\s*$", body or "", re.M))
    out = {}
    for i, m in enumerate(matches):
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body or "")
        heading = re.sub(r"\s+", " ", (m.group(2) or "").strip().rstrip(":").strip()).lower()
        out[heading] = (body or "")[start:end]
    return out


def pick_key(title, body):
    sections = section_bodies(body)
    for heading, text in sections.items():
        if "product ask" in heading or "tracking" in heading or heading == "jira":
            keys = KEY_RE.findall(text or "")
            if keys:
                return keys[0]
    keys = KEY_RE.findall(body or "")
    if keys:
        return keys[0]
    keys = KEY_RE.findall(title or "")
    if keys:
        return keys[0]
    return None


def flatten_adf(node):
    if node is None:
        return ""
    if isinstance(node, str):
        return node
    if isinstance(node, dict):
        if node.get("type") == "text":
            return node.get("text") or ""
        chunks = [flatten_adf(child) for child in (node.get("content") or [])]
        sep = "\n" if node.get("type") in ("paragraph", "heading", "listItem") else ""
        return sep.join(x for x in chunks if x)
    if isinstance(node, list):
        return "\n".join(flatten_adf(x) for x in node if flatten_adf(x))
    return str(node)


def envelope(**kwargs):
    payload = {
        "id": "jira-snapshot",
        "dimension": "jira-snapshot",
        "kind": "cli-adapter",
        "output": "context",
    }
    payload.update(kwargs)
    return payload


def write(payload):
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def snapshot_from_issue(data, key):
    fields = data.get("fields") or {}
    description = fields.get("description")
    if isinstance(description, (dict, list)):
        description = flatten_adf(description)
    status_obj = fields.get("status") or {}
    return {
        "key": key or data.get("key") or "",
        "summary": fields.get("summary") or "",
        "description": description or "",
        "status_name": (status_obj.get("name") if isinstance(status_obj, dict) else "") or "",
    }


title = os.environ.get("REVIEW_PR_TITLE") or ""
body = os.environ.get("REVIEW_PR_BODY") or ""
key = pick_key(title, body)
base = (os.environ.get("JIRA_URL") or "").rstrip("/")
user = os.environ.get("JIRA_USERNAME") or ""
token = os.environ.get("JIRA_API_TOKEN") or ""

if os.environ.get("FULLSEND_JIRA_SNAPSHOT_READY") == "1" and dest.is_file():
    allowed = {
        "id", "dimension", "kind", "output", "status", "source", "url",
        "key", "summary", "description", "status_name", "reason",
    }
    try:
        existing = json.loads(dest.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"precomputed Jira snapshot is invalid: {type(exc).__name__}")
    if not isinstance(existing, dict) or existing.get("id") != "jira-snapshot":
        raise SystemExit("precomputed Jira snapshot has the wrong envelope")
    if existing.get("status") not in {"ok", "none", "error"}:
        raise SystemExit("precomputed Jira snapshot has an invalid status")
    unexpected = set(existing) - allowed
    if unexpected:
        raise SystemExit(f"precomputed Jira snapshot has unexpected keys: {sorted(unexpected)}")
    print(f"Reusing precomputed Jira snapshot ({existing['status']}, key={existing.get('key', 'none')}) at {dest}")
    raise SystemExit(0)

if base and user and token:
    if not key:
        write(envelope(status="none", reason="no-issue-key"))
        print(f"Wrote Jira snapshot (none: no-issue-key) to {dest}")
        raise SystemExit(0)
    url = f"{base}/rest/api/2/issue/{urllib.parse.quote(key)}?fields=summary,description,status"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    import base64

    raw = base64.b64encode(f"{user}:{token}".encode()).decode()
    req.add_header("Authorization", f"Basic {raw}")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        write(envelope(status="error", key=key, reason=f"http-{exc.code}"))
        print(f"Wrote Jira snapshot (error: http-{exc.code}, key={key}) to {dest}")
        raise SystemExit(0)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        write(envelope(status="error", key=key, reason=type(exc).__name__))
        print(f"Wrote Jira snapshot (error: {type(exc).__name__}, key={key}) to {dest}")
        raise SystemExit(0)
    fields = snapshot_from_issue(data, key)
    write(envelope(status="ok", url=f"{base}/browse/{key}", **fields))
    print(f"Wrote Jira snapshot (ok, key={key}) to {dest}")
    raise SystemExit(0)

if not key:
    write(envelope(status="none", reason="no-issue-key"))
    print(f"Wrote Jira snapshot (none: no-issue-key) to {dest}")
    raise SystemExit(0)
write(envelope(status="none", key=key, reason="jira-credentials-unset"))
print(f"Wrote Jira snapshot (none: credentials unset, key={key}) to {dest}")
PY
}

run_self_test() {
  local tmp
  tmp="$(mktemp)"

  REVIEW_PR_TITLE='fix: export' \
  REVIEW_PR_BODY=$'## Product ask / tracking\nFixes RHOAIENG-82129\n' \
  JIRA_URL='' JIRA_USERNAME='' JIRA_API_TOKEN='' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
assert data["status"] == "none", data
assert data["key"] == "RHOAIENG-82129", data
assert data["reason"] == "jira-credentials-unset", data
print("PASS jira-snapshot: missing credentials produce no context")
PY

  REVIEW_PR_TITLE='docs' REVIEW_PR_BODY=$'## Problem\nNo tracker.\n' \
  JIRA_URL='' JIRA_USERNAME='' JIRA_API_TOKEN='' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
assert data["status"] == "none", data
assert "key" not in data, data
assert data["reason"] == "no-issue-key", data
print("PASS jira-snapshot: missing key produces no context")
PY

  python3 - "${tmp}" <<'PY'
import json, sys
json.dump({
    "id": "jira-snapshot",
    "dimension": "jira-snapshot",
    "kind": "cli-adapter",
    "output": "context",
    "status": "ok",
    "key": "RHOAIENG-57547",
    "summary": "Trusted host snapshot",
    "description": "Sanitized Jira description",
    "status_name": "In Progress",
    "url": "https://redhat.atlassian.net/browse/RHOAIENG-57547",
}, open(sys.argv[1], "w", encoding="utf-8"))
PY
  FULLSEND_JIRA_SNAPSHOT_READY=1 run_producer "${tmp}" >/dev/null
  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
assert data["status"] == "ok", data
assert data["key"] == "RHOAIENG-57547", data
assert data["summary"] == "Trusted host snapshot", data
print("PASS jira-snapshot: trusted precomputed context is preserved")
PY

  rm -f "${tmp}"
  echo "All jira-snapshot self-tests passed"
}

if [[ "${1:-}" == "--self-test" ]]; then
  run_self_test
  exit 0
fi

run_producer "${1:-${_DEFAULT_OUT}}"
