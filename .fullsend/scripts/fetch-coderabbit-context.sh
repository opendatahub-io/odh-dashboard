#!/usr/bin/env bash
# Host-side CodeRabbit adapter for Fullsend review runs.
#
# The CodeRabbit API key is used only here, in the trusted context job. This
# script writes a bounded, normalized finding envelope for the host-side
# aggregator; raw CLI output and credentials never leave the runner.
#
# Usage:
#   fetch-coderabbit-context.sh
#   fetch-coderabbit-context.sh --self-test
set -euo pipefail

_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
_RUN_DIR="${_DIR}/../.run"
_OUT="${_RUN_DIR}/coderabbit.json"
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
}

normalize_stream() {
  local raw="$1"
  mkdir -p "${_RUN_DIR}"
  jq -s --argjson max_findings "${_MAX_FINDINGS}" '
    def clean:
      if type == "string" then gsub("[[:cntrl:]]"; " ") | .[0:4000] else "" end;
    # suggestions[] are patch snippets, so newlines are content. Clean each
    # line instead of flattening the block.
    def clean_block:
      if type == "string"
      then (split("\n") | map(gsub("[[:cntrl:]]"; " ")) | join("\n")) | .[0:4000]
      else "" end;
    # CodeRabbit documents suggestions as string[], but the CLI reference gives
    # no type and the schema doc that does is stale. Accept a bare string too,
    # and ignore any other shape: a jq type error here would fail the whole
    # envelope and lose every finding in it.
    def suggestion_text:
      (.suggestions? // null) as $s
      | (if ($s | type) == "array" then $s
         elif ($s | type) == "string" then [$s]
         else [] end)
      | map(select(type == "string") | clean_block | sub("\\s+$"; ""))
      | map(select(length > 0))
      | join("\n\n")
      | .[0:4000];
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
    (map(select(.type == "complete")) | last) as $done |
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
            description: $evidence,
            actionable: (($finding.severity // "info") != "none")
          } +
          ((($finding.lineNumber? // $finding.line?) | safe_line) as $line | if $line != null then {line: $line} else {} end) +
          (($finding | suggestion_text) as $fix | if $fix != "" then {remediation: $fix} else {} end)
        )
    ) as $findings |
    {
      id: "coderabbit",
      dimension: "coderabbit",
      kind: "cli-adapter",
      output: "findings",
      status: "ok",
      # What the CLI itself reported, so an empty findings list is readable as
      # "reviewed, nothing to report" rather than "never ran". A non-zero
      # reported_findings next to an empty findings list means this normalizer
      # dropped them, not that CodeRabbit was silent.
      review: {
        reported_findings: ($done.findings // null),
        unreviewed_files: ($done.unreviewedFileCount // 0),
        outcome: ($done.outcome // $done.status // "unknown")
      },
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
}

# The --agent stream carries no credentials (the key is passed in argv), and the
# runner masks registered secrets anyway. Without this, a 20-minute review
# leaves no trace in the job log and an empty result is unreadable.
summarize_stream() {
  local raw="$1"
  jq -rs '
    (group_by(.type) | map("\(.[0].type)=\(length)") | join(" ")) as $counts |
    ((map(select(.type == "complete")) | last) // null) as $done |
    "CodeRabbit stream: " + (if $counts == "" then "(empty)" else $counts end),
    "CodeRabbit complete: " + (
      if $done == null then "(no complete event)"
      else [
        "status=\($done.status // "?")",
        "outcome=\($done.outcome // "?")",
        "findings=\($done.findings // "?")",
        "unreviewed=\($done.unreviewedFileCount // 0)"
      ] | join(" ") end
    )
  ' "${raw}" 2>/dev/null || echo "CodeRabbit stream: (unparseable)"
}

run_producer() {
  local raw err exit_code api_key coderabbit_bin repo_slug base_ref head_sha
  raw="$(mktemp)"
  err="$(mktemp)"
  trap 'rm -f "${raw}" "${err}"' RETURN

  api_key="${FULLSEND_ADAPTER_TOKEN:-${CODERABBIT_API_KEY:-}}"
  coderabbit_bin="${FULLSEND_ADAPTER_BIN:-${CODERABBIT_BIN:-}}"
  repo_slug="${FULLSEND_ADAPTER_REPO:-${CODERABBIT_REPO:-}}"
  base_ref="${FULLSEND_ADAPTER_BASE_REF:-${CODERABBIT_BASE_REF:-}}"
  head_sha="${FULLSEND_ADAPTER_HEAD_SHA:-${CODERABBIT_HEAD_SHA:-}}"

  if [[ -z "${api_key}" ]]; then
    write_envelope "skipped" "api-key-unset"
    return 0
  fi
  if [[ ! -x "${coderabbit_bin}" ]]; then
    write_envelope "error" "cli-unavailable"
    return 0
  fi
  if [[ ! "${repo_slug}" =~ ^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$ ]]; then
    write_envelope "error" "target-repository-unavailable"
    return 0
  fi
  if [[ ! "${base_ref}" =~ ^[A-Za-z0-9._/-]+$ ]]; then
    write_envelope "error" "base-revision-invalid"
    return 0
  fi
  if [[ ! "${head_sha}" =~ ^[0-9a-f]{40}$ ]]; then
    write_envelope "error" "head-revision-invalid"
    return 0
  fi

  # Remote review: CodeRabbit's backend reads the PR content at head_sha itself.
  # Fork code is never fetched onto this runner, so it cannot reach the API key
  # through a fork-controlled .coderabbit.yaml / .coderabbit.config.ts (CWE-829).
  set +e
  timeout 20m "${coderabbit_bin}" review --agent \
    --remote "${repo_slug}" \
    --base "${base_ref}" \
    --source-branch "${head_sha}" \
    --api-key "${api_key}" > "${raw}" 2>"${err}"
  exit_code=$?
  set -e

  summarize_stream "${raw}"
  if [[ "${exit_code}" -ne 0 ]]; then
    echo "CodeRabbit CLI exited ${exit_code}; last stderr lines:" >&2
    tail -n 20 "${err}" >&2 || true
  fi

  if ! jq -s -e 'length > 0 and all(.[]; type == "object" and has("type"))' "${raw}" >/dev/null 2>&1; then
    write_envelope "error" "invalid-cli-output"
  elif [[ "${exit_code}" -ne 0 ]] || jq -s -e 'any(.[]; .type == "error")' "${raw}" >/dev/null; then
    write_envelope "error" "review-failed"
  elif jq -s -e 'any(.[]; .type == "complete" and .status == "review_skipped")' "${raw}" >/dev/null; then
    write_envelope "skipped" "no-changes"
  elif jq -s -e 'any(.[]; .type == "complete" and .outcome == "failed")' "${raw}" >/dev/null; then
    # A complete event can report status "review_completed" on a failed run.
    write_envelope "error" "review-incomplete"
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
    .findings[0].severity == "high"
    and .findings[0].line == "8"
    and .findings[0].description == "Handle the rejected promise."
  ' "${_OUT}" >/dev/null

  # suggestions[] is string[] of patch snippets (CodeRabbit's agent event
  # schema). Newlines inside a snippet are content, not formatting.
  printf '%s\n' \
    '{"type":"finding","severity":"major","fileName":"a.ts","codegenInstructions":"Guard the empty list.","suggestions":["if (!items.length) {\nreturn null;\n}","const safe = items ?? [];"]}' \
    '{"type":"finding","severity":"minor","fileName":"b.ts","codegenInstructions":"No snippet offered here.","suggestions":[]}' \
    '{"type":"finding","severity":"minor","fileName":"c.ts","codegenInstructions":"A bare string instead of an array.","suggestions":"const safe = items ?? [];"}' \
    '{"type":"finding","severity":"minor","fileName":"d.ts","codegenInstructions":"An unexpected shape is ignored, not fatal.","suggestions":{"patch":"x"}}' \
    '{"type":"complete","status":"completed"}' > "${temp_dir}/fix.ndjson"
  normalize_stream "${temp_dir}/fix.ndjson"
  jq -e '
    (.findings | length == 4)
    and .findings[0].remediation == "if (!items.length) {\nreturn null;\n}\n\nconst safe = items ?? [];"
    and (.findings[1] | has("remediation") | not)
    and .findings[2].remediation == "const safe = items ?? [];"
    and (.findings[3] | has("remediation") | not)
  ' "${_OUT}" >/dev/null

  # An empty result must stay distinguishable from a review that never ran, and
  # from one this normalizer filtered down to nothing.
  printf '%s\n' \
    '{"type":"complete","status":"review_completed","outcome":"completed","findings":0,"unreviewedFileCount":0}' \
    > "${temp_dir}/clean-empty.ndjson"
  normalize_stream "${temp_dir}/clean-empty.ndjson"
  jq -e '
    .status == "ok" and (.findings | length == 0)
    and .review.reported_findings == 0
    and .review.unreviewed_files == 0
    and .review.outcome == "completed"
  ' "${_OUT}" >/dev/null
  printf '%s\n' \
    '{"type":"finding","severity":"minor","fileName":"docs/pilot.md","codegenInstructions":"x , v w . v y x y -v , w y"}' \
    '{"type":"complete","status":"review_completed","outcome":"completed","findings":1,"unreviewedFileCount":3}' \
    > "${temp_dir}/filtered-empty.ndjson"
  normalize_stream "${temp_dir}/filtered-empty.ndjson"
  jq -e '
    (.findings | length == 0)
    and .review.reported_findings == 1
    and .review.unreviewed_files == 3
  ' "${_OUT}" >/dev/null
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
  FULLSEND_ADAPTER_TOKEN='test-token' \
  FULLSEND_ADAPTER_BIN="${temp_dir}/missing-coderabbit" \
    run_producer
  jq -e '.status == "error" and .reason == "cli-unavailable"' "${_OUT}" >/dev/null

  # Remote-review inputs are regex-validated before they reach the CLI argv.
  printf '#!/usr/bin/env bash\nexit 0\n' > "${temp_dir}/fake-coderabbit"
  chmod +x "${temp_dir}/fake-coderabbit"
  FULLSEND_ADAPTER_TOKEN='test-token' \
  FULLSEND_ADAPTER_BIN="${temp_dir}/fake-coderabbit" \
  FULLSEND_ADAPTER_REPO='owner/repo; rm -rf /' \
  FULLSEND_ADAPTER_BASE_REF='main' \
  FULLSEND_ADAPTER_HEAD_SHA="$(printf '0%.0s' {1..40})" \
    run_producer
  jq -e '.status == "error" and .reason == "target-repository-unavailable"' "${_OUT}" >/dev/null
  FULLSEND_ADAPTER_TOKEN='test-token' \
  FULLSEND_ADAPTER_BIN="${temp_dir}/fake-coderabbit" \
  FULLSEND_ADAPTER_REPO='opendatahub-io/odh-dashboard' \
  FULLSEND_ADAPTER_BASE_REF='' \
  FULLSEND_ADAPTER_HEAD_SHA="$(printf '0%.0s' {1..40})" \
    run_producer
  jq -e '.status == "error" and .reason == "base-revision-invalid"' "${_OUT}" >/dev/null
  FULLSEND_ADAPTER_TOKEN='test-token' \
  FULLSEND_ADAPTER_BIN="${temp_dir}/fake-coderabbit" \
  FULLSEND_ADAPTER_REPO='opendatahub-io/odh-dashboard' \
  FULLSEND_ADAPTER_BASE_REF='main' \
  FULLSEND_ADAPTER_HEAD_SHA='not-a-sha' \
    run_producer
  jq -e '.status == "error" and .reason == "head-revision-invalid"' "${_OUT}" >/dev/null
  echo "PASS CodeRabbit context normalization"
}

if [[ "${1:-}" == "--self-test" ]]; then
  run_self_test
  exit 0
fi

run_producer
