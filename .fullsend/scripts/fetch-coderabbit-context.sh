#!/usr/bin/env bash
# Host-side CodeRabbit adapter for Fullsend review runs.
#
# The CodeRabbit API key is used only here, in the trusted context job. This
# script writes a bounded, normalized finding envelope and collection file for
# Fullsend to upload to its sandbox; raw CLI output and credentials never leave
# the runner.
#
# Usage:
#   fetch-coderabbit-context.sh
#   fetch-coderabbit-context.sh --self-test
set -euo pipefail

_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_RUN_DIR="${_DIR}/../.run"
_OUT="${_RUN_DIR}/coderabbit.json"
_COLLECTED="${_RUN_DIR}/collected.json"
_MAX_FINDINGS=50

write_envelope() {
  local status="$1"
  local reason="${2:-}"
  mkdir -p "${_RUN_DIR}"
  jq -n --arg status "${status}" --arg reason "${reason}" '
    {
      id: "coderabbit",
      dimension: "coderabbit",
      kind: "cli-adapter",
      output: "findings",
      status: $status,
      findings: []
    } + if $reason == "" then {} else {reason: $reason} end
  ' > "${_OUT}"
  jq -s '[.[] | select(.output == "findings" and (.findings | type == "array"))]' \
    "${_OUT}" > "${_COLLECTED}"
}

