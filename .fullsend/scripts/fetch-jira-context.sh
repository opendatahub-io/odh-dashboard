#!/usr/bin/env bash
# Host snapshot of linked Jira issues for the product-ask-review section LLM.
#
# Parses issue keys from the PR title/body (preamble first, then title).
# Strips HTML comments before scanning so template placeholders inside
# <!-- ... --> are ignored. Fetches up to 10 unique collected keys, records
# omitted keys, and writes an issues[] array alongside the backward-compatible
# top-level fields.
#
# Reads JIRA_BASE_URL for request and browse URLs, plus the JIRA username and
# API token the adapter forwards. It deliberately produces no mock data.
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
MAX_JIRA_KEYS = 10
OMITTED_KEYS = []


def strip_html_comments(text):
    return re.sub(r"<!--.*?-->", "", text or "", flags=re.S)


def preamble(body):
    m = re.search(r"^#{1,6}\s", body or "", re.M)
    return (body or "")[:m.start()] if m else (body or "")


def unique_keys(raw_keys):
    seen = set()
    out = []
    for k in raw_keys:
        if k not in seen:
            seen.add(k)
            out.append(k)
    return out


def collect_keys(title, body):
    pre = preamble(strip_html_comments(body))
    pre_keys = unique_keys(KEY_RE.findall(pre))
    if pre_keys:
        return pre_keys
    return unique_keys(KEY_RE.findall(strip_html_comments(title)))


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
    if OMITTED_KEYS:
        payload["omitted_keys"] = OMITTED_KEYS
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
keys = collect_keys(title, body)
OMITTED_KEYS = keys[MAX_JIRA_KEYS:]
keys = keys[:MAX_JIRA_KEYS]
key = keys[0] if keys else None
base = (os.environ.get("JIRA_BASE_URL") or "").rstrip("/")
user = os.environ.get("FULLSEND_ADAPTER_USERNAME") or os.environ.get("JIRA_USERNAME") or ""
token = os.environ.get("FULLSEND_ADAPTER_TOKEN") or os.environ.get("JIRA_API_TOKEN") or ""


class RejectRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

