#!/bin/bash

set -euo pipefail

# Script to sync local upstream repository content into monorepo using patch-based incremental updates
# This is the local variant of package-subtree.sh — reads from a local repository path instead of cloning.
# Usage: ./package-subtree-local.sh --package=<package-name> --local-repo=<path> --branch=<branch> [--commit=<sha>] [--up-to=<sha>] [--continue]

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || realpath "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")")" && pwd)"
source "$SCRIPT_DIR/package-subtree-common.sh"

TEMP_REMOTE_NAME="_subtree_local_temp"

cleanup_temp_remote() {
  if git remote get-url "$TEMP_REMOTE_NAME" >/dev/null 2>&1; then
    git remote remove "$TEMP_REMOTE_NAME" 2>/dev/null || true
  fi
}

ensure_base_blobs_in_index() {
  local patch_file="$1"
  local target_dir="$2"
  local current_file=""

  while IFS= read -r line; do
    if [[ "$line" =~ ^diff\ --git\ a/(.*)\ b/(.*) ]]; then
      current_file="${BASH_REMATCH[2]}"
      continue
    fi

    if [ -z "$current_file" ]; then
      continue
    fi

    if [[ "$line" =~ ^index\ ([0-9a-f]+)\.\.([0-9a-f]+)(\ ([0-9]+))? ]]; then
      local old_hash="${BASH_REMATCH[1]}"
      local mode="${BASH_REMATCH[4]:-100644}"
      local full_path="$target_dir/$current_file"

      current_file=""

      if git ls-files --error-unmatch "$full_path" >/dev/null 2>&1; then
        continue
      fi

      if [ "$old_hash" = "0000000" ] || [ "$old_hash" = "00000000" ]; then
        continue
      fi

      local full_old_hash
      full_old_hash=$(git rev-parse "$old_hash" 2>/dev/null || echo "")

      if [ -n "$full_old_hash" ] && git cat-file -e "$full_old_hash" 2>/dev/null; then
        git update-index --add --cacheinfo "$mode,$full_old_hash,$full_path" 2>/dev/null || true
      fi
    fi
  done < "$patch_file"
}

show_do_not_merge_warning() {
  echo ""
  echo -e "${RED}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║                                                                          ║${NC}"
  echo -e "${RED}║  WARNING: DO NOT MERGE THESE COMMITS!                                    ║${NC}"
  echo -e "${RED}║                                                                          ║${NC}"
  echo -e "${RED}║  These commits sync from a LOCAL repository and may reference commits    ║${NC}"
  echo -e "${RED}║  that don't exist in the official upstream.                              ║${NC}"
  echo -e "${RED}║                                                                          ║${NC}"
  echo -e "${RED}║  All commits created during this sync have the prefix:                   ║${NC}"
  echo -e "${RED}║  [DO NOT MERGE - LOCAL SYNC]                                             ║${NC}"
  echo -e "${RED}║                                                                          ║${NC}"
  echo -e "${RED}║  Local repo: $(printf '%-58s' "$LOCAL_REPO_RESOLVED")║${NC}"
  echo -e "${RED}║  Branch: $(printf '%-62s' "$LOCAL_BRANCH")║${NC}"
  echo -e "${RED}║                                                                          ║${NC}"
  echo -e "${RED}║  Next steps:                                                             ║${NC}"
  echo -e "${RED}║  1. Test the changes from the local repository                           ║${NC}"
  echo -e "${RED}║  2. After the changes are merged upstream, start a fresh branch from     ║${NC}"
  echo -e "${RED}║     odh-dashboard main                                                   ║${NC}"
  echo -e "${RED}║  3. Run the sync script again WITHOUT the --local-repo option to get     ║${NC}"
  echo -e "${RED}║     the official merged changes                                          ║${NC}"
  echo -e "${RED}║                                                                          ║${NC}"
  echo -e "${RED}║  DO NOT merge this branch into odh-dashboard main!                       ║${NC}"
  echo -e "${RED}║                                                                          ║${NC}"
  echo -e "${RED}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

show_usage() {
  echo "Usage: $0 --package=<package-name> --local-repo=<path> --branch=<branch> [--commit=<commit-sha>] [--up-to=<commit-sha>] [--continue]"
  echo ""
  echo "Options:"
  echo "  --package=NAME         Required. Name of the package to update (e.g., @odh-dashboard/model-registry)"
  echo "  --local-repo=PATH      Required. Absolute or relative path to the local upstream repository"
  echo "  --branch=BRANCH        Required. Branch in the local repository to sync from"
  echo "  --commit=SHA           Optional. Apply ONLY this specific commit (cherry-pick mode)"
  echo "  --up-to=SHA            Optional. Apply all commits from current up to this commit (range mode)"
  echo "  --continue             Continue from a previous conflict resolution"
  echo ""
  echo "Examples:"
  echo "  # Sync all new commits from the branch"
  echo "  $0 --package=@odh-dashboard/model-registry --local-repo=../model-registry --branch=feature/new-ui"
  echo ""
  echo "  # Apply only one specific commit"
  echo "  $0 --package=@odh-dashboard/model-registry --local-repo=../model-registry --branch=main --commit=abc123"
  echo ""
  echo "  # Apply all commits up to a specific one"
  echo "  $0 --package=@odh-dashboard/model-registry --local-repo=../model-registry --branch=main --up-to=abc123"
  echo ""
  echo "  # Continue after resolving conflicts"
  echo "  $0 --package=@odh-dashboard/model-registry --local-repo=../model-registry --branch=feature/new-ui --continue"
}

CONTINUE_MODE=false
PACKAGE_NAME=""
COMMIT_SHA=""
UP_TO_SHA=""
LOCAL_REPO=""
LOCAL_BRANCH=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --package=*)
      PACKAGE_NAME="${1#*=}"
      shift
      ;;
    --local-repo=*)
      LOCAL_REPO="${1#*=}"
      shift
      ;;
    --branch=*)
      LOCAL_BRANCH="${1#*=}"
      shift
      ;;
    --commit=*)
      COMMIT_SHA="${1#*=}"
      shift
      ;;
    --up-to=*)
      UP_TO_SHA="${1#*=}"
      shift
      ;;
    --continue)
      CONTINUE_MODE=true
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