normalize_stream() {
  local raw="$1"
  mkdir -p "${_RUN_DIR}"
  jq -s --argjson max_findings "${_MAX_FINDINGS}" '
    def clean:
      if type == "string" then gsub("[[:cntrl:]]"; " ") | .[0:4000] else "" end;
    # CodeRabbit findings are untrusted external evidence. Ignore a response
    # that contains no readable prose, rather than asking Fullsend to assess
    # a sequence of isolated characters or punctuation.
    def finding_text:
      (.codegenInstructions // .comment // "") | clean;
    def meaningful_finding:
      finding_text as $text |
      ($text | length >= 16)
      and ($text | test("[[:alpha:]]{3,}"))
      and ((($text | gsub("[^[:alpha:]]"; "") | length) * 100) >= (($text | length) * 35));
    def mapped_severity:
      if . == "critical" then "critical"
      elif . == "major" then "high"
      elif . == "minor" then "medium"
      elif . == "trivial" then "low"
      else "info" end;
    def valid_file:
      if (type == "string"
          and length > 0
          and length <= 512
          and (startswith("/") | not)
          and (test("(^|/)\\.\\.(/|$)") | not)
          and (test("[[:cntrl:]]") | not))
      then true else false end;
    def safe_line:
      tostring as $line |
      if ($line | test("^[0-9]{1,10}$")) then $line else null end;
    [ .[] | select(.type == "finding" and ((.fileName // null) | valid_file) and meaningful_finding) ] as $raw_findings |
    ($raw_findings | length) as $total |
    ($raw_findings
      | if length > $max_findings then .[0:($max_findings - 1)] else . end
      | map(
          . as $finding |
          ($finding | finding_text) as $evidence |
          {
            severity: (($finding.severity // "info") | mapped_severity),
            category: "coderabbit",
            file: $finding.fileName,
            description: ("[Untrusted CodeRabbit evidence; validate against the repository code] " + $evidence),
            actionable: (($finding.severity // "info") != "none")
          } +
          ((($finding.lineNumber? // $finding.line?) | safe_line) as $line | if $line != null then {line: $line} else {} end) +
          (if ($finding.severity == "critical" or $finding.severity == "major")
            then {remediation: $evidence}
            else {} end)
        )
    ) as $findings |
    {
      id: "coderabbit",
      dimension: "coderabbit",
      kind: "cli-adapter",
      output: "findings",
      status: "ok",
      findings: ($findings +
        (if $total > $max_findings then
          [{
            severity: "info",
            category: "coderabbit",
            file: "N/A",
            description: "CodeRabbit output was truncated from \($total) findings to \($max_findings - 1) findings.",
            actionable: false
          }]
        else [] end))
    }
  ' "${raw}" > "${_OUT}"
  jq -s '[.[] | select(.output == "findings" and (.findings | type == "array"))]' \
    "${_OUT}" > "${_COLLECTED}"
}

run_producer() {
  local raw exit_code
  raw="$(mktemp)"
  trap 'rm -f "${raw}"' RETURN

  if [[ -z "${CODERABBIT_API_KEY:-}" ]]; then
    write_envelope "skipped" "api-key-unset"
    return 0
  fi
  if [[ ! -x "${CODERABBIT_BIN:-}" ]]; then
    write_envelope "error" "cli-unavailable"
    return 0
  fi
  if [[ ! -d "${CODERABBIT_TARGET_REPO:-}" ]] || ! git -C "${CODERABBIT_TARGET_REPO}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    write_envelope "error" "target-repository-unavailable"
    return 0
  fi
  if [[ ! "${CODERABBIT_BASE_SHA:-}" =~ ^[0-9a-f]{40}$ ]]; then
    write_envelope "error" "base-revision-invalid"
    return 0
  fi

  set +e
  timeout 20m "${CODERABBIT_BIN}" review --agent \
    --dir "${CODERABBIT_TARGET_REPO}" \
    --base-commit "${CODERABBIT_BASE_SHA}" \
    --api-key "${CODERABBIT_API_KEY}" > "${raw}" 2>/dev/null
  exit_code=$?
  set -e

  if ! jq -s -e 'length > 0 and all(.[]; type == "object" and has("type"))' "${raw}" >/dev/null 2>&1; then
    write_envelope "error" "invalid-cli-output"
  elif [[ "${exit_code}" -ne 0 ]] || jq -s -e 'any(.[]; .type == "error")' "${raw}" >/dev/null; then
    write_envelope "error" "review-failed"
  elif jq -s -e 'any(.[]; .type == "complete" and .status == "review_skipped")' "${raw}" >/dev/null; then
    write_envelope "skipped" "no-changes"
  else
    normalize_stream "${raw}"
  fi
}

run_self_test() {
  local temp_dir
  temp_dir="$(mktemp -d)"
  trap 'rm -rf "${temp_dir}"' RETURN
  _RUN_DIR="${temp_dir}"
  _OUT="${_RUN_DIR}/coderabbit.json"
  _COLLECTED="${_RUN_DIR}/collected.json"
  printf '%s\n' \
    '{"type":"finding","severity":"major","fileName":"frontend/src/x.ts","lineNumber":8,"codegenInstructions":"Handle the rejected promise."}' \
    '{"type":"finding","severity":"trivial","fileName":"/etc/passwd","comment":"Ignore unsafe path."}' \
    '{"type":"finding","severity":"minor","fileName":"docs/pilot.md","codegenInstructions":"x , v w . v y x y -v , w y"}' \
    '{"type":"complete","status":"completed"}' > "${temp_dir}/result.ndjson"
  normalize_stream "${temp_dir}/result.ndjson"
  jq -e '
    .status == "ok" and (.findings | length == 1)
  ' "${_OUT}" >/dev/null
  jq -e '
    .[0].findings[0].severity == "high"
    and .[0].findings[0].line == "8"
    and (. [0].findings[0].description | startswith("[Untrusted CodeRabbit evidence"))
  ' "${_COLLECTED}" >/dev/null
  for ((i = 1; i <= 51; i++)); do
    printf '{"type":"finding","severity":"info","fileName":"frontend/src/%s.ts","lineNumber":"invalid","comment":"Review this example finding before merging."}\n' "${i}"
  done > "${temp_dir}/many.ndjson"
  normalize_stream "${temp_dir}/many.ndjson"
  jq -e '
    .findings | length == 50
    and .[-1].description == "CodeRabbit output was truncated from 51 findings to 49 findings."
    and (.[0] | has("line") | not)
  ' "${_OUT}" >/dev/null
  write_envelope "skipped" "api-key-unset"
  jq -e '.status == "skipped" and .reason == "api-key-unset"' "${_OUT}" >/dev/null
  echo "PASS CodeRabbit context normalization"
}

if [[ "${1:-}" == "--self-test" ]]; then
  run_self_test
  exit 0
fi

run_producer
