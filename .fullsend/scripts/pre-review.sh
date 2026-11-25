#!/usr/bin/env bash
# shellcheck disable=SC2016,SC2030,SC2031 # self-test fixtures: literal script text, and subshells that override globals
# pre-review.sh — host pre-script for the review harness.
#
# A harness has one pre_script and an overlay's replaces the base's, so this
# wrapper runs the stock Fullsend pre-review itself and then the dashboard's
# host adapters:
#
#   1. Move the adapter credentials (the names the cli-adapter rows of
#      dimensions.json declare) out of the environment into shell variables.
#      Nothing started from here on inherits them.
#   2. Run stock/pre-review.sh, an unmodified copy of the stock script (see
#      stock/README.md), as a child with this script's arguments, stdin,
#      working directory and remaining environment. It validates the PR URL,
#      rewrites PRIOR_REVIEW_FILE to the validated findings ledger, skips
#      closed PRs and REVIEW_SKIP_AUTHORS, clears ready-for-merge and deepens
#      the clone. Its only channel back to `fullsend run` is its exit status
#      and the FULLSEND_PRESCRIPT_OUTPUT file; both pass through untouched.
#   3. Stop there when it failed (same exit status, which keeps exit 78, the
#      runner's neutral skip) or wrote skipped=true, so a skipped review buys
#      no adapter run.
#   4. Otherwise capture the PR's images and run every cli-adapter row in
#      parallel, each under `env -i` with only its own row's credentials and
#      never the review token, then collect the envelopes into
#      .run/collected.json for post-review.sh.
#
# The adapters call `gh`, so they run on GitHub only.
#
# Usage:
#   pre-review.sh                      # harness pre_script
#   pre-review.sh --self-test          # local checks: no network, no credentials
#   pre-review.sh --validate-adapters  # cli-adapter registry check only
set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# The stock script and the checksums that pin it. The self-test points
# _STOCK_SCRIPT at a stub; nothing in the environment can.
_STOCK_DIR="${_SCRIPT_DIR}/stock"
_STOCK_SCRIPT="${_STOCK_DIR}/pre-review.sh"

validate_dimension_registry() {
  "${_SCRIPT_DIR}/validate-dimensions.sh"
}

# ---------------------------------------------------------------------------
# Stock script
# ---------------------------------------------------------------------------
sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

# Every file SHA256SUMS lists must match, and the list must cover the script.
verify_stock_files() {
  local want name got covered=0
  [[ -f "${_STOCK_DIR}/SHA256SUMS" ]] || return 1
  while read -r want name; do
    [[ -n "${want}" ]] || continue
    [[ "${name}" =~ ^[A-Za-z0-9._-]+$ && -f "${_STOCK_DIR}/${name}" ]] || return 1
    got="$(sha256_of "${_STOCK_DIR}/${name}")" || return 1
    if [[ "${got}" != "${want}" ]]; then
      echo "::error::.fullsend/scripts/stock/${name} does not match SHA256SUMS; it must stay byte-identical to the stock file (stock/README.md)" >&2
      return 1
    fi
    [[ "${name}" == "pre-review.sh" ]] && covered=1
  done < "${_STOCK_DIR}/SHA256SUMS"
  [[ "${covered}" -eq 1 ]]
}

# Whether a pre-script output file asks for a skip, read the way `fullsend
# run` reads it (prescript-output v1): key=value lines, whitespace around
# key and value ignored, the last `skipped` assignment wins.
stock_requested_skip() {
  [[ -f "$1" ]] || return 1
  awk '
    {
      sub(/\r$/, "")
      i = index($0, "=")
      if (!i) next
      key = substr($0, 1, i - 1); value = substr($0, i + 1)
      gsub(/^[ \t]+|[ \t]+$/, "", key); gsub(/^[ \t]+|[ \t]+$/, "", value)
      if (key == "skipped") last = value
    }
    END { exit (last == "true") ? 0 : 1 }
  ' "$1"
}

# Run the stock script and set STOCK_STATUS and STOCK_SKIPPED. The child gets
# this process's arguments, stdin, stdout, stderr, working directory and
# environment. One exception: a CLI older than the output protocol exports no
# FULLSEND_PRESCRIPT_OUTPUT, and the stock script then skips with a bare
# exit 0 that looks like "proceed". The child gets a private file in that
# case so the skip is still seen here; the runner, which never reads it,
# behaves as it would have.
run_stock_pre_review() {
  local output_file="${FULLSEND_PRESCRIPT_OUTPUT:-}" private_file=""
  STOCK_STATUS=0
  STOCK_SKIPPED=0
  if [[ -n "${output_file}" ]]; then
    bash "${_STOCK_SCRIPT}" "$@" || STOCK_STATUS=$?
  else
    private_file="$(mktemp)" || return 1
    output_file="${private_file}"
    FULLSEND_PRESCRIPT_OUTPUT="${private_file}" bash "${_STOCK_SCRIPT}" "$@" || STOCK_STATUS=$?
  fi
  if [[ "${STOCK_STATUS}" -eq 0 ]] && stock_requested_skip "${output_file}"; then
    STOCK_SKIPPED=1
  fi
  if [[ -n "${private_file}" ]]; then
    rm -f "${private_file}"
  fi
}

# ---------------------------------------------------------------------------
# Adapter registry and credentials
# ---------------------------------------------------------------------------

# Credential variable names a cli-adapter row may not claim. Capture unsets
# every claimed name, and run_adapter forwards its value as
# FULLSEND_ADAPTER_*, so a row naming one of these would remove a variable
# the stock script or the runner needs (REVIEW_TOKEN, PATH, ...) or hand an
# adapter a token it must not see (GH_TOKEN, GITHUB_TOKEN, ...).
adapter_credential_name_reserved() {
  [[ "$1" =~ ^(PATH|HOME|TMPDIR|LANG|LC_ALL|CI|REPO|GH_TOKEN|JIRA_TOKEN|JIRA_USER_EMAIL|JIRA_BASE_URL|PR_.*|PRIOR_.*|REVIEW_.*|GITHUB_.*|GITLAB_.*|FULLSEND_.*|RUNNER_.*|ACTIONS_.*|OTEL_.*|GOOGLE_.*|CLOUDSDK_.*|LD_.*)$ ]]
}