if [ -z "$PACKAGE_NAME" ]; then
  error_msg "--package is required"
  echo ""
  show_usage
  clean_exit 1 "" true
fi

if [ -z "$LOCAL_REPO" ]; then
  error_msg "--local-repo is required"
  echo ""
  show_usage
  clean_exit 1 "" true
fi

if [ -z "$LOCAL_BRANCH" ]; then
  error_msg "--branch is required"
  echo ""
  show_usage
  clean_exit 1 "" true
fi

if [ -n "$COMMIT_SHA" ] && [ -n "$UP_TO_SHA" ]; then
  error_msg "--commit and --up-to are mutually exclusive. Use --commit to apply a single commit or --up-to to apply a range."
  echo ""
  show_usage
  clean_exit 1 "" true
fi

LOCAL_REPO="${LOCAL_REPO/#\~/$HOME}"

for tool in git npm jq; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    clean_exit 1 "Required tool '$tool' not found in PATH" true
  fi
done

if [ ! -d "$LOCAL_REPO" ]; then
  clean_exit 1 "Path '$LOCAL_REPO' does not exist or is not a directory" true
fi

LOCAL_REPO_INPUT=$(cd "$LOCAL_REPO" && pwd)

if ! git -C "$LOCAL_REPO_INPUT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  clean_exit 1 "Path '$LOCAL_REPO_INPUT' is not a valid Git repository" true
fi

LOCAL_REPO_RESOLVED=$(git -C "$LOCAL_REPO_INPUT" rev-parse --show-toplevel)
if [ "$LOCAL_REPO_INPUT" != "$LOCAL_REPO_RESOLVED" ]; then
  warning_msg "Path points to a subdirectory inside the Git repository"
  echo "  Provided:  $LOCAL_REPO_INPUT"
  echo "  Repo root: $LOCAL_REPO_RESOLVED"
  echo "  Using repo root for sync operations."
  echo ""
fi
LOCAL_REPO_ORIGIN=$(git -C "$LOCAL_REPO_RESOLVED" remote get-url origin 2>/dev/null || echo "")
LOCAL_REPO_LABEL="$LOCAL_REPO_RESOLVED"

if ! git -C "$LOCAL_REPO_RESOLVED" rev-parse --verify "$LOCAL_BRANCH" >/dev/null 2>&1; then
  error_msg "Branch '$LOCAL_BRANCH' does not exist in $LOCAL_REPO_RESOLVED"
  echo ""
  echo "Available branches:"
  git -C "$LOCAL_REPO_RESOLVED" branch -a --format='  %(refname:short)' | head -20
  BRANCH_COUNT=$(git -C "$LOCAL_REPO_RESOLVED" branch -a | wc -l | tr -d ' ')
  if [ "$BRANCH_COUNT" -gt 20 ]; then
    echo "  ... and $((BRANCH_COUNT - 20)) more"
  fi
  clean_exit 1 "" true
fi

