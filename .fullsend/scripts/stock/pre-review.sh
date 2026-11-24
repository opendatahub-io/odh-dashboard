#!/usr/bin/env bash
# GENERATED from pre-review.src.sh — DO NOT EDIT. Run: make script-build
# pre-review.sh — Validate review inputs before the agent runs.
#
# Runs on the host via the harness pre_script mechanism.
#
# Required environment variables (set by the harness forge section):
#   PR_URL         — HTML URL of the PR/MR
#   FULLSEND_FORGE — "github" or "gitlab"
#
# Optional environment variables:
#   REVIEW_TOKEN        — token for PR state checks and comments
#   REVIEW_SKIP_AUTHORS — comma-separated author list to skip
#   PRIOR_REVIEW_FILE   — prior sticky review body; rewritten to validated JSON
#   PRIOR_REVIEW_PROVENANCE — authenticated provenance for the prior review
#
# A closed/merged PR or a REVIEW_SKIP_AUTHORS author writes skipped=true via
# the pre-script output protocol, so fullsend run stops before the sandbox.
set -euo pipefail

: "${PR_URL:?PR_URL must be set}"
: "${FULLSEND_FORGE:?FULLSEND_FORGE must be set}"

# shellcheck disable=SC2034 # SCRIPT_DIR used by source in .src.sh; unused in bundled .sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/prescript-output.lib.sh
# BEGIN bundled: lib/prescript-output.lib.sh
# prescript-output.lib.sh — Write pre-script output protocol lines.
#
# The pre-script output protocol (fullsend docs/normative/prescript-output/v1,
# fullsend-ai/fullsend#4718) is the contract between `fullsend run` and a
# harness pre-script: the CLI exports FULLSEND_PRESCRIPT_OUTPUT naming a
# file, and the script appends key=value lines to it — `skipped=true` (plus
# an optional `reason`) stops the run before sandbox creation. Under a CLI
# that predates the protocol the variable is unset and writes are skipped,
# so the run proceeds — the protocol's version-skew contract.
#
# Source from a pre-script .src.sh:
#   source "${SCRIPT_DIR}/lib/prescript-output.lib.sh"

# shellcheck shell=bash

[[ -n "${PRESCRIPT_OUTPUT_SH_LOADED:-}" ]] && return 0
PRESCRIPT_OUTPUT_SH_LOADED=1

# prescript_output KEY VALUE — append a protocol line, if the CLI
# supports the protocol. Values must be single-line (protocol grammar).
prescript_output() {
  if [[ -n "${FULLSEND_PRESCRIPT_OUTPUT:-}" ]]; then
    printf '%s=%s\n' "$1" "$2" >> "${FULLSEND_PRESCRIPT_OUTPUT}"
  fi
}
# END bundled: lib/prescript-output.lib.sh
# shellcheck source=lib/review-ops.lib.sh
# BEGIN bundled: lib/review-ops.lib.sh
# shellcheck shell=bash
# review-ops.lib.sh — Forge-dispatch wrapper for review operations.
#
# Sources the correct forge-specific ops based on FULLSEND_FORGE.
# Bundled inline by bundle-sh.sh at build time.

[[ -n "${REVIEW_OPS_SH_LOADED:-}" ]] && return 0
REVIEW_OPS_SH_LOADED=1

_gha_sanitize() { printf '%s' "$1" | tr -d '\n\r' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/%/%25/g; s/::/%3A%3A/g'; }

case "${FULLSEND_FORGE:-}" in
  github)
# BEGIN bundled: lib/github-review-ops.lib.sh
# shellcheck shell=bash
# github-review-ops.lib.sh — GitHub forge operations for review scripts.
#
# Bundled into pre-review.sh and post-review.sh via review-ops.lib.sh.
# All functions use the gh CLI and the GitHub REST API.
#
# Expected globals (set by forge_parse_pr_url):
#   REPO         — owner/repo (e.g., "org/repo")
#   PR_NUMBER    — PR number
#
# Expected env vars:
#   PR_URL       — HTML URL of the pull request
#   REVIEW_TOKEN — GitHub token with pull-requests read/write scope

[[ -n "${GITHUB_REVIEW_OPS_SH_LOADED:-}" ]] && return 0
GITHUB_REVIEW_OPS_SH_LOADED=1

# shellcheck source=github-host.lib.sh
# BEGIN bundled: lib/github-host.lib.sh
# shellcheck shell=bash
# github-host.lib.sh — Shared GitHub host handling for GitHub ops.
#
# Derives the GitHub origin the run executes against from GITHUB_SERVER_URL,
# a GitHub Actions default variable (https://github.com on github.com, the
# instance URL on GitHub Enterprise Server). Defaults to https://github.com
# when unset. Issue/PR URL validation, URL parsing and generated links use
# this origin instead of a hard-coded github.com.
#
# Sourced by the github-*-ops.lib.sh files and inlined by the bundler.

[[ -n "${GITHUB_HOST_SH_LOADED:-}" ]] && return 0
GITHUB_HOST_SH_LOADED=1

