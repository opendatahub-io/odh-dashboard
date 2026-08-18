#!/usr/bin/env bash
# Summarize pnpm audit JSON into a compact finding list with fixability.
# Usage: summarize-pnpm-audit.sh <dir> <mode:prod|devdep> <audit.json> [error-message]
# Writes JSON to stdout (compatible with render-security-audit-report.js).
set -euo pipefail

DIR="${1:?dir required}"
MODE="${2:?mode required}"
AUDIT_JSON="${3:?audit json path required}"
ERROR_MSG="${4:-}"

emit_error() {
  local msg="$1"
  jq -n \
    --arg dir "$DIR" \
    --arg mode "$MODE" \
    --arg error "$msg" \
    '{dir:$dir, mode:$mode, status:"error", error:$error, findings:[]}'
}

if [[ -n "$ERROR_MSG" ]]; then
  emit_error "$ERROR_MSG"
  exit 0
fi

if [[ ! -f "$AUDIT_JSON" ]] || ! jq empty "$AUDIT_JSON" 2>/dev/null; then
  emit_error "invalid or missing pnpm audit JSON"
  exit 0
fi

# pnpm emits {"error":{...}} on registry/network/config failures — never treat as clean.
if jq -e 'has("error") and (.error != null)' "$AUDIT_JSON" >/dev/null 2>&1; then
  ERR_DETAIL=$(jq -r '.error.message // .error.code // "pnpm audit error"' "$AUDIT_JSON")
  emit_error "pnpm audit error: ${ERR_DETAIL}"
  exit 0
fi

# Require a real audit report shape (not an empty/unknown object).
if ! jq -e 'has("advisories")' "$AUDIT_JSON" >/dev/null 2>&1; then
  emit_error "pnpm audit JSON missing advisories"
  exit 0
fi

jq -c --arg dir "$DIR" --arg mode "$MODE" '
  def severity_ok:
    if $mode == "prod" then
      (. == "high" or . == "critical")
    else
      (. == "high" or . == "critical" or . == "moderate")
    end;

  def prod_finding:
    if $mode == "prod" then
      (.findings // [] | any(.dev == false))
    else
      true
    end;

  def is_direct:
    (.findings // [] | any(.paths[]? | test("^\\.>[^>]+$")));

  def advisory_urls:
    [ (.url // empty), (.github_advisory_id // empty | select(startswith("GHSA-")) | "https://github.com/advisories/" + .) ]
    | map(select(length > 0))
    | unique;

  def primary_id:
    (.github_advisory_id // .url // .module_name);

  def bucket:
    if (.patched_versions // "") == "" or (.patched_versions // "") == "<0.0.0" then "no_fix"
    else "actionable"
    end;

  def fix_version:
    if (.patched_versions // "") == "" or (.patched_versions // "") == "<0.0.0" then ""
    else .patched_versions
    end;

  {
    dir: $dir,
    mode: $mode,
    status: "ok",
    error: null,
    findings: [
      (.advisories // {}) | to_entries[] | .value
      | select(.severity | severity_ok)
      | select(prod_finding)
      | {
          ecosystem: "npm",
          name: .module_name,
          severity: .severity,
          isDirect: is_direct,
          bucket: bucket,
          fixVersion: fix_version,
          isSemVerMajor: false,
          advisories: advisory_urls,
          id: primary_id,
          rootWorkspace: ($dir == ".")
        }
    ]
  }
' "$AUDIT_JSON"
