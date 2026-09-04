#!/usr/bin/env bash
# Vendored from fullsend-ai/agents scripts/pre-review.sh
# @ 91f61f3441baedf3f912c9afd4bd574c98793b96 (harness review.yaml base).
#
# Local changes from the stock script:
#   1. If the PR body is missing required Dashboard template headings, post a
#      comment and skip the sandbox.
#   2. Hydrate the trusted Jira snapshot. The sandbox receives that sanitized
#      context file, never Jira credentials.
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

REVIEW_STICKY_MARKER='<!-- fullsend:review-agent -->'

_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=pr-description-sot.sh
source "${_SCRIPT_DIR}/pr-description-sot.sh"

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

run_self_test() {
  local fail=0 got
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
  got=$(sot_missing_headings $'## Description\nUsers cannot export.\n' | tr '\n' ' ')
  if [[ "${got}" != "How Has This Been Tested? Test Impact " ]]; then
    echo "FAIL pre-sot: expected testing headings missing, got '${got}'" >&2
    fail=1
  else
    echo "PASS pre-sot missing headings"
  fi
  got=$(sot_missing_headings $'## Description\nx\n\n## How Has This Been Tested?\ny\n\n## Test Impact\nz\n')
  if [[ -n "${got}" ]]; then
    echo "FAIL pre-sot: expected none missing, got '${got}'" >&2
    fail=1
  else
    echo "PASS pre-sot headings present"
  fi
  got=$(sot_missing_headings $'Description How Has This Been Tested? Test Impact in prose.\n' | tr '\n' ' ')
  if [[ "${got}" != "Description How Has This Been Tested? Test Impact " ]]; then
    echo "FAIL pre-sot: prose should not count as headings, got '${got}'" >&2
    fail=1
  else
    echo "PASS pre-sot ignores prose"
  fi
  got=$(sot_missing_headings $'## Description\n<!-- what changed -->\n\n## How Has This Been Tested?\nN/A\n\n## Test Impact\nTBD\n' | tr '\n' ' ')
  if [[ "${got}" != "Description How Has This Been Tested? Test Impact " ]]; then
    echo "FAIL pre-sot: placeholders should not count as content, got '${got}'" >&2
    fail=1
  else
    echo "PASS pre-sot placeholders are empty"
  fi
  local tmpl="${_SCRIPT_DIR}/../../.github/pull_request_template.md"
  got=$(sot_missing_headings "$(cat "${tmpl}")" | tr '\n' ' ')
  if [[ "${got}" != "Description How Has This Been Tested? Test Impact " ]]; then
    echo "FAIL pre-sot: unused Dashboard template must still look unfilled, got '${got}'" >&2
    fail=1
  else
    echo "PASS pre-sot Dashboard template is unfilled"
  fi
  if [[ "${REQUIRED_PR_HEADINGS[*]}" != "Description How Has This Been Tested? Test Impact" ]]; then
    echo "FAIL pre-sot: REQUIRED_PR_HEADINGS drifted" >&2
    fail=1
  else
    echo "PASS pre-sot required list"
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
# Required PR headings — skip the agent when they are missing.
# Edit the list in pr-description-sot.sh (keep in sync with post-review).
# Title/body are exported for CLI context adapters (Jira key parse).
# ---------------------------------------------------------------------------
PR_VIEW="$(GH_TOKEN="${_TOKEN}" gh pr view "${PR_NUMBER}" \
  --repo "${REPO_FULL_NAME}" --json title,body,headRefOid 2>/dev/null || true)"
PR_TITLE="$(printf '%s' "${PR_VIEW}" | jq -r '.title // empty')"
PR_BODY="$(printf '%s' "${PR_VIEW}" | jq -r '.body // empty')"
PR_HEAD_SHA="$(printf '%s' "${PR_VIEW}" | jq -r '.headRefOid // empty')"
export REVIEW_PR_TITLE="${PR_TITLE}"
export REVIEW_PR_BODY="${PR_BODY}"

# The pinned reusable dispatcher currently forwards Jira credentials only to
# its generic matrix runner, not to the normal review job. The trusted shim
# therefore fetches Jira before dispatch and uploads only the sanitized JSON
# snapshot. Hydrate that artifact on the host before CLI producers run; Jira
# credentials never enter this process or the sandbox.
if [[ "${GITHUB_ACTIONS:-}" == "true" && -n "${GITHUB_RUN_ID:-}" ]]; then
  _JIRA_ARTIFACT="fullsend-jira-context-${PR_NUMBER}"
  _JIRA_ARTIFACT_DIR="$(mktemp -d)"
  if GH_TOKEN="${_TOKEN}" gh run download "${GITHUB_RUN_ID}" \
    --repo "${REPO_FULL_NAME}" \
    --name "${_JIRA_ARTIFACT}" \
    --dir "${_JIRA_ARTIFACT_DIR}" >/dev/null 2>&1; then
    _JIRA_ARTIFACT_FILE="${_JIRA_ARTIFACT_DIR}/jira.json"
    if [[ -f "${_JIRA_ARTIFACT_FILE}" ]]; then
      mkdir -p "${_SCRIPT_DIR}/../.run"
      cp "${_JIRA_ARTIFACT_FILE}" "${_SCRIPT_DIR}/../.run/jira.json"
      export FULLSEND_JIRA_SNAPSHOT_READY=1
      echo "Loaded sanitized Jira snapshot from workflow artifact ${_JIRA_ARTIFACT}"
    else
      echo "::warning::Jira context artifact did not contain jira.json"
    fi
  else
    echo "::warning::Could not download Jira context artifact ${_JIRA_ARTIFACT}; continuing without Jira context"
  fi
  rm -rf "${_JIRA_ARTIFACT_DIR}"
fi

if [[ ${#REQUIRED_PR_HEADINGS[@]} -gt 0 ]]; then
  _SOT_MISSING=()
  while IFS= read -r _sot_line; do
    [[ -n "${_sot_line}" ]] && _SOT_MISSING+=("${_sot_line}")
  done < <(sot_missing_headings "${PR_BODY}")
  if [[ ${#_SOT_MISSING[@]} -gt 0 ]]; then
    echo "::notice::PR #${PR_NUMBER} missing required description sections — skipping review agent"

    _MISSING_MD=""
    for h in "${_SOT_MISSING[@]}"; do
      _MISSING_MD="${_MISSING_MD}- \`${h}\`"$'\n'
    done

    _SHORT_SHA="${PR_HEAD_SHA:0:7}"
    _TEMPLATE_URL="https://github.com/${REPO_FULL_NAME}/blob/main/.github/pull_request_template.md"
    COMMENT_BODY="${REVIEW_STICKY_MARKER}
<!-- fullsend:review-poc -->
<!-- **Head SHA:** ${PR_HEAD_SHA} -->

Finished Review · \`skipped\` · Commit: \`${_SHORT_SHA:-unknown}\`

Review did not run. Fill required sections with real content (not N/A / TBD): **Description**, **How Has This Been Tested?**, and **Test Impact**.

Missing:
${_MISSING_MD}
See the [PR template](${_TEMPLATE_URL}). Then push or comment \`/fs-review\`.
"

    _BOT="$(GH_TOKEN="${_TOKEN}" gh api user --jq .login 2>/dev/null || true)"
    _COMMENT_ID="$(GH_TOKEN="${_TOKEN}" gh api --paginate "repos/${REPO_FULL_NAME}/issues/${PR_NUMBER}/comments" \
      | jq -s --arg bot "${_BOT}" --arg marker "${REVIEW_STICKY_MARKER}" \
        'add | map(select($bot != "" and .user.login == $bot and (.body | contains($marker)))) | first | .id // empty')"
    if [[ -n "${_COMMENT_ID}" && "${_COMMENT_ID}" != "null" ]]; then
      echo "Updating sticky comment ${_COMMENT_ID} with skip notice"
      jq -n --arg body "${COMMENT_BODY}" '{body: $body}' \
        | GH_TOKEN="${_TOKEN}" gh api --method PATCH "repos/${REPO_FULL_NAME}/issues/comments/${_COMMENT_ID}" --input - >/dev/null \
        || true
    else
      printf '%s' "${COMMENT_BODY}" | GH_TOKEN="${_TOKEN}" gh issue comment "${PR_NUMBER}" \
        --repo "${REPO_FULL_NAME}" --body-file - 2>/dev/null || true
    fi

    if [[ -n "${FULLSEND_PRESCRIPT_OUTPUT:-}" ]]; then
      {
        echo "skipped=true"
        echo "reason=PR description missing required sections"
      } >> "${FULLSEND_PRESCRIPT_OUTPUT}"
    else
      echo "::warning::FULLSEND_PRESCRIPT_OUTPUT unset — cannot skip sandbox; post-script will still flag missing headings"
    fi
    exit 0
  fi
fi

# ---------------------------------------------------------------------------
echo "PR #${PR_NUMBER} is open — proceeding with review agent"
