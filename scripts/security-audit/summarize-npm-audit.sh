#!/usr/bin/env bash
# Summarize npm audit JSON into a compact finding list with fixability.
# Usage: summarize-npm-audit.sh <dir> <mode:prod|devdep> <audit.json> [error-message]
# Writes JSON to stdout.
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
  emit_error "invalid or missing npm audit JSON"
  exit 0
fi

# npm emits {"error":{...}} on registry/network/config failures — never treat as clean.
if jq -e 'has("error") and (.error != null)' "$AUDIT_JSON" >/dev/null 2>&1; then
  ERR_DETAIL=$(jq -r '.error.summary // .error.detail // .error.code // "npm audit error"' "$AUDIT_JSON")
  emit_error "npm audit error: ${ERR_DETAIL}"
  exit 0
fi

# Require a real audit report shape (not an empty/unknown object).
if ! jq -e 'has("vulnerabilities") or has("auditReportVersion")' "$AUDIT_JSON" >/dev/null 2>&1; then
  emit_error "npm audit JSON missing vulnerabilities/auditReportVersion"
  exit 0
fi

jq -c --arg dir "$DIR" --arg mode "$MODE" '
  def bucket:
    if .fixAvailable == false then "no_fix"
    elif (.fixAvailable | type) == "object" then
      if .fixAvailable.isSemVerMajor == true then "major" else "actionable" end
    elif .fixAvailable == true then "actionable"
    else "no_fix"
    end;

  def fix_version:
    if (.fixAvailable | type) == "object" then (.fixAvailable.version // "")
    elif .fixAvailable == true then "available"
    else ""
    end;

  def advisory_urls:
    [ .via[]? | select(type == "object") | (.url // empty) ] | unique;

  def primary_id:
    (advisory_urls[0] // .name);

  {
    dir: $dir,
    mode: $mode,
    status: "ok",
    error: null,
    findings: [
      (.vulnerabilities // {}) | to_entries[] |
      select(
        if $mode == "prod" then
          (.value.severity == "high" or .value.severity == "critical")
        else
          (.value.severity == "high" or .value.severity == "critical" or .value.severity == "moderate")
        end
      ) |
      {
        ecosystem: "npm",
        name: .key,
        severity: .value.severity,
        isDirect: (.value.isDirect // false),
        bucket: (.value | bucket),
        fixVersion: (.value | fix_version),
        isSemVerMajor: (
          if (.value.fixAvailable | type) == "object"
          then (.value.fixAvailable.isSemVerMajor == true)
          else false
          end
        ),
        advisories: (.value | advisory_urls),
        id: (.value | primary_id),
        rootWorkspace: ($dir == ".")
      }
    ]
  }
' "$AUDIT_JSON"
