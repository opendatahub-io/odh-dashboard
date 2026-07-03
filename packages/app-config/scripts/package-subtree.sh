#!/bin/bash

set -e

# Script to sync upstream repository content into monorepo using patch-based incremental updates
# Usage: ./package-subtree.sh --package=<package-name> [--commit=<commit-sha>] [--continue]

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")")" && pwd)"
source "$SCRIPT_DIR/package-subtree-common.sh"

show_usage() {
  echo "Usage: $0 --package=<package-name> [--commit=<commit-sha>] [--continue] [--pr=<pr-url>]"
  echo ""
  echo "Options:"
  echo "  --package=NAME     Required. Name of the package to update (e.g., @odh-dashboard/model-registry)"
  echo "  --commit=SHA       Optional. Specific commit to update to (default: latest)"
  echo "  --continue         Continue from a previous conflict resolution"
  echo "  --pr=URL           Optional. GitHub PR URL to temporarily sync from (e.g., https://github.com/owner/repo/pull/123)"
  echo ""
  echo "Examples:"
  echo "  $0 --package=@odh-dashboard/model-registry"
  echo "  $0 --package=@odh-dashboard/model-registry --commit=abc123"
  echo "  $0 --package=@odh-dashboard/model-registry --continue"
  echo "  $0 --package=@odh-dashboard/model-registry --pr=https://github.com/kubeflow/model-registry/pull/123"
}

# Parse command line arguments
CONTINUE_MODE=false
PACKAGE_NAME=""
COMMIT_SHA=""
PR_URL=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --package=*)
      PACKAGE_NAME="${1#*=}"
      shift
      ;;
    --commit=*)
      COMMIT_SHA="${1#*=}"
      shift
      ;;
    --continue)
      CONTINUE_MODE=true
      shift
      ;;
    --pr=*)
      PR_URL="${1#*=}"
      shift
      ;;
    -h|--help)
      show_usage
      exit 0
      ;;
    *)
      error_msg "Unknown option: $1"
      echo ""
      show_usage
      clean_exit 1 "" true
      ;;
  esac
done

# Validate required arguments
if [ -z "$PACKAGE_NAME" ]; then
  error_msg "--package is required"
  echo ""
  show_usage
  clean_exit 1 "" true
fi

# Verify required tools are available early
for tool in git npm jq; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    clean_exit 1 "Required tool '$tool' not found in PATH" true
  fi
done

MONOREPO_ROOT="$(git rev-parse --show-toplevel)"

# Find workspace location using npm query
WORKSPACE_INFO=$(npm query ".workspace[name=\"$PACKAGE_NAME\"]" 2>/dev/null)
if [ -z "$WORKSPACE_INFO" ] || [ "$WORKSPACE_INFO" = "[]" ]; then
  error_msg "Package '$PACKAGE_NAME' not found"
  echo "Available packages:"
  npm query ".workspace" | jq -r '.[].name' | sed 's/^/  /'
  clean_exit 1 "" true
fi

WORKSPACE_LOCATION=$(echo "$WORKSPACE_INFO" | jq -r '.[0].location')
if [ -z "$WORKSPACE_LOCATION" ] || [ "$WORKSPACE_LOCATION" = "null" ]; then
  error_msg "Could not determine location for package '$PACKAGE_NAME'"
  clean_exit 1 "" true
fi

PACKAGE_JSON="$MONOREPO_ROOT/$WORKSPACE_LOCATION/package.json"

cd "$MONOREPO_ROOT"