if os.environ.get("FULLSEND_JIRA_SNAPSHOT_READY") == "1" and dest.is_file():
    allowed = {
        "id", "dimension", "kind", "output", "status", "source", "url",
        "key", "summary", "description", "status_name", "reason", "issues",
        "omitted_keys",
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

if base and urllib.parse.urlsplit(base).scheme.lower() != "https":
    write(envelope(status="error", key=key, reason="jira-url-must-use-https"))
    print(f"Wrote Jira snapshot (error: Jira URL must use HTTPS, key={key}) to {dest}")
    raise SystemExit(0)

if not keys:
    write(envelope(status="none", reason="no-issue-key"))
    print(f"Wrote Jira snapshot (none: no-issue-key) to {dest}")
    raise SystemExit(0)

if not base:
    write(envelope(status="none", key=key, issues=[{"key": k} for k in keys],
                   reason="jira-base-url-unset"))
    print(f"Wrote Jira snapshot (none: JIRA_BASE_URL unset, keys={','.join(keys)}) to {dest}")
    raise SystemExit(0)

if user and token:
    import base64
    raw = base64.b64encode(f"{user}:{token}".encode()).decode()
    opener = urllib.request.build_opener(RejectRedirects())

    issues = []
    for k in keys:
        url = f"{base}/rest/api/2/issue/{urllib.parse.quote(k)}?fields=summary,description,status"
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        req.add_unredirected_header("Authorization", f"Basic {raw}")
        try:
            with opener.open(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            entry = snapshot_from_issue(data, k)
            entry["url"] = f"{base}/browse/{k}"
            issues.append(entry)
        except urllib.error.HTTPError as exc:
            issues.append({"key": k, "status": "error", "reason": f"http-{exc.code}"})
        except Exception as exc:
            issues.append({"key": k, "status": "error", "reason": type(exc).__name__})

    ok_issues = [i for i in issues if i.get("status") != "error"]
    if ok_issues:
        first = ok_issues[0]
        write(envelope(
            status="ok", issues=issues,
            key=first["key"], summary=first["summary"],
            description=first["description"], status_name=first["status_name"],
            url=first["url"],
        ))
        ok_keys = ", ".join(i["key"] for i in ok_issues)
        print(f"Wrote Jira snapshot (ok, keys={ok_keys}) to {dest}")
    else:
        write(envelope(status="error", key=key, issues=issues, reason="all-fetches-failed"))
        print(f"Wrote Jira snapshot (error: all fetches failed, keys={','.join(keys)}) to {dest}")
    raise SystemExit(0)

write(envelope(status="none", key=key, issues=[{"key": k} for k in keys], reason="jira-credentials-unset"))
print(f"Wrote Jira snapshot (none: credentials unset, keys={','.join(keys)}) to {dest}")
PY
}

run_self_test() {
  local tmp
  tmp="$(mktemp)"

  # Authenticated requests must not downgrade to plain HTTP.
  REVIEW_PR_TITLE='fix: export' \
  REVIEW_PR_BODY=$'Fixes RHOAIENG-82129\n' \
  JIRA_BASE_URL='http://jira.example.test' \
  JIRA_USERNAME='user' JIRA_API_TOKEN='token' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
assert data["status"] == "error", data
assert data["reason"] == "jira-url-must-use-https", data
print("PASS jira-snapshot: authenticated requests require HTTPS")
PY

  # A missing base URL is its own reason, not a credentials failure.
  REVIEW_PR_TITLE='fix: export' \
  REVIEW_PR_BODY=$'Fixes RHOAIENG-82129\n' \
  JIRA_BASE_URL='' \
  JIRA_USERNAME='user' JIRA_API_TOKEN='token' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
assert data["status"] == "none", data
assert data["reason"] == "jira-base-url-unset", data
assert data["issues"] == [{"key": "RHOAIENG-82129"}], data
print("PASS jira-snapshot: missing base URL reported separately")
PY

  # Existing: no key at all.
  REVIEW_PR_TITLE='docs' REVIEW_PR_BODY=$'## Problem\nNo tracker.\n' \
  JIRA_BASE_URL='' JIRA_USERNAME='' JIRA_API_TOKEN='' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
assert data["status"] == "none", data
assert "key" not in data, data
assert data["reason"] == "no-issue-key", data
print("PASS jira-snapshot: missing key produces no context")
PY

  # HTML-commented template sample + real Fixes: URL at the top.
  REVIEW_PR_TITLE='fix: export RHOAIENG-100655' \
  REVIEW_PR_BODY=$'<!-- Fixes: https://issues.redhat.com/browse/RHOAIENG-123456 -->\nFixes: https://issues.redhat.com/browse/RHOAIENG-100655\n\n## Problem\nBroken.\n' \
  JIRA_BASE_URL='' JIRA_USERNAME='' JIRA_API_TOKEN='' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
assert data["key"] == "RHOAIENG-100655", data
assert data["issues"] == [{"key": "RHOAIENG-100655"}], data
assert "RHOAIENG-123456" not in json.dumps(data), f"template sample leaked: {data}"
print("PASS jira-snapshot: commented template sample ignored, real key used")
PY

  # Multiline comment containing a heading does not end the body preamble.
  REVIEW_PR_TITLE='fix: export RHOAIENG-100655' \
  REVIEW_PR_BODY=$'<!-- template\nFixes: https://issues.redhat.com/browse/RHOAIENG-123456\n## Tracking\n-->\nFixes: https://issues.redhat.com/browse/RHOAIENG-100655\n\n## Problem\nBroken.\n' \
  JIRA_BASE_URL='' JIRA_USERNAME='' JIRA_API_TOKEN='' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
assert data["key"] == "RHOAIENG-100655", data
assert data["issues"] == [{"key": "RHOAIENG-100655"}], data
assert "RHOAIENG-123456" not in json.dumps(data), f"template sample leaked: {data}"
print("PASS jira-snapshot: multiline comment heading ignored before preamble scan")
PY

  # Four Fixes: lines at the top (PR #10264 shape).
  REVIEW_PR_TITLE='fix: multi' \
  REVIEW_PR_BODY=$'Fixes: https://issues.redhat.com/browse/RHOAIENG-100580\nFixes: https://issues.redhat.com/browse/RHOAIENG-100583\nFixes: https://issues.redhat.com/browse/RHOAIENG-100584\nFixes: https://issues.redhat.com/browse/RHOAIENG-100585\n\n## Problem\nMulti.\n' \
  JIRA_BASE_URL='' JIRA_USERNAME='' JIRA_API_TOKEN='' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
assert data["key"] == "RHOAIENG-100580", data
keys = [i["key"] for i in data["issues"]]
assert keys == ["RHOAIENG-100580", "RHOAIENG-100583", "RHOAIENG-100584", "RHOAIENG-100585"], keys
print("PASS jira-snapshot: four Fixes: lines, all keys, order preserved")
PY

  # Bare keys at the top with no Fixes: prefix; key under Problem excluded.
  REVIEW_PR_TITLE='fix: stuff' \
  REVIEW_PR_BODY=$'RHOAIENG-100580\nRHOAIENG-100583\n\n## Problem\nSee RHOAIENG-99999 for background.\n' \
  JIRA_BASE_URL='' JIRA_USERNAME='' JIRA_API_TOKEN='' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
keys = [i["key"] for i in data["issues"]]
assert keys == ["RHOAIENG-100580", "RHOAIENG-100583"], keys
assert "RHOAIENG-99999" not in json.dumps(data), f"body key leaked: {data}"
print("PASS jira-snapshot: bare preamble keys only, body mention excluded")
PY

  # Comma-separated keys on one preamble line.
  REVIEW_PR_TITLE='fix: combo' \
  REVIEW_PR_BODY=$'Fixes: RHOAIENG-100580, RHOAIENG-100583\n\n## Problem\nMulti.\n' \
  JIRA_BASE_URL='' JIRA_USERNAME='' JIRA_API_TOKEN='' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
keys = [i["key"] for i in data["issues"]]
assert keys == ["RHOAIENG-100580", "RHOAIENG-100583"], keys
print("PASS jira-snapshot: comma-separated preamble keys")
PY

  # Same key twice in preamble: deduplicated.
  REVIEW_PR_TITLE='fix: dup' \
  REVIEW_PR_BODY=$'Fixes: RHOAIENG-100580\nFixes: RHOAIENG-100580\n\n## Problem\nDup.\n' \
  JIRA_BASE_URL='' JIRA_USERNAME='' JIRA_API_TOKEN='' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
keys = [i["key"] for i in data["issues"]]
assert keys == ["RHOAIENG-100580"], keys
print("PASS jira-snapshot: duplicate preamble key deduplicated")
PY

  # Exactly ten keys are all retained.
  local bounded_body bounded_key
  bounded_body=''
  for i in $(seq 1 10); do
    bounded_key=$(printf 'RHOAIENG-1005%02d' "$i")
    bounded_body+="Fixes: ${bounded_key}"$'\n'
  done
  REVIEW_PR_TITLE='fix: bounded' \
  REVIEW_PR_BODY="${bounded_body}" \
  JIRA_BASE_URL='' JIRA_USERNAME='' JIRA_API_TOKEN='' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
keys = [i["key"] for i in data["issues"]]
assert keys == [f"RHOAIENG-1005{i:02d}" for i in range(1, 11)], keys
assert "omitted_keys" not in data, data
print("PASS jira-snapshot: ten keys retained without truncation")
PY

  # An eleventh key is recorded as omitted instead of fetched.
  bounded_body+="Fixes: RHOAIENG-100511"$'\n'
  REVIEW_PR_TITLE='fix: bounded' \
  REVIEW_PR_BODY="${bounded_body}" \
  JIRA_BASE_URL='' JIRA_USERNAME='' JIRA_API_TOKEN='' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
keys = [i["key"] for i in data["issues"]]
assert keys == [f"RHOAIENG-1005{i:02d}" for i in range(1, 11)], keys
assert data["omitted_keys"] == ["RHOAIENG-100511"], data
print("PASS jira-snapshot: eleventh key recorded as omitted")
PY

  # Commented key only: no key found.
  REVIEW_PR_TITLE='docs' \
  REVIEW_PR_BODY=$'<!-- Fixes: https://issues.redhat.com/browse/RHOAIENG-123456 -->\n\n## Problem\nNo real tracker.\n' \
  JIRA_BASE_URL='' JIRA_USERNAME='' JIRA_API_TOKEN='' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
assert data["status"] == "none", data
assert data["reason"] == "no-issue-key", data
print("PASS jira-snapshot: commented key only yields no-issue-key")
PY

  # Title fallback when body has no keys.
  REVIEW_PR_TITLE='RHOAIENG-55555: fix it' \
  REVIEW_PR_BODY=$'## Problem\nNo tracker in body.\n' \
  JIRA_BASE_URL='' JIRA_USERNAME='' JIRA_API_TOKEN='' \
    run_producer "${tmp}" >/dev/null

  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
assert data["key"] == "RHOAIENG-55555", data
assert data["issues"] == [{"key": "RHOAIENG-55555"}], data
print("PASS jira-snapshot: title fallback when body has no keys")
PY

  # Precomputed snapshot without issues (backward compat).
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
print("PASS jira-snapshot: precomputed context without issues preserved")
PY

  # Precomputed snapshot with issues accepted.
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
    "issues": [
        {"key": "RHOAIENG-57547", "summary": "First", "description": "d1", "status_name": "In Progress", "url": "https://redhat.atlassian.net/browse/RHOAIENG-57547"},
        {"key": "RHOAIENG-57548", "summary": "Second", "description": "d2", "status_name": "New", "url": "https://redhat.atlassian.net/browse/RHOAIENG-57548"},
    ],
}, open(sys.argv[1], "w", encoding="utf-8"))
PY
  FULLSEND_JIRA_SNAPSHOT_READY=1 run_producer "${tmp}" >/dev/null
  python3 - "${tmp}" <<'PY'
