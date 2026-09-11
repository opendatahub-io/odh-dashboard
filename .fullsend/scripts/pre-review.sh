#!/usr/bin/env bash
# Vendored from fullsend-ai/agents scripts/pre-review.sh
# @ 91f61f3441baedf3f912c9afd4bd574c98793b96 (harness review.yaml base).
#
# Local change from the stock script: hydrate registered host-adapter artifacts.
# The sandbox receives sanitized adapter envelopes only, never credentials.
#
# Usage:
#   pre-review.sh              # CI / harness pre_script
#   pre-review.sh --self-test  # local checks, no GitHub
#
# Runs on the host BEFORE sandbox creation.
#
# Required environment variables (set by the workflow):
#   PR_NUMBER      — must be a positive integer
#   REPO_FULL_NAME — must be owner/repo format
#   GITHUB_PR_URL  — must be a valid GitHub pull request URL
set -euo pipefail

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

normalize_dispatch_context() {
  local work_item_url
  work_item_url="${FULLSEND_WORK_ITEM_URL:-${GITHUB_ISSUE_URL:-}}"

  # The reusable dispatch matrix runner exports forge-neutral work-item
  # variables. The stock review runner exports the legacy PR-specific names.
  # Normalize only GitHub pull-request URLs so this script supports both paths.
  if [[ -z "${GITHUB_PR_URL:-}" && "${work_item_url}" =~ ^https://github\.com/[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+/pull/[0-9]+$ ]]; then
    export GITHUB_PR_URL="${work_item_url}"
  fi

  if [[ -z "${PR_NUMBER:-}" ]]; then
    if [[ "${ISSUE_NUMBER:-}" =~ ^[1-9][0-9]*$ ]]; then
      export PR_NUMBER="${ISSUE_NUMBER}"
    elif [[ "${GITHUB_PR_URL:-}" =~ /pull/([1-9][0-9]*)$ ]]; then
      export PR_NUMBER="${BASH_REMATCH[1]}"
    fi
  fi
}

validate_adapter_registry() {
  local registry="${_SCRIPT_DIR}/../dimensions.json"
  local runner setup_runner
  if ! jq -e '
    . as $registry |
    (.dimensions | type == "array") and
    (([.dimensions[] | select(.kind == "cli-adapter") | .id] | unique | length) ==
      ([.dimensions[] | select(.kind == "cli-adapter")] | length)) and
    (([.dimensions[] | select(.kind == "cli-adapter") | .producer_file] | unique | length) ==
      ([.dimensions[] | select(.kind == "cli-adapter")] | length)) and
    (([.dimensions[] | select(.kind == "cli-adapter" and .host.execution == "workflow") | .host.artifact_name] | unique | length) ==
      ([.dimensions[] | select(.kind == "cli-adapter" and .host.execution == "workflow")] | length)) and
    all(
      .dimensions[] | select(.kind == "cli-adapter");
      (.id | type == "string" and test("^[a-z0-9][a-z0-9-]*$")) and
      (.output | type == "string" and test("^(context|findings|check:[a-z0-9-]+|classifier:[a-z0-9-]+)$")) and
      (.runner | type == "string" and test("^scripts/[A-Za-z0-9._/-]+\\.sh$")) and
      (.producer_file | type == "string" and test("^\\.run/[A-Za-z0-9._-]+\\.json$")) and
      (.host.execution == "workflow" or .host.execution == "pre_review") and
      (if .host.execution == "workflow" then
        (.host.artifact_name | type == "string" and test("^[A-Za-z0-9._{}-]+$") and contains("{pr_number}")) and
        (.host.artifact_file | type == "string" and test("^[A-Za-z0-9._-]+\\.json$")) and
        (.host.artifact_file == (.producer_file | split("/") | last)) and
        (.host.checkout_pr | type == "boolean") and
        (.host.setup_runner | type == "string" and
          (. == "" or test("^scripts/[A-Za-z0-9._/-]+\\.sh$"))) and
        all(
          [.host.credentials.url_secret, .host.credentials.username_secret, .host.credentials.token_secret][];
          type == "string" and test("^[A-Z][A-Z0-9_]*$")
        )
      else true end)
    ) and
    all(
      .dimensions[] | select(.context_dimension? != null);
      .context_dimension as $context_dimension |
      any(
        $registry.dimensions[];
        .kind == "cli-adapter" and .id == $context_dimension and .output == "context"
      )
    )
  ' "${registry}" >/dev/null; then
    return 1
  fi

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

adapter_rows() {
  local registry="${_SCRIPT_DIR}/../dimensions.json"
  jq -r '
    .dimensions[]
    | select(.kind == "cli-adapter")
    | [.id, .producer_file, .output]
    | @tsv
  ' "${registry}"
}

workflow_adapter_rows() {
  local registry="${_SCRIPT_DIR}/../dimensions.json"
  jq -r '
    .dimensions[]
    | select(.kind == "cli-adapter" and .host.execution == "workflow")
    | [.id, .producer_file, .host.artifact_name, .host.artifact_file, .output]
    | @tsv
  ' "${registry}"
}

aggregate_cli_adapters() {
  local run_dir="${_SCRIPT_DIR}/../.run"
  local id producer_file declared_output file
  local files=()

  while IFS=$'\t' read -r id producer_file declared_output; do
    file="${_SCRIPT_DIR}/../${producer_file}"
    [[ -f "${file}" ]] && files+=("${file}")
  done < <(adapter_rows)

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
}

run_pre_review_adapters() {
  local runner
  while IFS= read -r runner; do
    [[ -n "${runner}" ]] && bash "${_SCRIPT_DIR}/../${runner}"
  done < <(jq -r '
    [.dimensions[]
      | select(.kind == "cli-adapter" and .host.execution == "pre_review")
      | .runner]
    | unique[]
  ' "${_SCRIPT_DIR}/../dimensions.json")
}

hydrate_workflow_adapters() {
  local id producer_file artifact_template artifact_file declared_output artifact_name
  local artifact_dir source_file destination_file

  if ! validate_adapter_registry; then
    echo "::error::Invalid cli-adapter host metadata in .fullsend/dimensions.json"
    return 1
  fi

  while IFS=$'\t' read -r id producer_file artifact_template artifact_file declared_output; do
    artifact_name="${artifact_template//\{pr_number\}/${PR_NUMBER}}"
    artifact_dir="$(mktemp -d)"
    source_file="${artifact_dir}/${artifact_file}"
    destination_file="${_SCRIPT_DIR}/../${producer_file}"
    rm -f "${destination_file}"

    if GH_TOKEN="${_TOKEN}" gh run download "${GITHUB_RUN_ID}" \
      --repo "${REPO_FULL_NAME}" \
      --name "${artifact_name}" \
      --dir "${artifact_dir}" >/dev/null 2>&1; then
      if [[ -f "${source_file}" ]] && jq -e --arg id "${id}" --arg output "${declared_output}" '
        type == "object" and
        .id == $id and
        .dimension == $id and
        .kind == "cli-adapter" and
        .output == $output and
        (.output != "findings" or (.findings | type == "array"))
      ' "${source_file}" >/dev/null; then
        mkdir -p "$(dirname "${destination_file}")"
        cp "${source_file}" "${destination_file}"
        echo "Loaded sanitized ${id} adapter output from workflow artifact ${artifact_name}"
      else
        echo "::warning::Adapter artifact ${artifact_name} did not contain a valid ${artifact_file} envelope"
      fi
    else
      echo "::warning::Could not download adapter artifact ${artifact_name}; continuing without ${id}"
    fi
    rm -rf "${artifact_dir}"
  done < <(workflow_adapter_rows)
}

prepare_cli_adapters() {
  validate_adapter_registry
  run_pre_review_adapters
  if [[ "${GITHUB_ACTIONS:-}" == "true" && -n "${GITHUB_RUN_ID:-}" ]]; then
    hydrate_workflow_adapters
  fi
  aggregate_cli_adapters
}

run_self_test() {
  local fail=0
  local original_script_dir="${_SCRIPT_DIR}"
  local temp_dir
  if ! (
    unset GITHUB_PR_URL PR_NUMBER
    FULLSEND_WORK_ITEM_URL='https://github.com/Gkrumbach07/odh-dashboard/pull/61'
    ISSUE_NUMBER=61
    normalize_dispatch_context
    [[ "${GITHUB_PR_URL}" == "${FULLSEND_WORK_ITEM_URL}" && "${PR_NUMBER}" == "61" ]]
  ); then
    echo "FAIL pre-context: matrix dispatch variables were not normalized" >&2
    fail=1
  else
    echo "PASS pre-context matrix dispatch normalization"
  fi
  temp_dir="$(mktemp -d)"
  _SCRIPT_DIR="${temp_dir}/scripts"
  mkdir -p "${_SCRIPT_DIR}/../.run"
  printf '%s\n' '{"dimensions":[{"id":"jira-snapshot","kind":"cli-adapter","output":"context","producer_file":".run/jira.json","host":{"artifact_name":"jira-{pr_number}","artifact_file":"jira.json"}},{"id":"coderabbit","kind":"cli-adapter","output":"findings","producer_file":".run/coderabbit.json","host":{"artifact_name":"coderabbit-{pr_number}","artifact_file":"coderabbit.json"}}]}' > "${_SCRIPT_DIR}/../dimensions.json"
  printf '%s\n' '{"id":"jira-snapshot","dimension":"jira-snapshot","kind":"cli-adapter","output":"context","status":"ok"}' > "${_SCRIPT_DIR}/../.run/jira.json"
  printf '%s\n' '{"id":"coderabbit","dimension":"coderabbit","kind":"cli-adapter","output":"findings","status":"ok","findings":[{"severity":"medium","file":"src/example.ts"}]}' > "${_SCRIPT_DIR}/../.run/coderabbit.json"
  aggregate_cli_adapters
  if jq -e '
    length == 2 and
    (map(select(.output == "context" and .dimension == "jira-snapshot")) | length == 1) and
    (map(select(.output == "findings" and .dimension == "coderabbit"))[0].findings[0].file == "src/example.ts")
  ' \
    "${_SCRIPT_DIR}/../.run/collected.json" >/dev/null; then
    echo "PASS cli-adapter aggregation"
  else
    echo "FAIL cli-adapter aggregation" >&2
    fail=1
  fi
  _SCRIPT_DIR="${original_script_dir}"
  rm -rf "${temp_dir}"
  if validate_adapter_registry; then
    echo "PASS cli-adapter registry validation"
  else
    echo "FAIL cli-adapter registry validation" >&2
    fail=1
  fi
  if [[ "${fail}" -ne 0 ]]; then
    exit 1
  fi
  echo "All pre-review self-tests passed"
}

if [[ "${1:-}" == "--self-test" ]]; then
  run_self_test
  exit 0
fi

if [[ "${1:-}" == "--validate-adapters" ]]; then
  validate_adapter_registry
  exit 0
fi

normalize_dispatch_context

echo "::notice::🔗 Review target: ${GITHUB_PR_URL:-}"

errors=0

if [[ ! "${PR_NUMBER:-}" =~ ^[1-9][0-9]*$ ]]; then
  echo "::error::PR_NUMBER must be a positive integer, got: '${PR_NUMBER:-}'"
  errors=$((errors + 1))
fi

if [[ ! "${REPO_FULL_NAME:-}" =~ ^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$ ]]; then
  echo "::error::REPO_FULL_NAME must be owner/repo format, got: '${REPO_FULL_NAME:-}'"
  errors=$((errors + 1))
fi

if [[ ! "${GITHUB_PR_URL:-}" =~ ^https://github\.com/[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+/pull/[0-9]+$ ]]; then
  echo "::error::GITHUB_PR_URL format invalid, got: '${GITHUB_PR_URL:-}'"
  errors=$((errors + 1))
fi

URL_REPO="$(echo "${GITHUB_PR_URL:-}" | sed -E 's|https://github.com/([^/]+/[^/]+)/pull/.*|\1|')"
URL_PR="$(echo "${GITHUB_PR_URL:-}" | sed -E 's|.*/pull/([0-9]+)$|\1|')"

if [[ -n "${URL_REPO}" && "${URL_REPO}" != "${REPO_FULL_NAME:-}" ]]; then
  echo "::error::REPO_FULL_NAME does not match PR URL repo ('${REPO_FULL_NAME:-}' vs '${URL_REPO}')"
  errors=$((errors + 1))
fi
if [[ -n "${URL_PR}" && "${URL_PR}" != "${PR_NUMBER:-}" ]]; then
  echo "::error::PR_NUMBER does not match PR URL number ('${PR_NUMBER:-}' vs '${URL_PR}')"
  errors=$((errors + 1))
fi

if [[ "${errors}" -gt 0 ]]; then
  echo "::error::Input validation failed with ${errors} error(s). Aborting."
  exit 1
fi

echo "Input validation passed:"
echo "  PR_NUMBER=${PR_NUMBER}"
echo "  REPO_FULL_NAME=${REPO_FULL_NAME}"
echo "  GITHUB_PR_URL=${GITHUB_PR_URL}"

# ---------------------------------------------------------------------------
# Check PR state — skip review on merged or closed PRs
# ---------------------------------------------------------------------------
# Use REVIEW_TOKEN if available (set by the harness), fall back to GH_TOKEN.
_TOKEN="${REVIEW_TOKEN:-${GH_TOKEN:-}}"
if [[ -z "${_TOKEN}" ]]; then
  echo "No token available — skipping PR state check"
  exit 0
fi

PR_STATE="$(GH_TOKEN="${_TOKEN}" gh pr view "${PR_NUMBER}" \
  --repo "${REPO_FULL_NAME}" --json state --jq '.state' 2>/dev/null || true)"

if [[ -n "${PR_STATE}" && "${PR_STATE}" != "OPEN" ]]; then
  echo "::notice::PR #${PR_NUMBER} is ${PR_STATE} — skipping review"

  STATE_LOWER="$(echo "${PR_STATE}" | tr '[:upper:]' '[:lower:]')"
  COMMENT_BODY="Review skipped — this PR is already **${STATE_LOWER}**.

The \`/fs-review\` command only reviews open pull requests.

<sub>Posted by <a href=\"https://github.com/fullsend-ai/fullsend\">fullsend</a> pre-review check</sub>"

  printf '%s' "${COMMENT_BODY}" | GH_TOKEN="${_TOKEN}" gh issue comment "${PR_NUMBER}" \
    --repo "${REPO_FULL_NAME}" --body-file - 2>/dev/null || true

  exit 0
fi

# ---------------------------------------------------------------------------
# Check author skip list — exit early if PR author is in REVIEW_SKIP_AUTHORS
# ---------------------------------------------------------------------------
if [[ -n "${REVIEW_SKIP_AUTHORS:-}" ]]; then
  PR_AUTHOR="$(GH_TOKEN="${_TOKEN}" gh pr view "${PR_NUMBER}" \
    --repo "${REPO_FULL_NAME}" --json author --jq '.author.login' 2>/dev/null || true)"

  if [[ -n "${PR_AUTHOR}" ]]; then
    IFS=',' read -ra _SKIP_LIST <<< "${REVIEW_SKIP_AUTHORS}"
    for _entry in "${_SKIP_LIST[@]}"; do
      read -r _entry <<< "${_entry}"  # trim whitespace
      if [[ "${_entry,,}" == "${PR_AUTHOR,,}" ]]; then
        _SAFE_AUTHOR="${PR_AUTHOR//::/ }"
        echo "::notice::PR #${PR_NUMBER} authored by ${_SAFE_AUTHOR} — skipping review (REVIEW_SKIP_AUTHORS)"

        COMMENT_BODY="Review skipped — PR author **${PR_AUTHOR}** is in the \`REVIEW_SKIP_AUTHORS\` list.

<sub>Posted by <a href=\"https://github.com/fullsend-ai/fullsend\">fullsend</a> pre-review check</sub>"

        printf '%s' "${COMMENT_BODY}" | GH_TOKEN="${_TOKEN}" gh issue comment "${PR_NUMBER}" \
          --repo "${REPO_FULL_NAME}" --body-file - 2>/dev/null || true

        exit 0
      fi
    done
  fi
fi

# ---------------------------------------------------------------------------
# Fetch title/body for trusted Jira-key parsing.
# ---------------------------------------------------------------------------
PR_VIEW="$(GH_TOKEN="${_TOKEN}" gh pr view "${PR_NUMBER}" \
  --repo "${REPO_FULL_NAME}" --json title,body 2>/dev/null || true)"
PR_TITLE="$(printf '%s' "${PR_VIEW}" | jq -r '.title // empty')"
PR_BODY="$(printf '%s' "${PR_VIEW}" | jq -r '.body // empty')"
export REVIEW_PR_TITLE="${PR_TITLE}"
export REVIEW_PR_BODY="${PR_BODY}"

# Run registered pre-review adapters, hydrate outputs from isolated workflow
# adapter jobs, and collect every resulting envelope generically. Adapter
# credentials never enter the sandbox.
prepare_cli_adapters

echo "PR #${PR_NUMBER} is open — proceeding with review agent"