adapter_credential_names() {
  jq -r '
    [.dimensions[]
      | select(.kind == "cli-adapter")
      | .host.credentials // {}
      | .url_env, .username_env, .token_env
      | select(type == "string" and . != "")]
    | unique[]
  ' "${_SCRIPT_DIR}/../dimensions.json"
}

validate_adapter_registry() {
  local registry="${_SCRIPT_DIR}/../dimensions.json"
  local runner setup_runner name
  if ! jq -e '
    (.dimensions | type == "array") and
    (([.dimensions[] | select(.kind == "cli-adapter") | .id] | unique | length) ==
      ([.dimensions[] | select(.kind == "cli-adapter")] | length)) and
    (([.dimensions[] | select(.kind == "cli-adapter") | .producer_file] | unique | length) ==
      ([.dimensions[] | select(.kind == "cli-adapter")] | length)) and
    all(
      .dimensions[] | select(.kind == "cli-adapter");
      (.id | type == "string" and test("^[a-z0-9][a-z0-9-]*$")) and
      (.output | type == "string" and test("^(context|findings|check:[a-z0-9-]+)$")) and
      (.runner | type == "string" and test("^scripts/[A-Za-z0-9._/-]+\\.sh$")) and
      (.producer_file | type == "string" and test("^\\.run/[A-Za-z0-9._-]+\\.json$")) and
      (.producer_file != ".run/collected.json") and
      (.producer_file != ".run/host-findings.json") and
      (.host.execution == "pre_review") and
      (.host.setup_runner | type == "string" and
        (. == "" or test("^scripts/[A-Za-z0-9._/-]+\\.sh$"))) and
      all(
        [(.host.credentials.url_env // ""), (.host.credentials.username_env // ""), (.host.credentials.token_env // "")][];
        type == "string" and test("^([A-Z][A-Z0-9_]*)?$")
      )
    )
  ' "${registry}" >/dev/null; then
    return 1
  fi

  while IFS= read -r name; do
    if adapter_credential_name_reserved "${name}"; then
      echo "::error::cli-adapter credential name ${name} is reserved" >&2
      return 1
    fi
  done < <(adapter_credential_names)

  while IFS=$'\t' read -r runner setup_runner; do
    [[ -f "${_SCRIPT_DIR}/../${runner}" ]] || return 1
    [[ -z "${setup_runner}" || -f "${_SCRIPT_DIR}/../${setup_runner}" ]] || return 1
  done < <(jq -r '
    .dimensions[]
    | select(.kind == "cli-adapter")
    | [.runner, (.host.setup_runner // "")]
    | @tsv
  ' "${registry}")
}

# The harness sends this for a credential whose secret is not set: `fullsend
# run` refuses both an unset env.runner reference and an empty value.
ADAPTER_CREDENTIAL_UNSET="odh-adapter-credential-unset"

# Adapter credentials arrive through env.runner (FULLSEND_GITHUB_RUNNER_SECRETS,
# ADR 0136), so they sit in this script's environment and would reach every
# child it starts, the stock script included. Move each name a registry row
# declares into an unexported shell variable and unset it; only the jq that
# reads the registry runs first. run_adapter then hands an adapter only its
# own row's values. Bash 3.2 has no associative arrays, hence the
# _ADAPTER_CRED_<NAME> variables.
#
# A reserved or malformed name fails the review here, before anything is
# unset, rather than leaving the run without a variable it needs. The unset
# placeholder is stored as empty.
capture_adapter_credentials() {
  local name names
  names="$(adapter_credential_names)" || return 1
  while IFS= read -r name; do
    [[ -n "${name}" ]] || continue
    if [[ ! "${name}" =~ ^[A-Z][A-Z0-9_]*$ ]] || adapter_credential_name_reserved "${name}"; then
      echo "::error::cli-adapter credential name ${name} is reserved or invalid" >&2
      return 1
    fi
  done <<< "${names}"
  while IFS= read -r name; do
    [[ -n "${name}" ]] || continue
    if [[ "${!name:-}" == "${ADAPTER_CREDENTIAL_UNSET}" ]]; then
      printf -v "_ADAPTER_CRED_${name}" '%s' ""
    else
      printf -v "_ADAPTER_CRED_${name}" '%s' "${!name:-}"
    fi
    unset "${name}"
  done <<< "${names}"
}

adapter_credential() {
  local var="_ADAPTER_CRED_${1}"
  if [[ -n "${1}" ]]; then
    printf '%s' "${!var:-}"
  fi
}

# ---------------------------------------------------------------------------
# Adapter runs
# ---------------------------------------------------------------------------

# The environment an adapter process starts from. This script's environment
# holds the minted review token (REVIEW_TOKEN, GH_TOKEN) and the other
# host-script variables, and a setup step runs a vendor installer, so neither
# setup nor runner inherits it: they get these names, plus what run_adapter
# adds. JIRA_BASE_URL is the public browse URL; the Jira API URL is forwarded
# only to its adapter as a credential.
adapter_base_env() {
  local name
  for name in PATH HOME TMPDIR LANG LC_ALL RUNNER_TEMP; do
    [[ -n "${!name:-}" ]] && printf '%s=%s\0' "${name}" "${!name}"
  done
  printf 'CI=true\0'
}

# One adapter: optional setup, then the runner, with only this row's
# credentials and the PR revision. A setup failure is not fatal; the runner
# reports its missing tool in its own envelope. Setup is skipped when the row
# needs a token and has none, since the runner then only writes "skipped".
run_adapter() {
  local id="$1" runner="$2" setup_runner="$3" url_env="$4" username_env="$5" token_env="$6"
  local token env_file entry adapter_bin="" base_env=()
  while IFS= read -r -d '' entry; do
    base_env+=("${entry}")
  done < <(adapter_base_env)
  token="$(adapter_credential "${token_env}")"

  if [[ -n "${setup_runner}" && ( -z "${token_env}" || -n "${token}" ) ]]; then
    env_file="$(mktemp)"
    if env -i "${base_env[@]}" FULLSEND_ADAPTER_ENV_FILE="${env_file}" \
      bash "${_SCRIPT_DIR}/../${setup_runner}"; then
      adapter_bin="$(sed -n 's/^FULLSEND_ADAPTER_BIN=//p' "${env_file}" | tail -n 1)"
    else
      echo "::warning::Setup for the ${id} adapter failed; it reports the missing tool itself"
    fi
    rm -f "${env_file}"
  fi

  env -i "${base_env[@]}" \
    JIRA_BASE_URL="${JIRA_BASE_URL:-}" \
    FULLSEND_ADAPTER_URL="$(adapter_credential "${url_env}")" \
    FULLSEND_ADAPTER_USERNAME="$(adapter_credential "${username_env}")" \
    FULLSEND_ADAPTER_TOKEN="${token}" \
    FULLSEND_ADAPTER_BIN="${adapter_bin}" \
    FULLSEND_ADAPTER_REPO="${REPO:-}" \
    FULLSEND_ADAPTER_BASE_REF="${PR_BASE_REF:-}" \
    FULLSEND_ADAPTER_BASE_SHA="${PR_BASE_SHA:-}" \
    FULLSEND_ADAPTER_HEAD_SHA="${PR_HEAD_SHA:-}" \
    REVIEW_PR_TITLE="${REVIEW_PR_TITLE:-}" \
    REVIEW_PR_BODY="${REVIEW_PR_BODY:-}" \
    bash "${_SCRIPT_DIR}/../${runner}"
}

write_adapter_failure_envelope() {
  local id="$1" output="$2" producer_file="$3" reason="$4" destination
  destination="${_SCRIPT_DIR}/../${producer_file}"
  mkdir -p "$(dirname "${destination}")"
  jq -n --arg id "${id}" --arg output "${output}" --arg reason "${reason}" '
    {id: $id, dimension: $id, kind: "cli-adapter", output: $output,
     status: "error", reason: $reason}
    + (if $output == "findings" then {findings: []} else {} end)
  ' > "${destination}"
}

# Adapters are independent, so they run at once and the review waits only for
# the slowest (CodeRabbit, up to 20 minutes). Each one's output is buffered and
# printed whole, in registry order. An adapter that exits non-zero, or exits
# zero without writing its envelope, gets an `error` envelope in place of
# whatever it left, so the review reports it as errored instead of missing.
# The review itself carries on: every adapter row is failure_severity "info".
run_pre_review_adapters() {
  local registry="${_SCRIPT_DIR}/../dimensions.json"
  local id runner setup_runner url_env username_env token_env output producer_file i log_dir code
  local ids=() pids=() outputs=() producer_files=()
  log_dir="$(mktemp -d)"
  # Fields are joined with "|", not @tsv: tab is IFS whitespace, so `read`
  # would merge the empty credential fields and shift the columns. The registry
  # check allows no "|" in any of these values.
  while IFS='|' read -r id output producer_file runner setup_runner url_env username_env token_env; do
    [[ -n "${id}" ]] || continue
    rm -f "${_SCRIPT_DIR}/../${producer_file}"
    run_adapter "${id}" "${runner}" "${setup_runner}" "${url_env}" "${username_env}" "${token_env}" \
      > "${log_dir}/${id}.log" 2>&1 < /dev/null &
    ids+=("${id}")
    outputs+=("${output}")
    producer_files+=("${producer_file}")
    pids+=("$!")
  done < <(jq -r '
    .dimensions[]
    | select(.kind == "cli-adapter" and .host.execution == "pre_review")
    | [.id, .output, .producer_file, .runner, (.host.setup_runner // ""),
       (.host.credentials.url_env // ""), (.host.credentials.username_env // ""), (.host.credentials.token_env // "")]
    | join("|")
  ' "${registry}")
  for ((i = 0; i < ${#ids[@]}; i++)); do
    code=0
    wait "${pids[i]}" || code=$?
    if [[ "${code}" -ne 0 ]]; then
      echo "::group::${ids[i]} adapter (exited ${code})"
      write_adapter_failure_envelope "${ids[i]}" "${outputs[i]}" "${producer_files[i]}" "adapter-exited-${code}"
    elif [[ ! -s "${_SCRIPT_DIR}/../${producer_files[i]}" ]]; then
      echo "::group::${ids[i]} adapter (wrote no envelope)"
      write_adapter_failure_envelope "${ids[i]}" "${outputs[i]}" "${producer_files[i]}" "adapter-wrote-no-output"
    else
      echo "::group::${ids[i]} adapter"
    fi
    cat "${log_dir}/${ids[i]}.log"
    echo "::endgroup::"
  done
  rm -rf "${log_dir}"
}

# .run/collected.json: an array holding every adapter envelope, in registry
# order. post-review.sh reads CodeRabbit's findings and each adapter's status
# from it.
aggregate_cli_adapters() {
  local run_dir="${_SCRIPT_DIR}/../.run"
  local producer_file file
  local files=()

  while IFS= read -r producer_file; do
    file="${_SCRIPT_DIR}/../${producer_file}"
    [[ -f "${file}" ]] && files+=("${file}")
  done < <(jq -r '.dimensions[] | select(.kind == "cli-adapter") | .producer_file' \
    "${_SCRIPT_DIR}/../dimensions.json")

  mkdir -p "${run_dir}"
  if ((${#files[@]} == 0)); then
    printf '[]\n' > "${run_dir}/collected.json"
  else
    jq -s '[.[] | select(
      type == "object" and
      .kind == "cli-adapter" and
      (.output | type == "string")
    )]' \
      "${files[@]}" > "${run_dir}/collected.json"
  fi
  write_host_findings "${run_dir}"
}

# .run/host-findings.json: the findings of every findings adapter that ran,
# each with a ref ("<adapter id>-<position>"), for the challenger to weigh
# next to the reviewers' findings. The harness stages it into the sandbox.
# post-review.sh derives the same refs from collected.json and applies the
# challenger's decisions; the file is absent when there is nothing to weigh.
write_host_findings() {
  local run_dir="$1"
  rm -f "${run_dir}/host-findings.json"
  jq '{findings: [.[]
        | select(.output == "findings" and .status == "ok" and (.findings | type == "array"))
        | .id as $id
        | .findings | to_entries[]
        | select(.value | type == "object")
        | {ref: "\($id)-\(.key + 1)", source: $id}
          + (.value | {severity, category, file, line, description, remediation}
             | with_entries(select(.value != null)))]}' \
    "${run_dir}/collected.json" > "${run_dir}/host-findings.json.tmp"
  if jq -e '.findings | length > 0' "${run_dir}/host-findings.json.tmp" >/dev/null; then
    mv "${run_dir}/host-findings.json.tmp" "${run_dir}/host-findings.json"
  else
    rm -f "${run_dir}/host-findings.json.tmp"
  fi
}

# ---------------------------------------------------------------------------
# PR context for the adapters
# ---------------------------------------------------------------------------

# REPO and PR_NUMBER from PR_URL, by the stock script's own rule (its
# forge_validate_pr_url and forge_parse_pr_url). The stock script sets them in
# its own process only, and it has already rejected a URL that fails here.
resolve_pr_coordinates() {
  local origin="${GITHUB_SERVER_URL:-https://github.com}" path
  origin="${origin%/}"
  [[ "${origin}" =~ ^https://[a-zA-Z0-9.-]+(:[0-9]+)?$ ]] || return 1
  [[ "${PR_URL:-}" == "${origin}/"* ]] || return 1
  path="${PR_URL#"${origin}/"}"
  [[ "${path}" =~ ^([a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+)/pull/([0-9]+)$ ]] || return 1
  REPO="${BASH_REMATCH[1]}"
  PR_NUMBER="${BASH_REMATCH[2]}"
}

# Title and body for trusted Jira-key parsing, and the revisions CodeRabbit
# reviews. Read from the forge, not taken from the event, so adapter context
# matches the PR as the review starts (ADR 0106).
fetch_pr_view() {
  GH_TOKEN="${REVIEW_TOKEN}" gh pr view "${PR_NUMBER}" \
    --repo "${REPO}" --json title,body,headRefOid,baseRefOid,baseRefName 2>/dev/null || true
}

# Everything after the stock script: PR image capture and the adapters. Each
# step that must stop the review exits explicitly; this function does not rely
# on errexit, which the shell suspends when a caller tests its status.
run_host_adapters() {
  local pr_view image_log="" image_pid=""

  if ! resolve_pr_coordinates; then
    echo "::error::PR_URL is not a pull request on ${GITHUB_SERVER_URL:-https://github.com}" >&2
    exit 1
  fi
  pr_view="$(fetch_pr_view)"
  PR_HEAD_SHA="$(printf '%s' "${pr_view}" | jq -r '.headRefOid // empty' 2>/dev/null || true)"
  PR_BASE_SHA="$(printf '%s' "${pr_view}" | jq -r '.baseRefOid // empty' 2>/dev/null || true)"
  PR_BASE_REF="$(printf '%s' "${pr_view}" | jq -r '.baseRefName // empty' 2>/dev/null || true)"
  REVIEW_PR_TITLE="$(printf '%s' "${pr_view}" | jq -r '.title // empty' 2>/dev/null || true)"
  REVIEW_PR_BODY="$(printf '%s' "${pr_view}" | jq -r '.body // empty' 2>/dev/null || true)"
  if [[ ! "${PR_HEAD_SHA}" =~ ^[0-9a-fA-F]{40}$ ]]; then
    echo "::error::PR head SHA is missing or invalid (expected 40 hexadecimal characters), got: '${PR_HEAD_SHA:-}'" >&2
    exit 1
  fi

  # Capture images attached to the PR body and issue comments while the
  # adapters run. Only GitHub attachment hosts are fetched; host_files stages
  # the manifest and tarball. The script fails open and keeps REVIEW_TOKEN on
  # the host.
  if [[ -f "${_SCRIPT_DIR}/fetch-pr-images.sh" ]]; then
    image_log="$(mktemp)"
    (
      export REPO PR_NUMBER PR_HEAD_SHA REVIEW_PR_BODY
      bash "${_SCRIPT_DIR}/fetch-pr-images.sh"
    ) > "${image_log}" 2>&1 < /dev/null &
    image_pid="$!"
  fi

  run_pre_review_adapters || exit 1
  aggregate_cli_adapters || exit 1

  if [[ -n "${image_pid}" ]]; then
    if ! wait "${image_pid}"; then
      echo "::warning::PR image capture failed; continuing without images"
    fi
    cat "${image_log}" 2>/dev/null || true
    rm -f "${image_log}"
  fi
}

main() {
  # Before any child process starts, other than the jq that reads the
  # registry.
  capture_adapter_credentials || exit 1

  if ! validate_dimension_registry || ! validate_adapter_registry; then
    echo "::error::Invalid .fullsend/dimensions.json" >&2
    exit 1
  fi
  verify_stock_files || {
    echo "::error::The vendored stock pre-review script failed its checksum" >&2
    exit 1
  }

  run_stock_pre_review "$@" || exit 1
  if [[ "${STOCK_STATUS}" -ne 0 ]]; then
    exit "${STOCK_STATUS}"
  fi
  if [[ "${STOCK_SKIPPED}" -eq 1 ]]; then
    echo "Stock pre-review skipped the review — host adapters not run"
    exit 0
  fi
  # With no token the stock script stops before its PR state check, so the
  # PR is not known to be open, and the adapters could not read it anyway.
  if [[ -z "${REVIEW_TOKEN:-}" ]]; then
    echo "::warning::No REVIEW_TOKEN — host adapters not run"
    exit 0
  fi
  if [[ "${FULLSEND_FORGE:-}" != "github" ]]; then
    echo "::warning::Host adapters run on GitHub only — not run for forge '${FULLSEND_FORGE:-}'"
    exit 0
  fi

  run_host_adapters
  echo "Host adapters finished for PR #${PR_NUMBER}"
}

# ---------------------------------------------------------------------------
# Self-test
# ---------------------------------------------------------------------------

# A fixture .fullsend tree in $1: a stub for every adapter script, four
# cli-adapter rows, and a stub stock script whose behaviour STUB_STOCK_MODE
# selects. Runners and the stock stub record the environment they were given.
write_self_test_fixture() {
  local root="$1" scripts="$1/scripts"
  mkdir -p "${scripts}/stock" "${root}/.run"
  printf '%s\n' '#!/usr/bin/env bash' \
    'env | grep -E "^(FULLSEND_ADAPTER_|JIRA_BASE_URL|ALPHA_|BETA_|GAMMA_|REVIEW_|GH_)" | sort > "${0%.sh}.env"' > "${scripts}/a.sh"
  cp "${scripts}/a.sh" "${scripts}/b.sh"
  cp "${scripts}/a.sh" "${scripts}/c.sh"
  printf '%s\n' '#!/usr/bin/env bash' \
    'env | grep -E "^(ALPHA_|BETA_|GAMMA_|REVIEW_|GH_)" > "${0%.sh}.env" || true' \
    'printf "FULLSEND_ADAPTER_BIN=/opt/tool\n" >> "${FULLSEND_ADAPTER_ENV_FILE}"' > "${scripts}/setup.sh"
  cp "${scripts}/setup.sh" "${scripts}/setup-c.sh"
  printf '%s\n' '#!/usr/bin/env bash' 'echo partial > "${0%/scripts/d.sh}/.run/d.json"' 'exit 3' > "${scripts}/d.sh"
  printf '%s\n' '#!/usr/bin/env bash' \
    'jq -n "{id: \"e\", dimension: \"e\", kind: \"cli-adapter\", output: \"context\", status: \"ok\"}" > "${0%/scripts/e.sh}/.run/e.json"' > "${scripts}/e.sh"
  printf '%s\n' '#!/usr/bin/env bash' \
    'here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"' \
    'env > "${here}/stock.env"' \
    'printf "%s\n" "$@" > "${here}/stock.argv"' \
    'cat > "${here}/stock.stdin"' \
    'pwd > "${here}/stock.cwd"' \
    'echo "stock stdout"; echo "stock stderr" >&2' \
    'case "${STUB_STOCK_MODE:-proceed}" in' \
    '  skip) if [[ -n "${FULLSEND_PRESCRIPT_OUTPUT:-}" ]]; then printf "skipped=true\nreason=closed\n" >> "${FULLSEND_PRESCRIPT_OUTPUT}"; fi ;;' \
    '  fail) exit 7 ;;' \
    '  neutral) exit 78 ;;' \
    'esac' \
    'exit 0' > "${scripts}/stock/pre-review.sh"
  jq -n '{dimensions: [
    {id: "a", kind: "cli-adapter", output: "context", runner: "scripts/a.sh", producer_file: ".run/a.json",
     host: {execution: "pre_review", setup_runner: "scripts/setup.sh",
            credentials: {url_env: "ALPHA_URL", token_env: "ALPHA_TOKEN"}}},
    {id: "b", kind: "cli-adapter", output: "findings", runner: "scripts/b.sh", producer_file: ".run/b.json",
     host: {execution: "pre_review", setup_runner: "",
            credentials: {token_env: "BETA_TOKEN"}}},
    {id: "c", kind: "cli-adapter", output: "findings", runner: "scripts/c.sh", producer_file: ".run/c.json",
     host: {execution: "pre_review", setup_runner: "scripts/setup-c.sh",
            credentials: {token_env: "GAMMA_TOKEN"}}},
    {id: "d", kind: "cli-adapter", output: "findings", runner: "scripts/d.sh", producer_file: ".run/d.json",
     host: {execution: "pre_review", setup_runner: "",
            credentials: {}}},
    {id: "e", kind: "cli-adapter", output: "context", runner: "scripts/e.sh", producer_file: ".run/e.json",
     host: {execution: "pre_review", setup_runner: "",
            credentials: {}}}
  ]}' > "${root}/dimensions.json"
}

# Run main against the fixture in $1 with the stub stock script, the registry
# validators and checksum stubbed out, and a canned PR. Prints main's exit
# status; its output goes to $1/main.out.
run_main_in_fixture() {
  local root="$1" mode="$2" output_mode="${3:-file}" review_token="${4-review-token-value}" code=0
  rm -f "${root}"/scripts/*.env "${root}"/scripts/stock/stock.* "${root}"/.run/*.json "${root}/prescript.out"
  (
    _SCRIPT_DIR="${root}/scripts"
    _STOCK_DIR="${root}/scripts/stock"
    _STOCK_SCRIPT="${_STOCK_DIR}/pre-review.sh"
    validate_dimension_registry() { :; }
    verify_stock_files() { :; }
    fetch_pr_view() {
      printf '{"title":"fix: t","body":"b","headRefOid":"%s","baseRefOid":"%s","baseRefName":"main"}' \
        "$(printf 'a%.0s' {1..40})" "$(printf 'b%.0s' {1..40})"
    }
    export ALPHA_URL="https://api.example.test" ALPHA_TOKEN="alpha-token-value" BETA_TOKEN="beta-token-value"
    export GAMMA_TOKEN="${ADAPTER_CREDENTIAL_UNSET}"
    export GH_TOKEN="gh-token-value" JIRA_BASE_URL="https://jira.example.test"
    if [[ -n "${review_token}" ]]; then
      export REVIEW_TOKEN="${review_token}"
    else
      unset REVIEW_TOKEN
    fi
    export PR_URL="https://github.com/o/r/pull/61" FULLSEND_FORGE=github
    export STUB_STOCK_MODE="${mode}"
    unset GITHUB_SERVER_URL
    if [[ "${output_mode}" == "file" ]]; then
      : > "${root}/prescript.out"
      export FULLSEND_PRESCRIPT_OUTPUT="${root}/prescript.out"
    else
      unset FULLSEND_PRESCRIPT_OUTPUT
    fi
    cd "${root}"
    printf 'stdin-line\n' | main --flag "two words"
  ) > "${root}/main.out" 2>&1 || code=$?
  printf '%s' "${code}"
}

run_self_test() {
  local fail=0 temp_dir root code
  pass() { echo "PASS $1"; }
  flunk() { echo "FAIL $1" >&2; fail=1; }

  # --- The vendored stock script -------------------------------------------
  if verify_stock_files; then
    pass "stock files match SHA256SUMS"
  else
    flunk "stock files do not match SHA256SUMS"
  fi
  temp_dir="$(mktemp -d)"
  cp "${_STOCK_DIR}/SHA256SUMS" "${_STOCK_DIR}/review-categories.json" "${temp_dir}/"
  { cat "${_STOCK_DIR}/pre-review.sh"; echo '# edited'; } > "${temp_dir}/pre-review.sh"
  if (_STOCK_DIR="${temp_dir}"; verify_stock_files) 2>/dev/null; then
    flunk "an edited stock script passed the checksum"
  else
    pass "an edited stock script fails the checksum"
  fi
  rm -rf "${temp_dir}"
  # What this wrapper assumes about the stock script: it reports a skip
  # through the output file, and never by a status the wrapper would miss.
  # shellcheck disable=SC2016 # literal text of the stock script
  if grep -qF 'printf '"'"'%s=%s\n'"'"' "$1" "$2" >> "${FULLSEND_PRESCRIPT_OUTPUT}"' "${_STOCK_SCRIPT}" \
    && grep -qE '^ *prescript_output "skipped" "true"$' "${_STOCK_SCRIPT}"; then
    pass "stock script signals skip through FULLSEND_PRESCRIPT_OUTPUT"
  else
    flunk "stock script no longer signals skip the way this wrapper reads it"
  fi
  # Reviewer findings are projected into the sticky comment's marker, which
  # the stock script validates against its own category list on the next
  # review; one category outside it rejects the whole ledger.
  if jq -e --rawfile stock "${_STOCK_SCRIPT}" '
      ($stock | capture("def allowed_category:\\s+IN\\((?<list>[^)]*)\\)").list
        | [scan("\"([a-z0-9-]+)\"") | .[0]]) as $allowed
      | ($allowed | length) > 0 and
        ([.dimensions[] | select(.kind != "cli-adapter") | .categories[]?] - $allowed | length) == 0
    ' "${_SCRIPT_DIR}/../dimensions.json" >/dev/null; then
    pass "reviewer categories are all accepted by the stock prior-review validator"
  else
    flunk "a reviewer category in dimensions.json is rejected by the stock prior-review validator"
  fi

  # --- Registry -------------------------------------------------------------
  if validate_dimension_registry >/dev/null; then
    pass "dimension registry"
  else
    flunk "dimension registry validation failed"
  fi
  if validate_adapter_registry; then
    pass "cli-adapter registry"
  else
    flunk "cli-adapter registry validation failed"
  fi
  temp_dir="$(mktemp -d)"
  if (
    check() { "${_SCRIPT_DIR}/validate-dimensions.sh" "${temp_dir}/r.json" >/dev/null 2>&1; }
    mutate() { jq "$1" "${_SCRIPT_DIR}/../dimensions.json" > "${temp_dir}/r.json"; }
    mutate '.' && check || exit 1
    mutate '.dimensions[0].categories += ["not-a-stock-category"]'; if check; then exit 1; fi
    mutate '.dimensions[0].categories = []'; if check; then exit 1; fi
    mutate '.dimensions[0] |= del(.label)'; if check; then exit 1; fi
    mutate '.dimensions[0].kind = "other"'; if check; then exit 1; fi
    mutate '.dimensions[0].output = "bogus"'; if check; then exit 1; fi
    mutate '.dimensions += [.dimensions[0]]'; if check; then exit 1; fi
    mutate '(.dimensions[] | select(.output | startswith("signal:"))) |= del(.result_fields)'; if check; then exit 1; fi
    # The exemption is for cli-adapter rows only.
    mutate '.dimensions[0].categories += ["coderabbit"]'; if check; then exit 1; fi
    true
  ); then
    pass "dimension registry rejects malformed rows and non-stock categories"
  else
    flunk "dimension registry accepted a malformed row or a non-stock category"
  fi
  rm -rf "${temp_dir}"

  # --- Skip signal ----------------------------------------------------------
  temp_dir="$(mktemp -d)"
  if (
    f="${temp_dir}/out"
    expect() { printf '%b' "$2" > "${f}"; if stock_requested_skip "${f}"; then [[ "$1" == yes ]]; else [[ "$1" == no ]]; fi; }
    expect yes 'skipped=true\nreason=PR #1 is already closed\n' || exit 1
    expect yes '  skipped = true \r\n' || exit 1
    expect no '' || exit 1
    expect no 'reason=skipped=true\n' || exit 1
    expect no 'skipped=true\nskipped=false\n' || exit 1
    expect yes 'skipped=false\nskipped=true\n' || exit 1
    expect no '# skipped=true\n' || exit 1
    if stock_requested_skip "${temp_dir}/absent"; then exit 1; fi
  ); then
    pass "skip signal parsing"
  else
    flunk "skip signal parsing"
  fi
  rm -rf "${temp_dir}"

  # --- Wrapper flow against a stub stock script -----------------------------
  root="$(mktemp -d)"
  write_self_test_fixture "${root}"
  has_line() { grep -qx -- "$1" "$2"; }
  has_text() { grep -qE -- "$1" "${@:2}"; }

  # Proceed: the stock child saw no adapter credential, kept everything else,
  # and the adapters ran afterwards.
  code="$(run_main_in_fixture "${root}" proceed)"
  if [[ "${code}" == 0 && -f "${root}/scripts/stock/stock.env" ]] \
    && ! has_text '^(ALPHA_URL|ALPHA_TOKEN|BETA_TOKEN|GAMMA_TOKEN)=' "${root}/scripts/stock/stock.env" \
    && ! has_text 'alpha-token-value|beta-token-value|api\.example\.test|odh-adapter-credential-unset' "${root}/scripts/stock/stock.env" \
    && has_line 'REVIEW_TOKEN=review-token-value' "${root}/scripts/stock/stock.env" \
    && has_line 'GH_TOKEN=gh-token-value' "${root}/scripts/stock/stock.env" \
    && has_line 'PR_URL=https://github.com/o/r/pull/61' "${root}/scripts/stock/stock.env" \
    && has_line "FULLSEND_PRESCRIPT_OUTPUT=${root}/prescript.out" "${root}/scripts/stock/stock.env"; then
    pass "stock child runs without adapter credentials and with the rest of the environment"
  else
    flunk "stock child environment (exit ${code})"; cat "${root}/main.out" >&2
  fi
  if [[ "$(cat "${root}/scripts/stock/stock.argv" 2>/dev/null)" == $'--flag\ntwo words' \
    && "$(cat "${root}/scripts/stock/stock.stdin" 2>/dev/null)" == "stdin-line" \
    && "$(cd "${root}" && pwd -P)" == "$(cd "$(cat "${root}/scripts/stock/stock.cwd" 2>/dev/null)" && pwd -P)" ]] \
    && has_line 'stock stdout' "${root}/main.out" && has_line 'stock stderr' "${root}/main.out" \
    && [[ ! -s "${root}/prescript.out" ]]; then
    pass "stock child gets argv, stdin and cwd; its output passes through"
  else
    flunk "stock child argv, stdin, cwd or output"
  fi
  # Each adapter sees only its own row's values, under the generic names; no
  # adapter or setup sees a raw credential name or the review token; setup
  # hands over the tool path; a row with no token skips its setup.
  if [[ -f "${root}/scripts/a.env" && -f "${root}/scripts/b.env" && -f "${root}/scripts/c.env" && -f "${root}/scripts/setup.env" ]] \
    && has_line 'FULLSEND_ADAPTER_TOKEN=alpha-token-value' "${root}/scripts/a.env" \
    && has_line 'FULLSEND_ADAPTER_URL=https://api.example.test' "${root}/scripts/a.env" \
    && has_line 'FULLSEND_ADAPTER_BIN=/opt/tool' "${root}/scripts/a.env" \
    && has_line 'FULLSEND_ADAPTER_REPO=o/r' "${root}/scripts/a.env" \
    && has_line 'FULLSEND_ADAPTER_BASE_REF=main' "${root}/scripts/a.env" \
    && has_line "FULLSEND_ADAPTER_HEAD_SHA=$(printf 'a%.0s' {1..40})" "${root}/scripts/a.env" \
    && has_line "FULLSEND_ADAPTER_BASE_SHA=$(printf 'b%.0s' {1..40})" "${root}/scripts/a.env" \
    && has_line 'REVIEW_PR_TITLE=fix: t' "${root}/scripts/a.env" \
    && has_line 'JIRA_BASE_URL=https://jira.example.test' "${root}/scripts/a.env" \
    && has_line 'FULLSEND_ADAPTER_TOKEN=beta-token-value' "${root}/scripts/b.env" \
    && has_line 'FULLSEND_ADAPTER_BIN=' "${root}/scripts/b.env" \
    && has_line 'FULLSEND_ADAPTER_TOKEN=' "${root}/scripts/c.env" \
    && ! has_text 'alpha-token-value|api\.example\.test' "${root}/scripts/b.env" "${root}/scripts/c.env" \
    && ! has_text 'beta-token-value' "${root}/scripts/a.env" "${root}/scripts/c.env" \
    && ! has_text '^(ALPHA_|BETA_|GAMMA_|REVIEW_TOKEN|GH_)|review-token-value|gh-token-value|odh-adapter-credential-unset' \
      "${root}/scripts/a.env" "${root}/scripts/b.env" "${root}/scripts/c.env" "${root}/scripts/setup.env" \
    && [[ ! -e "${root}/scripts/setup-c.env" ]]; then
    pass "adapter environment allowlist"
  else
    flunk "adapter environment allowlist"
  fi
  # collected.json: one envelope per row, in registry order. A runner that
  # exits non-zero or writes nothing is reported as an error, and a findings
  # row's error envelope carries an empty findings array.
  if jq -e '
      type == "array" and ([.[].id] == ["a", "b", "c", "d", "e"]) and
      all(.[]; .kind == "cli-adapter" and .dimension == .id and (.output | type == "string")
               and (.status | type == "string")) and
      (.[0] == {id: "a", dimension: "a", kind: "cli-adapter", output: "context",
                status: "error", reason: "adapter-wrote-no-output"}) and
      (.[3] == {id: "d", dimension: "d", kind: "cli-adapter", output: "findings",
                status: "error", reason: "adapter-exited-3", findings: []}) and
      (.[4].status == "ok")
    ' "${root}/.run/collected.json" >/dev/null 2>&1; then
    pass "collected.json envelope shapes"
  else
    flunk "collected.json envelope shapes"
  fi

  # host-findings.json: only findings of an ok findings envelope, each with
  # the ref post-review.sh derives; no file when there is nothing to weigh.
  local hf="${root}/host-findings"
  mkdir -p "${hf}"
  printf '%s' '[{"id":"x","kind":"cli-adapter","output":"context","status":"ok"},{"id":"cr","kind":"cli-adapter","output":"findings","status":"ok","findings":[{"severity":"high","category":"cr","file":"a.ts","line":"3","description":"One.","actionable":true},"junk",{"severity":"low","category":"cr","file":"b.ts","description":"Two."}]},{"id":"err","kind":"cli-adapter","output":"findings","status":"error","findings":[{"severity":"high","category":"e","file":"c.ts","description":"No."}]}]' > "${hf}/collected.json"
  write_host_findings "${hf}"
  if jq -e '.findings == [{ref:"cr-1",source:"cr",severity:"high",category:"cr",file:"a.ts",line:"3",description:"One."},{ref:"cr-3",source:"cr",severity:"low",category:"cr",file:"b.ts",description:"Two."}]' \
      "${hf}/host-findings.json" >/dev/null 2>&1; then
    pass "host-findings.json carries ok findings with refs"
  else
    flunk "host-findings.json carries ok findings with refs"
  fi
  printf '%s' '[{"id":"cr","kind":"cli-adapter","output":"findings","status":"ok","findings":[]}]' > "${hf}/collected.json"
  write_host_findings "${hf}"
  if [[ ! -e "${hf}/host-findings.json" && ! -e "${hf}/host-findings.json.tmp" ]]; then
    pass "host-findings.json is absent when no adapter reported a finding"
  else
    flunk "host-findings.json is absent when no adapter reported a finding"
  fi

  # Skip, with and without the runner's output file: no adapter runs.
  for mode in file none; do
    code="$(run_main_in_fixture "${root}" skip "${mode}")"
    if [[ "${code}" == 0 && -f "${root}/scripts/stock/stock.env" \
      && ! -e "${root}/scripts/a.env" && ! -e "${root}/scripts/setup.env" && ! -e "${root}/.run/collected.json" ]] \
      && { [[ "${mode}" == none ]] || [[ "$(cat "${root}/prescript.out")" == $'skipped=true\nreason=closed' ]]; }; then
      pass "skip signal stops before the adapters (output ${mode})"
    else
      flunk "skip signal did not stop the adapters (output ${mode}, exit ${code})"
    fi
  done
  # A failing stock script, and the runner's neutral exit 78, pass through.
  for mode in fail:7 neutral:78; do
    code="$(run_main_in_fixture "${root}" "${mode%%:*}")"
    if [[ "${code}" == "${mode##*:}" && ! -e "${root}/scripts/a.env" && ! -e "${root}/.run/collected.json" ]]; then
      pass "stock exit ${mode##*:} passes through and stops before the adapters"
    else
      flunk "stock exit ${mode##*:} came back as ${code} or ran adapters"
    fi
  done
  # No review token: the stock script cannot have checked the PR state.
  code="$(run_main_in_fixture "${root}" proceed file "")"
  if [[ "${code}" == 0 && -f "${root}/scripts/stock/stock.env" && ! -e "${root}/scripts/a.env" ]]; then
    pass "no review token stops before the adapters"
  else
    flunk "adapters ran without a review token (exit ${code})"
  fi

  # A row that claims a reserved name fails capture and validation, and
  # capture unsets nothing first. The fixture itself validates.
  if (
    _SCRIPT_DIR="${root}/scripts"
    validate_adapter_registry || exit 1
    cp "${root}/dimensions.json" "${root}/good.json"
    for reserved in REVIEW_TOKEN GH_TOKEN PATH GITHUB_TOKEN FULLSEND_X JIRA_TOKEN PRIOR_REVIEW_FILE PR_URL; do
      jq --arg n "${reserved}" '.dimensions[1].host.credentials.token_env = $n' \
        "${root}/good.json" > "${root}/dimensions.json"
      export ALPHA_TOKEN="alpha-token-value" REVIEW_TOKEN="review-token-value"
      if (capture_adapter_credentials) 2>/dev/null; then exit 1; fi
      if validate_adapter_registry 2>/dev/null; then exit 1; fi
      capture_adapter_credentials 2>/dev/null && exit 1
      [[ "${ALPHA_TOKEN:-}" == "alpha-token-value" && "${REVIEW_TOKEN:-}" == "review-token-value" ]] || exit 1
    done
    cp "${root}/good.json" "${root}/dimensions.json"
    # The placeholder for an unset secret is stored as empty.
    export GAMMA_TOKEN="${ADAPTER_CREDENTIAL_UNSET}"
    capture_adapter_credentials || exit 1
    [[ -z "${GAMMA_TOKEN+set}" && -z "${ALPHA_TOKEN+set}" && -z "$(adapter_credential GAMMA_TOKEN)" \
      && "$(adapter_credential ALPHA_TOKEN)" == "alpha-token-value" ]] || exit 1
  ); then
    pass "reserved credential names are refused; the unset placeholder is empty"
  else
    flunk "reserved credential names or the unset placeholder"
  fi
  rm -rf "${root}"

  # --- PR coordinates -------------------------------------------------------
  if (
    unset GITHUB_SERVER_URL
    PR_URL="https://github.com/example-owner/example.repo/pull/61" resolve_pr_coordinates || exit 1
    [[ "${REPO}" == "example-owner/example.repo" && "${PR_NUMBER}" == "61" ]] || exit 1
    for bad in "https://github.com/o/r/issues/61" "https://evil.test/o/r/pull/61" \
      "https://github.com/o/r/pull/61/files" "https://github.com.evil.test/o/r/pull/61" ""; do
      if PR_URL="${bad}" resolve_pr_coordinates; then exit 1; fi
    done
    GITHUB_SERVER_URL="https://ghe.example.test/" PR_URL="https://ghe.example.test/o/r/pull/7" resolve_pr_coordinates || exit 1
    [[ "${REPO}" == "o/r" && "${PR_NUMBER}" == "7" ]] || exit 1
  ); then
    pass "PR coordinates from PR_URL"
  else
    flunk "PR coordinates from PR_URL"
  fi

  if [[ -f "${_SCRIPT_DIR}/fetch-pr-images.sh" ]]; then
    if image_test_output="$(bash "${_SCRIPT_DIR}/fetch-pr-images.sh" --self-test 2>&1)"; then
      pass "PR image capture self-test"
    else
      flunk "PR image capture self-test"
      printf '%s\n' "${image_test_output}" >&2
    fi
  fi

  if [[ "${fail}" -ne 0 ]]; then
    exit 1
  fi
  echo "All pre-review self-tests passed"
}

if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  # shellcheck disable=SC2317 # reached when sourced by a shell without `return`
  return 0 2>/dev/null || exit 0
fi

case "${1:-}" in
  --self-test)
    run_self_test
    exit 0
    ;;
  --validate-adapters)
    validate_adapter_registry
    exit 0
    ;;
esac

main "$@"