import json, sys
data = json.load(open(sys.argv[1], encoding="utf-8"))
assert data["status"] == "ok", data
assert len(data["issues"]) == 2, data
print("PASS jira-snapshot: precomputed context with issues preserved")
PY

  # Unexpected per-key failures (e.g. UnicodeDecodeError) must be recorded
  # and must not abort processing of later keys. Mirrors the producer loop.
  python3 - <<'PY'
import json, urllib.error

keys = ["RHOAIENG-1", "RHOAIENG-2"]
issues = []


class Boom:
    def __enter__(self):
        raise UnicodeDecodeError("utf-8", b"", 0, 1, "boom")

    def __exit__(self, *a):
        return False


class OkResp:
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def read(self):
        return json.dumps({
            "fields": {
                "summary": "ok",
                "description": "d",
                "status": {"name": "Open"},
            }
        }).encode()


responses = iter([Boom(), OkResp()])
for k in keys:
    try:
        with next(responses) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        issues.append({"key": k, "status": "ok", "summary": data["fields"]["summary"]})
    except urllib.error.HTTPError as exc:
        issues.append({"key": k, "status": "error", "reason": f"http-{exc.code}"})
    except Exception as exc:
        issues.append({"key": k, "status": "error", "reason": type(exc).__name__})

assert issues[0] == {"key": "RHOAIENG-1", "status": "error", "reason": "UnicodeDecodeError"}, issues
assert issues[1] == {"key": "RHOAIENG-2", "status": "ok", "summary": "ok"}, issues
print("PASS jira-snapshot: unexpected per-key failure recorded; loop continues")
PY

  # The row that reads the snapshot names it by its sandbox path, which is the
  # host_files dest the harness maps the producer file to.
  local jira_definition jira_prompt jira_snapshot jira_dest
  jira_snapshot="$(jq -r 'first(.dimensions[] | select(.id == "jira-snapshot") | .producer_file) // empty' \
    "${_DIR}/../dimensions.json")"
  jira_dest="$(awk -v src="${jira_snapshot}" '
    $1 == "-" && $2 == "src:" { current = $3; next }
    $1 == "src:" { current = $2; next }
    $1 == "dest:" && current == src { print $2; exit }
  ' "${_DIR}/../harness/review.yaml")"
  jira_definition="$(jq -r --arg dest "${jira_dest}" '
    first(.dimensions[]
      | select($dest != "" and (.context_file // "") == $dest)
      | .definition) // empty
  ' "${_DIR}/../dimensions.json")"
  jira_prompt="${_DIR}/../${jira_definition}"
  [[ -n "${jira_definition}" && -f "${jira_prompt}" ]]
  grep -Eiq 'untrusted (prompt )?data' "${jira_prompt}"
  grep -Eiq 'ignore instructions|never as instructions' "${jira_prompt}"
  echo "PASS jira-snapshot: prompt-injection boundary is explicit"

  rm -f "${tmp}"
  echo "All jira-snapshot self-tests passed"
}

if [[ "${1:-}" == "--self-test" ]]; then
  run_self_test
  exit 0
fi

run_producer "${1:-${_DEFAULT_OUT}}"
