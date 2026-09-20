#!/usr/bin/env bash
# Summarize govulncheck NDJSON into a compact finding list.
# Usage: summarize-govulncheck.sh <dir> <vulncheck.json> [error-message]
# Writes JSON to stdout.
#
# When error-message is set but the NDJSON still contains findings, those
# findings are kept and status stays "error" so the report cannot look clean.
set -euo pipefail

DIR="${1:?dir required}"
VULN_JSON="${2:?govulncheck json path required}"
ERROR_MSG="${3:-}"

emit_error_only() {
  jq -n \
    --arg dir "$DIR" \
    --arg error "$1" \
    '{dir:$dir, mode:"go", status:"error", error:$error, findings:[]}'
}

if [[ ! -f "$VULN_JSON" ]]; then
  emit_error_only "${ERROR_MSG:-missing govulncheck output}"
  exit 0
fi

if ! jq -s 'true' "$VULN_JSON" >/dev/null 2>&1; then
  emit_error_only "${ERROR_MSG:-invalid govulncheck JSON}"
  exit 0
fi

# Always parse findings when possible; overlay error status if provided.
jq -s -c --arg dir "$DIR" --arg err "${ERROR_MSG:-}" '
  def fixed_from_osv:
    [
      .affected[]? |
      .ranges[]? |
      select(.type == "SEMVER") |
      .events[]? |
      select(has("fixed")) |
      .fixed
    ]
    | unique
    | sort_by(ltrimstr("v") | split(".") | map(split("-")[0] | tonumber? // 0))
    | .[0] // "";

  def severity_from_osv:
    # Prefer database_specific severity string; OSV top-level .severity is a CVSS
    # object array and must not be passed to ascii_downcase.
    (
      if (.database_specific.severity | type) == "string" then .database_specific.severity
      elif (.severity | type) == "string" then .severity
      else "unknown"
      end
    ) | ascii_downcase;

  (map(select(has("osv")) | .osv) | map({key: .id, value: .}) | from_entries) as $osvs |

  # Merge findings by OSV, preferring entries with fixed_version
  (
    map(select(has("finding")) | .finding) |
    group_by(.osv) |
    map(
      sort_by(if (.fixed_version // "") == "" then 1 else 0 end) | .[0]
    )
  ) as $findings |

  {
    dir: $dir,
    mode: "go",
    status: (if ($err | length) > 0 then "error" else "ok" end),
    error: (if ($err | length) > 0 then $err else null end),
    findings: [
      $findings[] |
      ($osvs[.osv] // {}) as $osv |
      (if (.fixed_version // "") != "" then .fixed_version
       else ($osv | fixed_from_osv)
       end) as $fixed |
      {
        ecosystem: "go",
        name: .osv,
        severity: ($osv | severity_from_osv),
        isDirect: true,
        bucket: (if $fixed != "" then "actionable" else "no_fix" end),
        fixVersion: $fixed,
        isSemVerMajor: false,
        advisories: [("https://pkg.go.dev/vuln/" + .osv)],
        id: .osv,
        rootWorkspace: false
      }
    ]
  }
' "$VULN_JSON"