# Prints the GitHub origin (https://host[:port]) without a trailing slash.
# Fails closed when GITHUB_SERVER_URL is not an HTTPS origin.
_github_server_url() {
  local origin="${GITHUB_SERVER_URL:-https://github.com}"
  origin="${origin%/}"
  if [[ ! "${origin}" =~ ^https://[a-zA-Z0-9.-]+(:[0-9]+)?$ ]]; then
    echo "ERROR: GITHUB_SERVER_URL is not an HTTPS origin (https://host[:port]): $(printf '%s' "${origin}" | tr -d '\n\r')" >&2
    return 1
  fi
  printf '%s\n' "${origin}"
}

# Prints the remainder of a URL after "<origin>/" when the URL is on the
# GitHub origin; fails (printing nothing) when it is on another host.
_github_url_path() {
  local url="$1" base
  base="$(_github_server_url)/" || return 1
  [[ "${url}" == "${base}"* ]] || return 1
  printf '%s\n' "${url#"${base}"}"
}
# END bundled: lib/github-host.lib.sh

# --- URL handling ---

forge_validate_pr_url() {
  local path
  if ! path=$(_github_url_path "${PR_URL}") \
    || [[ ! "${path}" =~ ^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+/pull/[0-9]+$ ]]; then
    echo "ERROR: PR_URL does not match expected GitHub pattern: $(_gha_sanitize "${PR_URL}")" >&2
    return 1
  fi
}

forge_parse_pr_url() {
  REPO=$(_github_url_path "${PR_URL}" | sed 's|/pull/.*||')
  PR_NUMBER=$(basename "${PR_URL}")
}

# --- PR queries ---

forge_get_pr_state() {
  GH_TOKEN="${REVIEW_TOKEN}" gh pr view "${PR_NUMBER}" \
    --repo "${REPO}" --json state --jq '.state' 2>/dev/null || true
}

forge_get_pr_author() {
  GH_TOKEN="${REVIEW_TOKEN}" gh pr view "${PR_NUMBER}" \
    --repo "${REPO}" --json author --jq '.author.login' 2>/dev/null || true
}

# Fails when the labels cannot be read.
forge_get_pr_labels() {
  GH_TOKEN="${REVIEW_TOKEN}" gh pr view "${PR_NUMBER}" \
    --repo "${REPO}" --json labels --jq '.labels[].name' 2>/dev/null
}

forge_get_pr_info() {
  GH_TOKEN="${REVIEW_TOKEN}" gh pr view "${PR_NUMBER}" \
    --repo "${REPO}" --json state,isDraft 2>/dev/null || {
    jq -n '{state: "UNKNOWN", isDraft: false}'
    return
  }
}

forge_get_pr_files() {
  # Use the paginated /pulls/{n}/files REST endpoint rather than the
  # `gh pr view --json files` summary field: issue #2093 found empty
  # results correlated with recent merge-commit updates and hypothesized
  # asynchronous diff computation, but GitHub does not document that as
  # an API contract. The files endpoint reflects the computed diff more
  # directly.
  local files
  if ! files=$(GH_TOKEN="${REVIEW_TOKEN}" gh api \
    "repos/${REPO}/pulls/${PR_NUMBER}/files" --paginate --jq '.[].filename' 2>/dev/null); then
    return 1
  fi
  [[ -n "${files}" ]] && printf '%s\n' "${files}"
}

# --- PR mutations ---

forge_post_review() {
  local result_file="$1"
  fullsend post-review \
    --forge github \
    --repo "${REPO}" \
    --pr "${PR_NUMBER}" \
    --token "${REVIEW_TOKEN}" \
    --result "${result_file}"
}

forge_close_pr() {
  local comment="$1"
  GH_TOKEN="${REVIEW_TOKEN}" gh pr close "${PR_NUMBER}" \
    --repo "${REPO}" \
    --comment "${comment}" || true
}

# --- Comments ---

forge_post_comment() {
  local body="$1"
  printf '%s' "${body}" | GH_TOKEN="${REVIEW_TOKEN}" gh issue comment "${PR_NUMBER}" \
    --repo "${REPO}" --body-file -
}

forge_get_recent_redispatch_comments() {
  local marker="$1"
  local window_seconds="$2"
  GH_TOKEN="${REVIEW_TOKEN}" gh api \
    "repos/${REPO}/issues/${PR_NUMBER}/comments" \
    --paginate 2>/dev/null \
    | jq -s --arg marker "${marker}" --argjson window "${window_seconds}" \
    'add // [] | [.[] | select(.body | contains($marker))
          | select(.created_at > (now - $window | strftime("%Y-%m-%dT%H:%M:%SZ")))]
     | length'
}

# Return a JSON object mapping finding ids to the review-comment URL of the
# review agent's original inline comment. This is best-effort context for
# carried blockers; the ledger itself remains metadata-only. Only comments
# authored by the current viewer are considered, so a human cannot forge a
# finding link by mentioning an id in a reply.
forge_get_finding_comment_links() {
  local owner name query cursor has_next page response page_nodes nodes_json links
  local -a gh_args

  owner="${REPO%%/*}"
  name="${REPO##*/}"
  cursor=""
  has_next="true"
  page=0
  nodes_json="[]"

  query='query($owner: String!, $name: String!, $number: Int!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        reviewThreads(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            comments(first: 100) {
              pageInfo { hasNextPage }
              nodes { body viewerDidAuthor url }
            }
          }
        }
      }
    }
  }'

  while [[ "${has_next}" == "true" ]]; do
    page=$((page + 1))
    if [[ "${page}" -gt 20 ]]; then
      echo "::warning::Review thread pagination hit page cap — finding links may be incomplete" >&2
      break
    fi

    gh_args=(api graphql
      -f owner="${owner}"
      -f name="${name}"
      -F number="${PR_NUMBER}"
      -f query="${query}")
    if [[ -n "${cursor}" ]]; then
      gh_args+=(-f cursor="${cursor}")
    fi

    if ! response=$(GH_TOKEN="${REVIEW_TOKEN}" gh "${gh_args[@]}" 2>/dev/null); then
      echo "::warning::Failed to fetch review threads — blocking finding links unavailable" >&2
      echo '{}'
      return 0
    fi
    if echo "${response}" | jq -e '.errors | type == "array" and length > 0' >/dev/null 2>&1; then
      echo "::warning::Review thread query returned errors — blocking finding links unavailable" >&2
      echo '{}'
      return 0
    fi

    page_nodes=$(echo "${response}" | jq -c '.data.repository.pullRequest.reviewThreads.nodes // []' 2>/dev/null) || {
      echo "::warning::Failed to parse review threads — blocking finding links unavailable" >&2
      echo '{}'
      return 0
    }
    nodes_json=$(jq -c --argjson page "${page_nodes}" '. + $page' <<< "${nodes_json}" 2>/dev/null) || {
      echo "::warning::Failed to merge review thread pages — blocking finding links unavailable" >&2
      echo '{}'
      return 0
    }

    has_next=$(echo "${response}" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage // false' 2>/dev/null) || has_next="false"
    cursor=$(echo "${response}" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.endCursor // empty' 2>/dev/null) || cursor=""
    if [[ "${has_next}" == "true" && -z "${cursor}" ]]; then
      echo "::warning::Review thread page missing cursor — blocking finding links may be incomplete" >&2
      break
    fi
  done

  links=$(jq -c --arg base "${PR_URL}" '
    [ .[]
      | (.comments.nodes // [])[]
      | select(.viewerDidAuthor == true)
      | . as $comment
      | (($comment.body // "") | scan("finding:(f_[A-Za-z0-9]+)") | .[0]) as $id
      | select(($id | type) == "string")
      | select(($comment.url // "") | startswith($base + "#discussion_r"))
      | select(($comment.url // "") | test("#discussion_r[0-9]+$"))
      | {id: $id, url: $comment.url}
    ]
    | reduce .[] as $match ({}; .[$match.id] //= $match.url)
  ' <<< "${nodes_json}" 2>/dev/null) || links='{}'
  jq -e 'type == "object"' <<< "${links}" >/dev/null 2>&1 || links='{}'
  printf '%s\n' "${links}"
}

# --- Review threads ---

# Select GitHub review-thread node IDs that are safe to auto-resolve.
# Reads a JSON array of reviewThreads.nodes from stdin; prints one ID per line.
#
# A thread is eligible when all of the following hold:
#   - still unresolved
#   - the viewer can resolve it
#   - the thread is outdated (the diff position no longer exists)
#   - every fetched comment is outdated and authored by the viewer
#     (human / other-bot comments are left alone, even if outdated)
#   - there is at least one comment
#   - comment pagination is complete — an incomplete page might hide a
#     human comment, so skip rather than guess
_select_outdated_review_thread_ids() {
  jq -r '
    .[]
    | select(.id != null)
    | select(.isResolved == false)
    | select(.viewerCanResolve == true)
    | select(.isOutdated == true)
    | select((.comments.pageInfo.hasNextPage // false) == false)
    | select((.comments.nodes // [] | length) > 0)
    | select(.comments.nodes // [] | all(.outdated == true))
    | select(.comments.nodes // [] | all(.viewerDidAuthor == true))
    | .id
  '
}

# Resolve still-open review threads whose only comments are outdated
# inline comments authored by this token (the review agent). Best-effort:
# fetch or mutation failures log a warning and return success so they
# cannot block posting the new review.
forge_resolve_outdated_review_threads() {
  local owner name query mutation
  local cursor has_next page response page_nodes nodes_json ids
  local id resolved failed
  local -a gh_args

  owner="${REPO%%/*}"
  name="${REPO##*/}"
  cursor=""
  has_next="true"
  page=0
  nodes_json="[]"
  resolved=0
  failed=0

  query='query($owner: String!, $name: String!, $number: Int!, $cursor: String) {
    repository(owner: $owner, name: $name) {
      pullRequest(number: $number) {
        reviewThreads(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            isResolved
            isOutdated
            viewerCanResolve
            comments(first: 100) {
              pageInfo { hasNextPage }
              nodes {
                outdated
                viewerDidAuthor
              }
            }
          }
        }
      }
    }
  }'

  mutation='mutation($threadId: ID!) {
    resolveReviewThread(input: {threadId: $threadId}) {
      thread { isResolved }
    }
  }'

  while [[ "${has_next}" == "true" ]]; do
    page=$((page + 1))
    if [[ "${page}" -gt 20 ]]; then
      echo "::warning::Review thread pagination hit page cap — remaining threads skipped"
      break
    fi

    gh_args=(api graphql
      -f owner="${owner}"
      -f name="${name}"
      -F number="${PR_NUMBER}"
      -f query="${query}")
    if [[ -n "${cursor}" ]]; then
      gh_args+=(-f cursor="${cursor}")
    fi

    if ! response=$(GH_TOKEN="${REVIEW_TOKEN}" gh "${gh_args[@]}" 2>/dev/null); then
      echo "::warning::Failed to fetch review threads — skipping outdated-thread resolution"
      return 0
    fi

    if echo "${response}" | jq -e '.errors | type == "array" and length > 0' >/dev/null 2>&1; then
      echo "::warning::Review thread query returned errors — skipping outdated-thread resolution"
      return 0
    fi

    page_nodes=$(echo "${response}" | jq -c '.data.repository.pullRequest.reviewThreads.nodes // []' 2>/dev/null) || {
      echo "::warning::Failed to parse review threads — skipping outdated-thread resolution"
      return 0
    }
    nodes_json=$(jq -c --argjson page "${page_nodes}" '. + $page' <<< "${nodes_json}" 2>/dev/null) || {
      echo "::warning::Failed to merge review thread pages — skipping outdated-thread resolution"
      return 0
    }

    has_next=$(echo "${response}" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage // false' 2>/dev/null) || has_next="false"
    cursor=$(echo "${response}" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.endCursor // empty' 2>/dev/null) || cursor=""
    if [[ "${has_next}" == "true" && -z "${cursor}" ]]; then
      echo "::warning::Review thread page missing cursor — stopping pagination"
      break
    fi
  done

  ids=$(echo "${nodes_json}" | _select_outdated_review_thread_ids 2>/dev/null) || ids=""
  if [[ -z "${ids}" ]]; then
    return 0
  fi

  while IFS= read -r id; do
    [[ -z "${id}" ]] && continue
    if GH_TOKEN="${REVIEW_TOKEN}" gh api graphql \
      -f threadId="${id}" \
      -f query="${mutation}" >/dev/null 2>&1; then
      resolved=$((resolved + 1))
    else
      failed=$((failed + 1))
      echo "::warning::Failed to resolve review thread $(_gha_sanitize "${id}")"
    fi
  done <<< "${ids}"

  if [[ "${resolved}" -gt 0 ]]; then
    echo "Resolved ${resolved} outdated review-agent thread(s)"
  fi
  if [[ "${failed}" -gt 0 ]]; then
    echo "::warning::Failed to resolve ${failed} outdated review thread(s)"
  fi
  return 0
}

# --- Human dismissals ---

# --- Labels ---

forge_add_label() {
  local label="$1"
  GH_TOKEN="${REVIEW_TOKEN}" gh api "repos/${REPO}/issues/${PR_NUMBER}/labels" \
    -f "labels[]=${label}" --silent || \
    echo "::warning::Failed to add label '$(_gha_sanitize "${label}")'"
}

forge_remove_label() {
  local label="$1"
  local encoded
  encoded=$(printf '%s' "${label}" | jq -sRr @uri)
  GH_TOKEN="${REVIEW_TOKEN}" gh api "repos/${REPO}/issues/${PR_NUMBER}/labels/${encoded}" \
    -X DELETE --silent 2>/dev/null || true
}

# Succeeds when the label is gone afterwards; 404 means it was already absent.
forge_remove_label_checked() {
  local label="$1"
  local encoded err
  encoded=$(printf '%s' "${label}" | jq -sRr @uri)
  err=$(GH_TOKEN="${REVIEW_TOKEN}" gh api "repos/${REPO}/issues/${PR_NUMBER}/labels/${encoded}" \
    -X DELETE --silent 2>&1) && return 0
  [[ "${err}" == *"HTTP 404"* ]]
}

forge_remove_label_edit() {
  local label="$1"
  GH_TOKEN="${REVIEW_TOKEN}" gh pr edit "${PR_NUMBER}" --repo "${REPO}" \
    --remove-label "${label}" 2>/dev/null || true
}

forge_create_label() {
  local name="$1"
  local description="$2"
  local color="$3"
  GH_TOKEN="${REVIEW_TOKEN}" gh label create "${name}" --repo "${REPO}" \
    --description "${description}" --color "${color}" \
    --force 2>/dev/null || true
}

forge_add_label_edit() {
  local label="$1"
  GH_TOKEN="${REVIEW_TOKEN}" gh pr edit "${PR_NUMBER}" --repo "${REPO}" \
    --add-label "${label}" || true
}

forge_list_repo_labels() {
  GH_TOKEN="${REVIEW_TOKEN}" gh api "repos/${REPO}/labels" --paginate --jq '.[].name' 2>/dev/null || true
}
# END bundled: lib/github-review-ops.lib.sh
    ;;
  gitlab)
# BEGIN bundled: lib/gitlab-review-ops.lib.sh
# shellcheck shell=bash
# gitlab-review-ops.lib.sh — GitLab forge operations for review scripts.
#
# Bundled into pre-review.sh and post-review.sh via review-ops.lib.sh.
# All functions use curl against the GitLab REST API.
#
# Expected globals (set by forge_parse_pr_url):
#   REPO           — plain project path (e.g., "group/project")
#   REPO_ENCODED   — URL-encoded project path (e.g., "group%2Fproject")
#   PR_NUMBER      — merge request IID
#   GITLAB_HOST    — API host (e.g., "gitlab.com")
#
# Expected env vars:
#   PR_URL         — HTML URL of the merge request
#   REVIEW_TOKEN   — GitLab personal/project access token
#
# Token scopes: REVIEW_TOKEN requires minimum scopes:
#   - api (read/write merge requests, labels, notes)
#   Prefer project access tokens scoped to the target project over
#   personal access tokens with broader access.

[[ -n "${GITLAB_REVIEW_OPS_SH_LOADED:-}" ]] && return 0
GITLAB_REVIEW_OPS_SH_LOADED=1

# shellcheck source=gitlab-host-validation.lib.sh
# BEGIN bundled: lib/gitlab-host-validation.lib.sh
# shellcheck shell=bash
# gitlab-host-validation.lib.sh — Shared host validation for GitLab ops.
#
# Validates a hostname against CI_SERVER_HOST, a GitLab CI predefined
# variable set automatically by the runner.
#
# Fails closed: rejects when CI_SERVER_HOST is not set.
#
# Also derives the trusted origin (scheme, host, and optional port) from
# CI_SERVER_URL so self-managed instances on non-default HTTPS ports work.
#
# Sourced by all gitlab-*-ops.lib.sh files and inlined by the bundler.

[[ -n "${GITLAB_HOST_VALIDATION_SH_LOADED:-}" ]] && return 0
GITLAB_HOST_VALIDATION_SH_LOADED=1

if ! declare -F _gha_sanitize >/dev/null 2>&1; then
  _gha_sanitize() {
    printf '%s' "$1" | tr -d '\n\r' | sed 's/\x1b\[[0-9;]*[a-zA-Z]//g; s/%/%25/g; s/::/%3A%3A/g'
  }
fi

_validate_gitlab_host() {
  local host="$1"
  if [[ -z "${CI_SERVER_HOST:-}" ]]; then
    echo "ERROR: CI_SERVER_HOST is not set (set by GitLab CI runner)" >&2
    return 1
  fi
  if [[ ! "${CI_SERVER_HOST}" =~ ^[a-zA-Z0-9._-]+$ ]]; then
    echo "ERROR: CI_SERVER_HOST contains invalid characters" >&2
    return 1
  fi
  if [[ "${host,,}" != "${CI_SERVER_HOST,,}" ]]; then
    echo "ERROR: GitLab host '$(_gha_sanitize "${host}")' does not match CI_SERVER_HOST" >&2
    return 1
  fi
}

# Prints the trusted GitLab origin (https://host[:port]) for API requests
# and generated links. Derived from CI_SERVER_URL, a GitLab CI predefined
# variable that carries any non-default port; falls back to
# https://${CI_SERVER_HOST} when CI_SERVER_URL is unset. Fails closed when
# the origin is not HTTPS or its host does not match CI_SERVER_HOST.
_gitlab_trusted_origin() {
  _validate_gitlab_host "${CI_SERVER_HOST:-}" || return 1
  local origin="${CI_SERVER_URL:-https://${CI_SERVER_HOST}}"
  if [[ ! "${origin}" =~ ^https://([a-zA-Z0-9._-]+)(:[0-9]+)?$ ]]; then
    echo "ERROR: CI_SERVER_URL is not an HTTPS origin (https://host[:port]): $(_gha_sanitize "${origin}")" >&2
    return 1
  fi
  local host="${BASH_REMATCH[1]}"
  _validate_gitlab_host "${host}" || return 1
  printf '%s\n' "${origin}"
}

# Validates an origin (https://host[:port]) parsed from an untrusted URL
# against the trusted CI server origin. Scheme, host, and port must all
# match: a URL without a port only matches a trusted origin without one.
_validate_gitlab_origin() {
  local origin="$1" trusted
  trusted=$(_gitlab_trusted_origin) || return 1
  if [[ "${origin,,}" != "${trusted,,}" ]]; then
    echo "ERROR: GitLab origin '$(_gha_sanitize "${origin}")' does not match CI server origin '$(_gha_sanitize "${trusted}")'" >&2
    return 1
  fi
}
# END bundled: lib/gitlab-host-validation.lib.sh

_gitlab_api() {
  local method="$1"
  shift
  local endpoint="$1"
  shift
  if [[ -z "${GITLAB_HOST:-}" ]]; then
    echo "ERROR: GITLAB_HOST is not set — call forge_parse_pr_url first" >&2
    return 1
  fi
  _validate_gitlab_host "${GITLAB_HOST}" || return 1
  curl --fail --silent --show-error \
    --connect-timeout 10 --max-time 30 \
    --header "PRIVATE-TOKEN: ${REVIEW_TOKEN}" \
    --request "${method}" \
    "https://${GITLAB_HOST}/api/v4${endpoint}" \
    "$@"
}

# --- URL handling ---

forge_validate_pr_url() {
  if [[ ! "${PR_URL}" =~ ^https://[a-zA-Z0-9._-]+(/[a-zA-Z0-9._-]+)+/-/merge_requests/[0-9]+$ ]]; then
    echo "ERROR: PR_URL does not match expected GitLab MR pattern: $(_gha_sanitize "${PR_URL}")" >&2
    return 1
  fi
  local host
  host=$(echo "${PR_URL}" | sed -E 's|^https://([^/:]+)/.*|\1|')
  _validate_gitlab_host "${host}" || return 1
}

forge_parse_pr_url() {
  # Extract host, project path, and MR IID from URL.
  # e.g., https://gitlab.com/group/subgroup/project/-/merge_requests/42
  GITLAB_HOST=$(echo "${PR_URL}" | sed -E 's|^https://([^/:]+)/.*|\1|')
  REPO=$(echo "${PR_URL}" | sed -E 's|^https://[^/]+/(.+)/-/merge_requests/[0-9]+$|\1|')
  REPO_ENCODED=$(printf '%s' "${REPO}" | jq -sRr @uri)
  PR_NUMBER=$(basename "${PR_URL}")
}

# --- PR queries ---

forge_get_pr_state() {
  local mr_data
  mr_data=$(_gitlab_api GET "/projects/${REPO_ENCODED}/merge_requests/${PR_NUMBER}" 2>/dev/null) || { echo ""; return; }
  local state
  state=$(echo "${mr_data}" | jq -r '.state // empty')
  # Normalize to GitHub-style states for script compatibility
  case "${state}" in
    opened) echo "OPEN" ;;
    closed) echo "CLOSED" ;;
    merged) echo "MERGED" ;;
    locked) echo "CLOSED" ;;
    *) echo "UNKNOWN" ;;
  esac
}

forge_get_pr_author() {
  local mr_data
  mr_data=$(_gitlab_api GET "/projects/${REPO_ENCODED}/merge_requests/${PR_NUMBER}" 2>/dev/null) || { echo ""; return; }
  echo "${mr_data}" | jq -r '.author.username // empty'
}

# Fails when the labels cannot be read.
forge_get_pr_labels() {
  local mr_data
  mr_data=$(_gitlab_api GET "/projects/${REPO_ENCODED}/merge_requests/${PR_NUMBER}" 2>/dev/null) || return 1
  jq -r '.labels[]? // empty' <<< "${mr_data}"
}

forge_get_pr_info() {
  local mr_data
  mr_data=$(_gitlab_api GET "/projects/${REPO_ENCODED}/merge_requests/${PR_NUMBER}" 2>/dev/null) || {
    jq -n '{state: "UNKNOWN", isDraft: false}'
    return
  }
  local state is_draft
  state=$(echo "${mr_data}" | jq -r '.state // empty')
  is_draft=$(echo "${mr_data}" | jq -r '.draft // false')
  if [[ -z "${state}" ]]; then
    jq -n '{state: "UNKNOWN", isDraft: false}'
    return
  fi
  # Normalize to GitHub-compatible JSON shape
  case "${state}" in
    opened) state="OPEN" ;;
    closed) state="CLOSED" ;;
    merged) state="MERGED" ;;
    locked) state="CLOSED" ;;
  esac
  jq -n --arg state "${state}" --argjson isDraft "${is_draft}" \
    '{state: $state, isDraft: $isDraft}'
}

forge_get_pr_files() {
  local response
  response=$(_gitlab_api GET "/projects/${REPO_ENCODED}/merge_requests/${PR_NUMBER}/changes" 2>/dev/null) || return
  if echo "${response}" | jq -e '.overflow == true' > /dev/null 2>&1; then
    echo "::warning::MR has too many changes — file list may be truncated (overflow)" >&2
    return 1
  fi
  echo "${response}" | jq -r '.changes[]?.new_path // empty' | sort -u
}

# --- PR mutations ---

forge_post_review() {
  local result_file="$1"
  fullsend post-review \
    --forge gitlab \
    --repo "${REPO}" \
    --pr "${PR_NUMBER}" \
    --token "${REVIEW_TOKEN}" \
    --result "${result_file}"
}

forge_close_pr() {
  local comment="$1"
  # Post the close comment as a note first
  _gitlab_api POST "/projects/${REPO_ENCODED}/merge_requests/${PR_NUMBER}/notes" \
    --data-urlencode "body=${comment}" > /dev/null 2>/dev/null || true
  # Then close the MR
  _gitlab_api PUT "/projects/${REPO_ENCODED}/merge_requests/${PR_NUMBER}" \
    --data-urlencode "state_event=close" > /dev/null 2>/dev/null || true
}

# --- Comments (notes in GitLab) ---

forge_post_comment() {
  local body="$1"
  _gitlab_api POST "/projects/${REPO_ENCODED}/merge_requests/${PR_NUMBER}/notes" \
    --data-urlencode "body=${body}" > /dev/null
}

forge_get_recent_redispatch_comments() {
  local marker="$1"
  local window_seconds="$2"
  local notes
  notes=$(_gitlab_api GET "/projects/${REPO_ENCODED}/merge_requests/${PR_NUMBER}/notes?per_page=100&sort=desc" 2>/dev/null) || notes="[]"
  echo "${notes}" | jq --arg marker "${marker}" --argjson window "${window_seconds}" \
    '[.[] | select(.body | contains($marker))
          | select(.created_at | fromdateiso8601 > (now - $window))]
     | length'
}

# GitLab notes do not expose the same GitHub review-comment URL shape. Keep
# the caller forge-neutral and let it fall back to the finding context.
forge_get_finding_comment_links() {
  echo '{}'
}

# GitHub-only: GitLab discussions have no isOutdated equivalent in this
# issue's scope. No-op so post-review can call this unconditionally.
forge_resolve_outdated_review_threads() {
  return 0
}

# --- Labels ---

forge_add_label() {
  local label="$1"
  if ! _gitlab_api PUT "/projects/${REPO_ENCODED}/merge_requests/${PR_NUMBER}" \
    --data-urlencode "add_labels=${label}" > /dev/null; then
    echo "::warning::Failed to add label '$(_gha_sanitize "${label}")'"
  fi
}

forge_remove_label() {
  local label="$1"
  _gitlab_api PUT "/projects/${REPO_ENCODED}/merge_requests/${PR_NUMBER}" \
    --data-urlencode "remove_labels=${label}" > /dev/null 2>/dev/null || true
}

forge_remove_label_checked() {
  _gitlab_api PUT "/projects/${REPO_ENCODED}/merge_requests/${PR_NUMBER}" \
    --data-urlencode "remove_labels=$1" > /dev/null 2>&1
}

forge_remove_label_edit() {
  # GitLab uses the same API for label management — no separate "edit" path
  forge_remove_label "$1"
}

forge_create_label() {
  local name="$1"
  local description="$2"
  local color="$3"
  _gitlab_api POST "/projects/${REPO_ENCODED}/labels" \
    --data-urlencode "name=${name}" \
    --data-urlencode "description=${description}" \
    --data-urlencode "color=#${color}" > /dev/null 2>/dev/null || true
}

forge_add_label_edit() {
  # GitLab uses the same API for label management — no separate "edit" path
  forge_add_label "$1"
}

forge_list_repo_labels() {
  local page=1 max_pages=50
  while [[ "${page}" -le "${max_pages}" ]]; do
    local batch
    batch=$(_gitlab_api GET "/projects/${REPO_ENCODED}/labels?per_page=100&page=${page}" 2>/dev/null) || break
    local count
    count=$(echo "${batch}" | jq 'length') || break
    [[ "${count}" -eq 0 ]] && break
    echo "${batch}" | jq -r '.[].name'
    page=$((page + 1))
  done
}
# END bundled: lib/gitlab-review-ops.lib.sh
    ;;
  *)
    echo "ERROR: invalid FULLSEND_FORGE: '${FULLSEND_FORGE:-}' — pass --forge <github|gitlab> or set FULLSEND_FORGE" >&2
    exit 1
    ;;
esac

# Fetch resolved review threads once per stage and return rich, verified
# records for both pre-review ledger updates and post-review result checks.
# Comment bodies never leave the host: only authors and exact finding-ID
# stamps are retained in the returned records.
forge_get_human_dismissals() {
  local pr_author response trusted_reviewers
  local -a fetch_args

  pr_author="$(forge_get_pr_author)"
  if [[ -z "${pr_author}" ]]; then
    echo "::warning::Could not determine the PR author — human dismissals cannot be verified" >&2
    echo '[]'
    return 0
  fi

  case "${FULLSEND_FORGE}" in
    github)
      local org app_set
      org="${REPO%%/*}"
      app_set="${FULLSEND_APP_SET:-}"
      trusted_reviewers="$(jq -nc \
        --arg org "${org}" \
        --arg app_set "${app_set}" '
          [
            ($org + "-review"), ($org + "-review[bot]"),
            "fullsend-ai-review", "fullsend-ai-review[bot]",
            (if $app_set == "" then empty else ($app_set + "-review"), ($app_set + "-review[bot]") end)
          ] | unique
        ')"
      ;;
    gitlab)
      local review_actor
      review_actor="$(_gitlab_api GET "/user" 2>/dev/null | jq -r '.username // empty' 2>/dev/null)" || review_actor=""
      if [[ -z "${review_actor}" ]]; then
        echo "::warning::Could not determine the GitLab review bot — human dismissals cannot be verified" >&2
        echo '[]'
        return 0
      fi
      trusted_reviewers="$(jq -nc --arg actor "${review_actor}" '[$actor]')"
      ;;
  esac

  fetch_args=(fetch-review-threads --forge "${FULLSEND_FORGE}" --repo "${REPO}" --pr "${PR_NUMBER}")
  if [[ "${FULLSEND_FORGE}" == "gitlab" && -n "${CI_SERVER_URL:-}" ]]; then
    fetch_args+=(--base-url "${CI_SERVER_URL}")
  fi
  if ! response="$(GH_TOKEN="${REVIEW_TOKEN:-${GH_TOKEN:-}}" \
    GITLAB_TOKEN="${REVIEW_TOKEN:-${GITLAB_TOKEN:-}}" \
    fullsend "${fetch_args[@]}" 2>/dev/null)"; then
    echo "::warning::Failed to fetch review threads — human dismissals cannot be verified" >&2
    echo '[]'
    return 0
  fi

  if ! jq -e 'type == "object" and (.threads | type == "array") and (.truncated == false)' \
    <<< "${response}" >/dev/null 2>&1; then
    echo "::warning::Review thread fetch was invalid or truncated — human dismissals cannot be verified" >&2
    echo '[]'
    return 0
  fi

  jq -c --arg author "${pr_author}" --arg forge "${FULLSEND_FORGE}" --argjson trusted "${trusted_reviewers}" '
    [ .threads[]
      | select(type == "object")
      | select(.is_resolved == true)
      | select(.resolved_by_type == "User")
      | select(.resolved_by_role_verified == true)
      | select(.resolved_by_role | IN("write", "maintain", "admin"))
      | select((.resolved_by | ascii_downcase) != ($author | ascii_downcase))
      | select(.comments_truncated == false)
      | . as $thread
      | [ $thread.comments[]?
          | {
              author: (.author // ""),
              author_type: (.author_type // ""),
              finding_ids: [(.body // "" | scan("<!--[[:space:]]+finding:(f_[A-Za-z0-9]+)[[:space:]]+-->") | .[0])] | unique
            }
        ] as $comments
      | [ $comments[]
          | select(
              if $forge == "github" then
                (.author_type == "Bot") and
                (.author as $login | ($trusted | map(ascii_downcase) | index($login | ascii_downcase)) != null)
              else
                (.author as $login | ($trusted | map(ascii_downcase) | index($login | ascii_downcase)) != null)
              end
            )
        ] as $trusted_comments
      | select(($trusted_comments | length) > 0)
      | {
          path: $thread.path,
          line: $thread.line,
          resolved_by: $thread.resolved_by,
          resolved_by_type: $thread.resolved_by_type,
          resolved_by_role: $thread.resolved_by_role,
          resolved_by_role_verified: $thread.resolved_by_role_verified,
          comment_authors: ($comments | map({author, author_type})),
          finding_ids: ([$trusted_comments[].finding_ids[]] | unique)
        }
    ]
  ' <<< "${response}" 2>/dev/null || echo '[]'
}
# END bundled: lib/review-ops.lib.sh

forge_validate_pr_url
echo "::notice::🔗 Review target: $(_gha_sanitize "${PR_URL}")"
forge_parse_pr_url

echo "Input validation passed:"
echo "  PR_NUMBER=${PR_NUMBER}"
echo "  REPO=${REPO}"
echo "  PR_URL=${PR_URL}"

# Assign opaque ids to prior findings that predate the ledger, before the
# sandbox reads this file. Same mint as post-review: f_ plus 16 hex chars
# from /dev/urandom. Existing valid ids are left alone.
mint_missing_prior_ids() {
  local prior_file="$1"
  local missing mint_ids tmp
  missing="$(jq '[.findings[] | select(.id == null)] | length' "${prior_file}")"
  if [[ ! "${missing}" =~ ^[1-9][0-9]*$ ]]; then
    return 0
  fi
  mint_ids="$(
    od -An -N"$((missing * 8))" -tx1 /dev/urandom | tr -d ' \n' | fold -w16 | head -n "${missing}" | sed 's/^/f_/' \
      | jq -R . | jq -sc .
  )"
  tmp="$(mktemp "${prior_file}.mint.XXXXXX")"
  if jq -ce --argjson mints "${mint_ids}" '
    def valid_id: type == "string" and test("^f_[A-Za-z0-9]+$");
    .findings = (
      reduce .findings[] as $f ({out:[], i:0};
        if ($f.id | valid_id) then .out += [$f]
        elif ($mints[.i] | valid_id | not) then error("ran out of finding ids")
        else .out += [$f + {id: $mints[.i]}] | .i += 1
        end
      ) | .out
    )
  ' "${prior_file}" > "${tmp}"; then
    mv "${tmp}" "${prior_file}"
    return 0
  fi
  rm -f "${tmp}"
  return 1
}

# ---------------------------------------------------------------------------
# Replace the human-readable sticky review with a mechanically validated,
# structured projection before host_files copies it into the sandbox. The
# projection is appended by post-review.sh from schema-validated findings.
# Anything missing, malformed, unauthenticated, or projection-invalid fails closed to
# an empty file, which makes the agent perform a full first-review dispatch.
# ---------------------------------------------------------------------------
validate_prior_review_projection() {
  local prior_file="$1"
  local marker marker_version encoded decoded tmp_file
  local -a markers

  tmp_file="$(mktemp "${prior_file}.validated.XXXXXX")"
  # The poster preserves old markers in sticky history. Only the current
  # section can describe the reviewed SHA; history is never a fallback.
  # Comments edited on the forge can come back with CRLF line endings.
  mapfile -t markers < <(awk '/<!-- sticky:history-start -->/{exit} {sub(/\r$/, ""); print}' \
    "${prior_file}" \
    | grep -E '^<!-- fullsend:review-findings-v[12]:[A-Za-z0-9+/=]+ -->$' || true)
  if [[ ${#markers[@]} -ne 1 ]]; then
    : > "${prior_file}"
    rm -f "${tmp_file}"
    echo "::warning::Prior review projection rejected — using full first-review dispatch"
    return
  fi
  marker="${markers[0]}"
  marker_version="${marker#<!-- fullsend:review-findings-v}"
  marker_version="${marker_version%%:*}"
  encoded="${marker#<!-- fullsend:review-findings-v"${marker_version}":}"
  encoded="${encoded% -->}"
  decoded="$(printf '%s' "${encoded}" | base64 --decode 2>/dev/null || true)"

  if printf '%s' "${decoded}" | jq -ce --argjson marker_version "${marker_version}" '
    def allowed_category:
      IN(
        "logic-error", "nil-deref", "off-by-one", "edge-case", "api-contract", "missing-test", "test-inadequate", "pattern-violation", "test-weakened", "test-removed", "mock-loosened", "assertion-weakened", "coverage-reduced", "test-poisoning", "split-payload", "stale-reference",
        "auth-bypass", "rbac-violation", "data-exposure", "privilege-escalation", "injection-vuln", "sandbox-escape", "xss", "ssrf", "insecure-deserialization", "prompt-injection", "unicode-steganography", "bidi-override", "homoglyph-attack", "instruction-smuggling", "fail-open", "permission-expansion", "permission-reduction", "role-escalation", "workflow-permission", "secret-exposure",
        "scope-exceeded", "tier-mismatch", "unauthorized-change", "scope-creep", "missing-authorization", "misleading-label", "design-direction", "complexity-ratio", "misplaced-abstraction", "architectural-conflict", "design-smell", "over-engineering", "under-engineering", "scope-bundling",
        "naming-convention", "error-handling-idiom", "api-shape", "code-organization", "doc-style", "pattern-inconsistency",
        "stale-doc", "missing-doc", "incorrect-doc", "incomplete-doc",
        "breaking-api", "breaking-schema", "breaking-config", "breaking-cli", "missing-deprecation", "missing-version-bump", "backward-incompatible",
        "uxd-evaluate-code-heuristics"
      );
    def safe_path:
      type == "string" and length > 0 and . != "N/A" and
      test("^[ -~]+$") and
      (test("(^/|/$|//|(^|/)\\.\\.?(/|$)|[\\\\\\r\\n<>])") | not);
    # A persona name. Never checked against the persona manifest, so a
    # persona disabled between rounds keeps its prior ledger.
    def safe_dimension:
      type == "string" and test("^[a-z0-9][a-z0-9-]{0,63}$");
    .version as $projection_version
    | if (
      type == "object" and
      ((keys - ["version", "action", "findings", "dispositions"]) | length == 0) and
      (.version | IN(1, 2)) and
      .version == $marker_version and
      ((.action == null) or (.action | IN("approve", "request-changes", "comment", "reject"))) and
      (.findings | type == "array") and
      all(.findings[];
        type == "object" and
        ((keys - ["severity", "category", "file", "line", "id", "actionable", "dimension"]) | length == 0) and
        (.severity | IN("info", "low", "medium", "high", "critical")) and
        (.category | type == "string" and allowed_category) and
        ((.file == null and $projection_version == 2) or (.file | safe_path)) and
        (.line == null or (.line | type == "number" and . > 0 and floor == .)) and
        (.id == null or (.id | type == "string" and test("^f_[A-Za-z0-9]+$"))) and
        (.actionable == null or (.actionable | type == "boolean")) and
        (.dimension == null or ($projection_version == 2 and (.dimension | safe_dimension)))
      ) and
      ([.findings[].id | select(. != null)] | length == (unique | length)) and
      (.dispositions == null or (
        (.dispositions | type == "array") and
        all(.dispositions[];
          type == "object" and
          ((keys - ["id", "status"]) | length == 0) and
          (.id | type == "string" and test("^f_[A-Za-z0-9]+$")) and
          (.status | IN("open", "resolved_by_change", "reclassified", "dismissed_by_human"))
        ) and
        ([.dispositions[].id] | length == (unique | length))
      ))
    ) then {
      version: $projection_version,
      findings: [.findings[] | {
        severity: .severity,
        category: .category,
        file: .file,
        line: .line
      } + (if .id == null then {} else {id: .id} end)
        + (if .actionable == null then {} else {actionable: .actionable} end)
        + (if .dimension == null then {} else {dimension: .dimension} end)]
    } + (if .action == null then {} else {action: .action} end)
    + (if .dispositions == null then {} else {
      dispositions: [.dispositions[] | {id, status}]
    } end) else error("invalid prior review projection") end
  ' > "${tmp_file}"; then
    # Legacy findings (v1 / v2 without id) get an opaque id before the
    # sandbox so this review can write a disposition for them.
    if mint_missing_prior_ids "${tmp_file}"; then
      mv "${tmp_file}" "${prior_file}"
      echo "Prior review projection validated"
    else
      : > "${prior_file}"
      rm -f "${tmp_file}"
      echo "::warning::Prior review projection rejected — using full first-review dispatch"
    fi
  else
    : > "${prior_file}"
    rm -f "${tmp_file}"
    echo "::warning::Prior review projection rejected — using full first-review dispatch"
  fi
}

# Fetch resolved review threads for the final pre-sandbox authorization step
# as rich, verified records eligible for human dismissal. Raw comment text is
# used only on the host to extract finding-id stamps and is never persisted
# or copied into the sandbox.
# Close eligible prior findings before the model sees the ledger. Only exact
# stamped ids are authoritative. High and critical findings remain open.
apply_human_dismissals() {
  local prior_file="$1"
  local dismissals tmp_file

  [[ -s "${prior_file}" ]] || return 0
  dismissals="$(forge_get_human_dismissals)" || dismissals='[]'
  if ! jq -e 'type == "array"' <<< "${dismissals}" >/dev/null 2>&1; then
    dismissals='[]'
  fi

  tmp_file="$(mktemp "${prior_file}.dismissals.XXXXXX")"
  if ! jq --argjson dismissals "${dismissals}" '
    def valid_id: type == "string" and test("^f_[A-Za-z0-9]+$");
    def closed_status: IN("resolved_by_change", "dismissed_by_human");
    ([ $dismissals[]?.finding_ids[]? ] | unique) as $dismissed_ids
    | ([.dispositions[]? | select(.status | closed_status) | .id]) as $closed
    | ([.findings[] | select((.id | valid_id) and (.id as $id | $closed | index($id) == null))]) as $open
    | ([ $open[]
         | . as $finding
         | select((.severity | IN("high", "critical")) | not)
         | select($dismissed_ids | index($finding.id) != null)
         | {id: .id, status: "dismissed_by_human"}
       ]) as $new
    | if ($new | length) == 0 then .
      else .dispositions = ([.dispositions[]? | select(.id as $id | any($new[]; .id == $id) | not)] + $new)
      end
  ' "${prior_file}" > "${tmp_file}"; then
    rm -f "${tmp_file}"
    echo "::warning::Human-dismissal matching failed — keeping prior dispositions unchanged"
    return 0
  fi

  mv "${tmp_file}" "${prior_file}"
}

if [[ -n "${PRIOR_REVIEW_FILE:-}" && -f "${PRIOR_REVIEW_FILE}" ]]; then
  case "${PRIOR_REVIEW_PROVENANCE:-none}" in
    app-verified|bot-verified) validate_prior_review_projection "${PRIOR_REVIEW_FILE}" ;;
    *) : > "${PRIOR_REVIEW_FILE}" ;;
  esac
fi

# ---------------------------------------------------------------------------
# Check PR state — skip review on merged or closed PRs
# ---------------------------------------------------------------------------
if [[ -z "${REVIEW_TOKEN:-}" ]]; then
  echo "No token available — skipping PR state check"
  exit 0
fi

PR_STATE="$(forge_get_pr_state)"

if [[ -n "${PR_STATE}" && "${PR_STATE}" != "OPEN" ]]; then
  echo "::notice::PR #${PR_NUMBER} is ${PR_STATE} — skipping review"

  STATE_LOWER="$(echo "${PR_STATE}" | tr '[:upper:]' '[:lower:]')"
  COMMENT_BODY="Review skipped — this PR is already **${STATE_LOWER}**.

The \`/fs-review\` command only reviews open PRs/MRs.

<sub>Posted by <a href=\"https://github.com/fullsend-ai/fullsend\">fullsend</a> pre-review check</sub>"

  forge_post_comment "${COMMENT_BODY}" 2>/dev/null || true

  prescript_output "skipped" "true"
  prescript_output "reason" "PR #${PR_NUMBER} is already ${STATE_LOWER}"
  exit 0
fi

# ADR 0002 block 12: clear a stale ready-for-merge at review start, before the
# skip-author exit. post-review re-adds it only when this run approves.
if ! PR_LABELS="$(forge_get_pr_labels)"; then
  echo "::warning::Could not read PR labels — removing ready-for-merge unchecked"
  PR_LABELS="ready-for-merge"
fi
if grep -qxF "ready-for-merge" <<< "${PR_LABELS}"; then
  if forge_remove_label_checked "ready-for-merge"; then
    echo "::notice::Removed ready-for-merge from PR #${PR_NUMBER} at review start"
  else
    echo "::warning::Failed to remove ready-for-merge from PR #${PR_NUMBER}"
  fi
fi

# ---------------------------------------------------------------------------
# Check author skip list — exit early if PR author is in REVIEW_SKIP_AUTHORS
# ---------------------------------------------------------------------------
if [[ -n "${REVIEW_SKIP_AUTHORS:-}" ]]; then
  PR_AUTHOR="$(forge_get_pr_author)"

  if [[ -n "${PR_AUTHOR}" ]]; then
    IFS=',' read -ra _SKIP_LIST <<< "${REVIEW_SKIP_AUTHORS}"
    for _entry in "${_SKIP_LIST[@]}"; do
      read -r _entry <<< "${_entry}"  # trim whitespace
      if [[ "${_entry,,}" == "${PR_AUTHOR,,}" ]]; then
        _SAFE_AUTHOR="$(_gha_sanitize "${PR_AUTHOR}")"
        echo "::notice::PR #${PR_NUMBER} authored by ${_SAFE_AUTHOR} — skipping review (REVIEW_SKIP_AUTHORS)"

        COMMENT_BODY="Review skipped — PR author **${PR_AUTHOR}** is in the \`REVIEW_SKIP_AUTHORS\` list.

<sub>Posted by <a href=\"https://github.com/fullsend-ai/fullsend\">fullsend</a> pre-review check</sub>"

        forge_post_comment "${COMMENT_BODY}" 2>/dev/null || true

        prescript_output "skipped" "true"
        prescript_output "reason" "PR author ${_SAFE_AUTHOR} is in REVIEW_SKIP_AUTHORS"
        exit 0
      fi
    done
  fi
fi

# ---------------------------------------------------------------------------
# Deepen shallow clone for git history analysis (risk assessment Tier 2).
# When REVIEW_GIT_FETCH_DEPTH is unset, default to "0" (full unshallow) if
# risk assessment is enabled — the Tier 2 sub-agent needs full git history.
# Explicit values always take precedence.
# ---------------------------------------------------------------------------
if [[ -z "${REVIEW_GIT_FETCH_DEPTH+set}" && "${REVIEW_RISK_ASSESSMENT_ENABLED:-false}" == "true" ]]; then
  REVIEW_GIT_FETCH_DEPTH="0"
fi
if [[ "${REVIEW_GIT_FETCH_DEPTH:-}" == "0" ]]; then
  _TARGET_DIR="${REPO_DIR:-${GITHUB_WORKSPACE:-.}/target-repo}"
  if [[ ! -d "${_TARGET_DIR}" ]]; then
    echo "::warning::Clone-deepening skipped — target directory '${_TARGET_DIR}' not found"
  elif git -C "${_TARGET_DIR}" rev-parse --is-shallow-repository 2>/dev/null | grep -q true; then
    echo "Deepening shallow clone for git history analysis..."
    if [[ "${FULLSEND_FORGE}" == "github" && -n "${GH_TOKEN:-}" && -n "${REPO_FULL_NAME:-}" ]]; then
      # Fetch from the run's own GitHub host and scope the token to it.
      if server=$(_github_server_url); then
        git -C "${_TARGET_DIR}" \
          -c "http.${server}/.extraheader=Authorization: basic $(printf 'x-access-token:%s' "${GH_TOKEN}" | base64 -w0)" \
          fetch --unshallow "${server}/${REPO_FULL_NAME}.git" 2>/dev/null \
          && echo "Clone deepened successfully" \
          || echo "::warning::Failed to deepen clone — Tier 2 risk signals may be degraded"
      else
        echo "::warning::Cannot deepen clone — GITHUB_SERVER_URL is not a valid HTTPS origin"
      fi
    else
      echo "::warning::Cannot deepen clone — missing credentials or unsupported forge"
    fi
  fi
fi

# Fetch and apply current human-dismissal evidence only after all early exits
# and immediately before the validated ledger is copied into the sandbox.
if [[ -n "${PRIOR_REVIEW_FILE:-}" && -f "${PRIOR_REVIEW_FILE}" ]]; then
  case "${PRIOR_REVIEW_PROVENANCE:-none}" in
    app-verified|bot-verified) apply_human_dismissals "${PRIOR_REVIEW_FILE}" ;;
  esac
fi

echo "PR #${PR_NUMBER} is open — proceeding with review agent"