# Handle --pr option to temporarily override repo and branch
if [ -n "$PR_URL" ]; then
  if ! command -v gh >/dev/null 2>&1; then
    clean_exit 1 "The 'gh' CLI tool is required for --pr option but not found in PATH" true
  fi

  progress_msg "Fetching PR information from $PR_URL"

  PR_INFO=$(gh pr view "$PR_URL" --json headRepositoryOwner,headRepository,headRefName 2>&1)
  if [ $? -ne 0 ]; then
    error_msg "Failed to fetch PR information"
    echo "$PR_INFO"
    clean_exit 1 "" true
  fi

  PR_REPO_OWNER=$(echo "$PR_INFO" | jq -r '.headRepositoryOwner.login')
  PR_REPO_NAME=$(echo "$PR_INFO" | jq -r '.headRepository.name')
  PR_BRANCH=$(echo "$PR_INFO" | jq -r '.headRefName')

  if [ -z "$PR_REPO_OWNER" ] || [ "$PR_REPO_OWNER" = "null" ] || \
     [ -z "$PR_REPO_NAME" ] || [ "$PR_REPO_NAME" = "null" ] || \
     [ -z "$PR_BRANCH" ] || [ "$PR_BRANCH" = "null" ]; then
    error_msg "Failed to extract repository and branch information from PR"
    echo "This could mean:"
    echo "  • The gh CLI is not authenticated (run 'gh auth login')"
    echo "  • The PR URL is invalid"
    echo "  • The JSON structure from gh has changed"
    clean_exit 1 "" true
  fi

  PR_REPO_URL="https://github.com/$PR_REPO_OWNER/$PR_REPO_NAME.git"

  info_msg "PR Details:"
  echo "  Repository: $PR_REPO_URL"
  echo "  Branch: $PR_BRANCH"
  echo ""

  warning_msg "Temporarily updating package.json with PR overrides"
  echo -e "${RED}⚠️  DO NOT MERGE these changes!${NC}"
  echo ""

  temp_file="$PACKAGE_JSON.tmp"
  if ! jq --arg repo "$PR_REPO_URL" \
          --arg branch "$PR_BRANCH" \
          --arg pr_url "$PR_URL" \
          '.subtree = {
            DO_NOT_MERGE_OVERRIDDEN_FOR_PR: $pr_url,
            repo: $repo,
            branch: $branch,
            src: .subtree.src,
            target: .subtree.target,
            commit: .subtree.commit
          } |
          if .subtree.src == null then del(.subtree.src) else . end' \
          "$PACKAGE_JSON" > "$temp_file"; then
    error_msg "Failed to update package.json with PR overrides"
    rm -f "$temp_file"
    clean_exit 1 "" true
  fi

  if ! mv "$temp_file" "$PACKAGE_JSON"; then
    error_msg "Failed to write updated package.json"
    rm -f "$temp_file"
    clean_exit 1 "" true
  fi

  success_msg "Updated package.json with temporary PR overrides"

  if ! git add "$PACKAGE_JSON"; then
    error_msg "Failed to stage package.json"
    clean_exit 1 "" true
  fi

  commit_msg="[DO NOT MERGE - PR TEST SYNC] Override subtree config for PR testing

Temporarily syncing from PR: $PR_URL
Repository: $PR_REPO_URL
Branch: $PR_BRANCH

This commit should NOT be merged. It exists only to test changes from an unmerged PR."

  if ! git commit -q -m "$commit_msg"; then
    warning_msg "Failed to commit package.json changes (assuming changes were already present)"
  else
    success_msg "Committed package.json changes with DO NOT MERGE warning"
  fi
  echo ""
fi

# Read config from package.json (needed for both modes)
UPSTREAM_REPO=$(jq -r '.subtree.repo' "$PACKAGE_JSON")
UPSTREAM_SUBDIR=$(jq -r '.subtree.src // ""' "$PACKAGE_JSON")
TARGET_RELATIVE=$(jq -r '.subtree.target' "$PACKAGE_JSON")
CURRENT_COMMIT=$(jq -r '.subtree.commit // ""' "$PACKAGE_JSON")
UPSTREAM_BRANCH=$(jq -r '.subtree.branch // "main"' "$PACKAGE_JSON")
DO_NOT_MERGE_FLAG=$(jq -r '.subtree.DO_NOT_MERGE_OVERRIDDEN_FOR_PR // ""' "$PACKAGE_JSON")

COMMIT_PREFIX=""
if [ -n "$DO_NOT_MERGE_FLAG" ] && [ "$DO_NOT_MERGE_FLAG" != "null" ]; then
  COMMIT_PREFIX="[DO NOT MERGE - PR TEST SYNC] "
fi

if [ -z "$UPSTREAM_REPO" ] || [ "$UPSTREAM_REPO" = "null" ]; then
  clean_exit 1 "Missing subtree.repo in $PACKAGE_JSON" true
fi
if [ -z "$TARGET_RELATIVE" ] || [ "$TARGET_RELATIVE" = "null" ]; then
  clean_exit 1 "Missing subtree.target in $PACKAGE_JSON" true
fi