MONOREPO_ROOT="$(git rev-parse --show-toplevel)"

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

UPSTREAM_SUBDIR=$(jq -r '.subtree.src // ""' "$PACKAGE_JSON")
TARGET_RELATIVE=$(jq -r '.subtree.target' "$PACKAGE_JSON")
CURRENT_COMMIT=$(jq -r '.subtree.commit // ""' "$PACKAGE_JSON")

COMMIT_PREFIX="[DO NOT MERGE - LOCAL SYNC] "

if [ -z "$TARGET_RELATIVE" ] || [ "$TARGET_RELATIVE" = "null" ]; then
  clean_exit 1 "Missing subtree.target in $PACKAGE_JSON" true
fi

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

  staged_files_with_markers=()
  while IFS= read -r -d '' staged_file; do
    [ -z "$staged_file" ] && continue

    case "$staged_file" in
      "$WORKSPACE_LOCATION"/*|"$PACKAGE_JSON")
        ;;
      *)
        error_msg "Staged file '$staged_file' is outside the allowed scope ($WORKSPACE_LOCATION or $PACKAGE_JSON)"
        clean_exit 1 "" true
        ;;
    esac

    local_blob_content=$(git show ":$staged_file" 2>/dev/null || echo "")
    if echo "$local_blob_content" | grep -qE '^<<<<<<< |^=======$|^>>>>>>> |^<<<<<<< PATCH FAILED TO APPLY'; then
      staged_files_with_markers+=("$staged_file")
    fi
  done < <(git diff --cached --name-only -z)

  if [ "${#staged_files_with_markers[@]}" -gt 0 ]; then
    error_msg "Staged files still contain conflict markers"
    echo "The following staged files contain unresolved conflict or patch markers:"
    for file in "${staged_files_with_markers[@]}"; do
      echo "  $file"
    done
    echo ""
    echo -e "${INFO_ICON} Please resolve all conflicts before using ${CYAN}--continue${NC}"
    clean_exit 1 "" true
  fi

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

  TARGET_COMMIT=$(git -C "$LOCAL_REPO_RESOLVED" rev-parse "$LOCAL_BRANCH")
  if [ -n "$COMMIT_SHA" ]; then
    TARGET_COMMIT="$COMMIT_SHA"
  elif [ -n "$UP_TO_SHA" ]; then
    TARGET_COMMIT="$UP_TO_SHA"
  fi

  if [ -n "$COMMIT_SHA" ]; then
    continue_commit="$COMMIT_SHA"
    continue_commit_msg=$(git -C "$LOCAL_REPO_RESOLVED" log -1 --format="%s" "$continue_commit")

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
  else
    if ! git -C "$LOCAL_REPO_RESOLVED" merge-base --is-ancestor "$CURRENT_COMMIT" "$TARGET_COMMIT" 2>/dev/null; then
      error_msg "Current commit $CURRENT_COMMIT not found in branch '$LOCAL_BRANCH' of $LOCAL_REPO_RESOLVED"
      echo ""
      echo "The local branch may be out of date. Rebase it and try again."
      clean_exit 1 "" true
    fi

    commits=$(git -C "$LOCAL_REPO_RESOLVED" rev-list --reverse "$CURRENT_COMMIT..$TARGET_COMMIT")
    if [ -n "$commits" ]; then
      continue_commit=$(echo "$commits" | head -n 1)
      continue_commit_msg=$(git -C "$LOCAL_REPO_RESOLVED" log -1 --format="%s" "$continue_commit")

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
  fi

else
  check_working_tree_clean
fi

TARGET_DIR="$MONOREPO_ROOT/$WORKSPACE_LOCATION/$TARGET_RELATIVE"

info_msg "Syncing $PACKAGE_NAME from local repository"
echo "  Local repo: $LOCAL_REPO_RESOLVED"
echo "  Branch: $LOCAL_BRANCH"
if [ -n "$COMMIT_SHA" ]; then
  echo "  Mode: Single commit (cherry-pick)"
  echo "  Commit: $COMMIT_SHA"
elif [ -n "$UP_TO_SHA" ]; then
  echo "  Mode: Range (up to commit)"
  echo "  Target: $UP_TO_SHA"
else
  echo "  Mode: Full sync (all new commits)"
fi
echo ""

CURRENT_COMMIT=$(jq -r '.subtree.commit // ""' "$PACKAGE_JSON")

if [ -n "$COMMIT_SHA" ]; then
  if ! git -C "$LOCAL_REPO_RESOLVED" rev-parse --quiet --verify "$COMMIT_SHA" >/dev/null; then
    clean_exit 1 "Commit '$COMMIT_SHA' not found in local repository" true
  fi
  TARGET_COMMIT="$COMMIT_SHA"
  SINGLE_COMMIT_MODE=true
elif [ -n "$UP_TO_SHA" ]; then
  if ! git -C "$LOCAL_REPO_RESOLVED" rev-parse --quiet --verify "$UP_TO_SHA" >/dev/null; then
    clean_exit 1 "Commit '$UP_TO_SHA' not found in local repository" true
  fi
  TARGET_COMMIT="$UP_TO_SHA"
  SINGLE_COMMIT_MODE=false
else
  TARGET_COMMIT=$(git -C "$LOCAL_REPO_RESOLVED" rev-parse "$LOCAL_BRANCH")
  SINGLE_COMMIT_MODE=false
fi

if [ "$SINGLE_COMMIT_MODE" != true ]; then
  if [ -n "$CURRENT_COMMIT" ] && [ "$CURRENT_COMMIT" != "null" ] && [ "$CURRENT_COMMIT" != "" ]; then
    if ! git -C "$LOCAL_REPO_RESOLVED" merge-base --is-ancestor "$CURRENT_COMMIT" "$TARGET_COMMIT" 2>/dev/null; then
      error_msg "Current commit $CURRENT_COMMIT not found in branch '$LOCAL_BRANCH' of local repository"
      echo ""
      echo "This means the branch in the local repository doesn't contain the commit"
      echo "that the monorepo was last synced to. Possible causes:"
      echo "  * The local branch was rebased or reset"
      echo "  * The local repo is pointing to a different fork"
      echo "  * The branch doesn't share history with the upstream"
      clean_exit 1 "" true
    fi
  fi
fi

if [ ! -d "$TARGET_DIR" ] && { [ -z "$CURRENT_COMMIT" ] || [ "$CURRENT_COMMIT" = "null" ] || [ "$CURRENT_COMMIT" = "" ]; }; then
  progress_msg "Performing initial setup - no previous commit found"

  if ! copy_upstream_files "$LOCAL_REPO_RESOLVED" "$UPSTREAM_SUBDIR" "$TARGET_DIR"; then
    clean_exit 1 "Failed to copy files during initial setup"
  fi

  cd "$MONOREPO_ROOT"

  bootstrap_tmp="$PACKAGE_JSON.tmp"
  if ! jq --arg origin_url "$LOCAL_REPO_ORIGIN" \
          --arg branch "$LOCAL_BRANCH" \
          --arg commit "$TARGET_COMMIT" \
          '.subtree = (
            { DO_NOT_MERGE_SYNCED_FROM_LOCAL: (
                { branch: $branch }
                + if $origin_url != "" then { origin_url: $origin_url } else { source: "local repository" } end
              ) }
            + (if .subtree.repo then { repo: .subtree.repo } else {} end)
            + { branch: $branch }
            + (if .subtree.src then { src: .subtree.src } else {} end)
            + { target: .subtree.target, commit: $commit }
          )' "$PACKAGE_JSON" > "$bootstrap_tmp"; then
    rm -f "$bootstrap_tmp"
    clean_exit 1 "Failed to update package.json during initial setup"
  fi
  if ! mv "$bootstrap_tmp" "$PACKAGE_JSON"; then
    rm -f "$bootstrap_tmp"
    clean_exit 1 "Failed to write package.json during initial setup"
  fi

  if ! git add "$WORKSPACE_LOCATION" "$PACKAGE_JSON"; then
    clean_exit 1 "Failed to stage files during initial setup"
  fi

  initial_commit_msg="${COMMIT_PREFIX}chore(subtree): initial sync of $PACKAGE_NAME to $TARGET_COMMIT"
  if ! git commit -q -m "$initial_commit_msg"; then
    clean_exit 1 "Failed to create initial setup commit"
  fi

  success_msg "Successfully performed initial setup: $initial_commit_msg"
  show_do_not_merge_warning
  exit 0
fi

if [ "$SINGLE_COMMIT_MODE" != true ] && [ "$CURRENT_COMMIT" = "$TARGET_COMMIT" ] && [ -d "$TARGET_DIR" ]; then
  info_msg "Already up-to-date at $TARGET_COMMIT"
  exit 0
fi

needs_sync_work=false
if [ "$SINGLE_COMMIT_MODE" = true ]; then
  needs_sync_work=true
elif [ "$CURRENT_COMMIT" != "$TARGET_COMMIT" ]; then
  needs_sync_work=true
fi

if [ "$needs_sync_work" = true ]; then
  warning_msg "Temporarily updating package.json with local sync overrides"
  echo -e "${RED}⚠️  DO NOT MERGE these changes!${NC}"
  echo ""

  temp_file="$PACKAGE_JSON.tmp"
  if ! jq --arg origin_url "$LOCAL_REPO_ORIGIN" \
          --arg branch "$LOCAL_BRANCH" \
          '.subtree = {
            DO_NOT_MERGE_SYNCED_FROM_LOCAL: (
              { branch: $branch }
              + if $origin_url != "" then { origin_url: $origin_url } else { source: "local repository" } end
            ),
            repo: .subtree.repo,
            branch: $branch,
            src: .subtree.src,
            target: .subtree.target,
            commit: .subtree.commit
          } |
          if .subtree.src == null then del(.subtree.src) else . end |
          if .subtree.repo == null then del(.subtree.repo) else . end' \
          "$PACKAGE_JSON" > "$temp_file"; then
    error_msg "Failed to update package.json with local sync overrides"
    rm -f "$temp_file"
    clean_exit 1 "" true
  fi

  if ! mv "$temp_file" "$PACKAGE_JSON"; then
    error_msg "Failed to write updated package.json"
    rm -f "$temp_file"
    clean_exit 1 "" true
  fi

  success_msg "Updated package.json with DO_NOT_MERGE_SYNCED_FROM_LOCAL flag"

  if ! git add "$PACKAGE_JSON"; then
    error_msg "Failed to stage package.json"
    clean_exit 1 "" true
  fi

  commit_msg="${COMMIT_PREFIX}Override subtree config for local sync

Syncing from local repository (path omitted)
Branch: $LOCAL_BRANCH${LOCAL_REPO_ORIGIN:+
Origin: $LOCAL_REPO_ORIGIN}

This commit should NOT be merged. It exists only to test changes from a local repository."

  if ! git commit -q -m "$commit_msg"; then
    warning_msg "Failed to commit package.json changes (assuming changes were already present)"
  else
    success_msg "Committed package.json changes with DO NOT MERGE warning"
  fi
  echo ""
fi

_git_upstream_cmd() {
  git -C "$LOCAL_REPO_RESOLVED" "$@"
}

_filter_rev_list() {
  local from_commit="$1"
  local to_commit="$2"
  local upstream_subdir="$3"
  if [ -n "$upstream_subdir" ]; then
    git -C "$LOCAL_REPO_RESOLVED" rev-list --no-merges --reverse "$from_commit..$to_commit" -- "$upstream_subdir"
  else
    git -C "$LOCAL_REPO_RESOLVED" rev-list --no-merges --reverse "$from_commit..$to_commit"
  fi
}

_get_commit_url() {
  local commit="$1"
  get_repo_commit_url "$LOCAL_REPO_RESOLVED" "$commit"
}

_get_continue_cmd() {
  local continue_cmd="npm run update-subtree-local -w $WORKSPACE_LOCATION -- --local-repo=$LOCAL_REPO_RESOLVED --branch=$LOCAL_BRANCH"
  if [ -n "$COMMIT_SHA" ]; then
    continue_cmd="$continue_cmd --commit=$COMMIT_SHA"
  fi
  echo "$continue_cmd --continue"
}

_pre_apply_hook() {
  progress_msg "Fetching git objects from local repository for three-way merge support..."
  cleanup_temp_remote
  git remote add "$TEMP_REMOTE_NAME" "$LOCAL_REPO_RESOLVED"
  if ! git fetch -q "$TEMP_REMOTE_NAME" "$LOCAL_BRANCH" 2>/dev/null; then
    warning_msg "Failed to fetch branch objects — three-way merge may not work correctly"
  else
    success_msg "Git objects fetched — three-way merge enabled"
  fi
}

_before_apply_hook() {
  local filtered_patch="$1"
  ensure_base_blobs_in_index "$filtered_patch" "$WORKSPACE_LOCATION/$TARGET_RELATIVE"
}

_post_iteration_hook() {
  :
}

if [ ! -d "$TARGET_DIR" ]; then
  mkdir -p "$TARGET_DIR"
fi

TMP_DIR=$(mktemp -d)
trap 'cd "$MONOREPO_ROOT"; cleanup_temp_remote; rm -rf "$TMP_DIR"' EXIT

apply_patch_based_update "$CURRENT_COMMIT" "$TARGET_COMMIT" "$UPSTREAM_SUBDIR" "$TARGET_DIR" "$SINGLE_COMMIT_MODE"

cd "$MONOREPO_ROOT"

success_msg "Successfully updated $PACKAGE_NAME to $TARGET_COMMIT"

show_do_not_merge_warning