# Handle continue mode
if [ "$CONTINUE_MODE" = true ]; then
  progress_msg "Continue mode: Processing staged changes from conflict resolution"

  conflict_files=()
  files_with_markers=()
  while IFS= read -r -d '' file; do
    [ -n "$file" ] && conflict_files+=("$file")
    if [ -n "$file" ] && grep -qE '^<<<<<<< |^=======$|^>>>>>>> ' "$file"; then
      files_with_markers+=("$file")
    fi
  done < <(git diff --name-only --diff-filter=U -z)

  if [ "${#files_with_markers[@]}" -gt 0 ]; then
    error_msg "There are still unresolved conflicts"
    echo "The following files still contain conflict markers:"
    for file in "${files_with_markers[@]}"; do
      echo "  $file"
    done
    echo ""
    echo -e "${INFO_ICON} Please resolve all conflicts before using ${CYAN}--continue${NC}"
    clean_exit 1 "" true
  fi

  if [ "${#conflict_files[@]}" -gt 0 ]; then
    warning_msg "Found resolved conflicts that need staging"
    echo "Files with resolved conflicts:"
    for file in "${conflict_files[@]}"; do
      echo "  $file"
    done
  fi

  if git diff --cached --quiet; then
    error_msg "No staged changes found"
    echo -e "Please stage your resolved conflicts: ${YELLOW}git add $WORKSPACE_LOCATION${NC}"
    clean_exit 1 "" true
  fi

  info_msg "Committing staged changes..."

  TMP_DIR=$(mktemp -d)
  trap 'cd "$MONOREPO_ROOT"; rm -rf "$TMP_DIR"' EXIT

  git clone -q -b "$UPSTREAM_BRANCH" "$UPSTREAM_REPO" "$TMP_DIR/repo"
  cd "$TMP_DIR/repo"

  if [ -n "$COMMIT_SHA" ]; then
    git checkout -q "$COMMIT_SHA"
    TARGET_COMMIT=$(git rev-parse HEAD)
  else
    TARGET_COMMIT=$(git rev-parse HEAD)
  fi

  if ! git merge-base --is-ancestor "$CURRENT_COMMIT" HEAD 2>/dev/null; then
    cd "$MONOREPO_ROOT"
    error_msg "Current commit $CURRENT_COMMIT not found in branch '$UPSTREAM_BRANCH' of $UPSTREAM_REPO"
    echo ""
    echo "You are probably syncing from a temporarily overridden repo and branch for an"
    echo "unmerged PR. The PR's branch may be out of date. Rebase it and try again."
    clean_exit 1 "" true
  fi

  commits=$(git rev-list --reverse "$CURRENT_COMMIT..$TARGET_COMMIT")
  if [ -n "$commits" ]; then
    continue_commit=$(echo "$commits" | head -n 1)
    continue_commit_msg=$(git log -1 --format="%s" "$continue_commit")

    cd "$MONOREPO_ROOT"
    git commit -q -m "${COMMIT_PREFIX}Update $PACKAGE_NAME: $continue_commit_msg (resolved conflicts)

Upstream commit: $continue_commit"

    success_msg "Committed resolved conflicts for $continue_commit: $continue_commit_msg"

    if update_package_json_commit "$continue_commit"; then
      if ! git add "$PACKAGE_JSON"; then
        clean_exit 1 "Failed to stage package.json after committing conflicts"
      fi
      git commit -q --amend --no-edit
      info_msg "Updated package.json to track commit $continue_commit"
    else
      clean_exit 1 "Failed to update package.json after committing conflicts"
    fi

    CURRENT_COMMIT="$continue_commit"
  else
    git commit -q -m "${COMMIT_PREFIX}Update $PACKAGE_NAME: Manual conflict resolution"
    success_msg "Committed staged changes"
  fi

else
  check_working_tree_clean
fi

# Derive target path (relative to workspace directory)
TARGET_DIR="$MONOREPO_ROOT/$WORKSPACE_LOCATION/$TARGET_RELATIVE"

progress_msg "Syncing $PACKAGE_NAME from $UPSTREAM_REPO"

# Set up temp directory
TMP_DIR=$(mktemp -d)
trap 'cd "$MONOREPO_ROOT"; rm -rf "$TMP_DIR"' EXIT

# Clone repository
git clone -q -b "$UPSTREAM_BRANCH" "$UPSTREAM_REPO" "$TMP_DIR/repo"
cd "$TMP_DIR/repo"

# Get target commit SHA
if [ -n "$COMMIT_SHA" ]; then
  git checkout -q "$COMMIT_SHA"
  TARGET_COMMIT=$(git rev-parse HEAD)
else
  TARGET_COMMIT=$(git rev-parse HEAD)
fi

# Validate that CURRENT_COMMIT exists in this branch (skip for initial setup)
if [ -n "$CURRENT_COMMIT" ] && [ "$CURRENT_COMMIT" != "null" ] && [ "$CURRENT_COMMIT" != "" ]; then
  if ! git merge-base --is-ancestor "$CURRENT_COMMIT" HEAD 2>/dev/null; then
    error_msg "Current commit $CURRENT_COMMIT not found in branch '$UPSTREAM_BRANCH' of $UPSTREAM_REPO"
    echo ""
    echo "You are probably syncing from a temporarily overridden repo and branch for an"
    echo "unmerged PR. The PR's branch may be out of date. Rebase it and try again."
    clean_exit 1 "" true
  fi
fi

# Handle initial setup case
if [ ! -d "$TARGET_DIR" ] && ([ -z "$CURRENT_COMMIT" ] || [ "$CURRENT_COMMIT" = "null" ] || [ "$CURRENT_COMMIT" = "" ]); then
  progress_msg "Performing initial setup - no previous commit found"

  cd "$TMP_DIR/repo"
  git checkout -q "$TARGET_COMMIT"

  if ! copy_upstream_files "$TMP_DIR/repo" "$UPSTREAM_SUBDIR" "$TARGET_DIR"; then
    clean_exit 1 "Failed to copy files during initial setup"
  fi

  cd "$MONOREPO_ROOT"

  if ! update_package_json_commit "$TARGET_COMMIT"; then
    clean_exit 1 "Failed to update package.json during initial setup"
  fi

  if ! git add "$WORKSPACE_LOCATION" "$PACKAGE_JSON"; then
    clean_exit 1 "Failed to stage files during initial setup"
  fi

  initial_commit_msg="${COMMIT_PREFIX}chore(subtree): initial sync of $PACKAGE_NAME to $TARGET_COMMIT"
  if ! git commit -q -m "$initial_commit_msg"; then
    clean_exit 1 "Failed to create initial setup commit"
  fi

  success_msg "Successfully performed initial setup: $initial_commit_msg"
  exit 0
fi

# Early exit if no changes
if [ "$CURRENT_COMMIT" = "$TARGET_COMMIT" ] && [ -d "$TARGET_DIR" ]; then
  info_msg "Already up-to-date at $TARGET_COMMIT"
  exit 0
fi

_git_upstream_cmd() {
  git "$@"
}

_filter_rev_list() {
  local from_commit="$1"
  local to_commit="$2"
  git rev-list --no-merges --reverse "$from_commit..$to_commit"
}

_get_commit_url() {
  local commit="$1"
  local repo_base="${UPSTREAM_REPO%.git}"
  echo "  $repo_base/commit/$commit"
}

_get_continue_cmd() {
  echo "npm run update-subtree -w $WORKSPACE_LOCATION -- --continue"
}

_pre_apply_hook() {
  :
}

_before_apply_hook() {
  :
}

_post_iteration_hook() {
  cd "$TMP_DIR/repo"
}

if [ ! -d "$TARGET_DIR" ]; then
  mkdir -p "$TARGET_DIR"
fi

apply_patch_based_update "$CURRENT_COMMIT" "$TARGET_COMMIT" "$UPSTREAM_SUBDIR" "$TARGET_DIR"

cd "$MONOREPO_ROOT"

success_msg "Successfully updated $PACKAGE_NAME to $TARGET_COMMIT"

if [ -n "$DO_NOT_MERGE_FLAG" ] && [ "$DO_NOT_MERGE_FLAG" != "null" ]; then
  echo ""
  echo -e "${RED}╔════════════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║                                                                            ║${NC}"
  echo -e "${RED}║  ⚠️  WARNING: DO NOT MERGE THESE COMMITS! ⚠️                               ║${NC}"
  echo -e "${RED}║                                                                            ║${NC}"
  echo -e "${RED}║  These commits are ONLY for testing changes from an unmerged upstream PR.  ║${NC}"
  echo -e "${RED}║                                                                            ║${NC}"
  echo -e "${RED}║  All commits created during this sync have the prefix:                     ║${NC}"
  echo -e "${RED}║  [DO NOT MERGE - PR TEST SYNC]                                             ║${NC}"
  echo -e "${RED}║                                                                            ║${NC}"
  echo -e "${RED}║  Next steps:                                                               ║${NC}"
  echo -e "${RED}║  1. Test the changes from the upstream PR                                  ║${NC}"
  echo -e "${RED}║  2. After the PR is merged upstream, start a fresh branch from             ║${NC}"
  echo -e "${RED}║     odh-dashboard main                                                     ║${NC}"
  echo -e "${RED}║  3. Run the sync script again WITHOUT the --pr option to get the           ║${NC}"
  echo -e "${RED}║     official merged changes                                                ║${NC}"
  echo -e "${RED}║                                                                            ║${NC}"
  echo -e "${RED}║  DO NOT merge this branch into odh-dashboard main!                         ║${NC}"
  echo -e "${RED}║                                                                            ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
fi
