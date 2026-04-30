#!/bin/bash

set -euo pipefail

# Script to sync local upstream repository content into monorepo using patch-based incremental updates
# This is the local variant of package-subtree.sh — reads from a local repository path instead of cloning.
# Usage: ./package-subtree-local.sh --package=<package-name> --local-repo=<path> --branch=<branch> [--commit=<sha>] [--up-to=<sha>] [--continue]

export SKIP_LINT_HOOK=true
export HUSKY=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ "${NO_COLOR:-}" = "1" ] || [ "${TERM:-}" = "dumb" ]; then
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  CYAN=''
  NC=''
fi

ERROR_ICON="❌"
SUCCESS_ICON="✅"
WARNING_ICON="⚠️"
INFO_ICON="ℹ️"
PROGRESS_ICON="🔄"

error_msg() {
  echo -e "${RED}${ERROR_ICON} $1${NC}" >&2
}

success_msg() {
  echo -e "${GREEN}${SUCCESS_ICON} $1${NC}"
}

warning_msg() {
  echo -e "${YELLOW}${WARNING_ICON} $1${NC}"
}

info_msg() {
  echo -e "${CYAN}${INFO_ICON} $1${NC}"
}

progress_msg() {
  echo -e "${BLUE}${PROGRESS_ICON} $1${NC}"
}

update_package_json_commit() {
  local commit="$1"
  local temp_file="$PACKAGE_JSON.tmp"

  if ! jq --arg commit "$commit" '.subtree.commit = $commit' "$PACKAGE_JSON" > "$temp_file"; then
    error_msg "Failed to update package.json with commit $commit"
    rm -f "$temp_file"
    return 1
  fi

  if ! mv "$temp_file" "$PACKAGE_JSON"; then
    error_msg "Failed to replace package.json"
    rm -f "$temp_file"
    return 1
  fi

  return 0
}

safe_git_commit_if_changes() {
  local commit_message="$1"
  local target_path="$2"

  git add "$target_path"
  if ! git diff --cached --quiet; then
    if ! git commit -q -m "$commit_message"; then
      error_msg "Failed to commit changes"
      return 1
    fi
    return 0
  fi
  return 2
}

copy_upstream_files() {
  local source_base="$1"
  local upstream_subdir="$2"
  local target_dir="$3"

  if ! mkdir -p "$target_dir"; then
    error_msg "Failed to create target directory: $target_dir"
    return 1
  fi

  local source_dir="$source_base"
  if [ -n "$upstream_subdir" ]; then
    source_dir="$source_base/$upstream_subdir"
  fi

  if command -v rsync >/dev/null 2>&1; then
    if ! rsync -a --delete --exclude='.git' "$source_dir"/ "$target_dir"/; then
      error_msg "Failed to rsync files from $source_dir to $target_dir"
      return 1
    fi
  else
    if ! ( cd "$source_dir" && tar --exclude='.git' -cf - . ) | ( cd "$target_dir" && tar -xpf - ); then
      error_msg "Failed to copy files from $source_dir to $target_dir using tar"
      return 1
    fi
  fi

  return 0
}

clean_exit() {
  local exit_code=${1:-1}
  local message="$2"
  local is_user_error=${3:-false}

  if [ -n "$message" ]; then
    error_msg "$message"
  fi

  if [ "$is_user_error" = "true" ] && [ -n "${npm_config_user_agent:-}" ]; then
    warning_msg "Exiting with code 0 for npm compatibility (original exit code: $exit_code)"
  fi

  exit $exit_code
}

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


get_repo_commit_url() {
  local repo_path="$1"
  local commit_sha="$2"
  local remote_url

  remote_url=$(git -C "$repo_path" config --get remote.origin.url 2>/dev/null || echo "")

  if [ -z "$remote_url" ]; then
    echo "  (no remote origin configured — view commit locally: git -C $repo_path log -1 $commit_sha)"
    return
  fi

  remote_url="${remote_url%.git}"
  remote_url="${remote_url#git@github.com:}"
  if [[ "$remote_url" == https://github.com/* ]]; then
    remote_url="${remote_url#https://github.com/}"
  fi

  if [[ "$remote_url" == */* ]]; then
    echo "  https://github.com/$remote_url/commit/$commit_sha"
  else
    echo "  (view commit locally: git -C $repo_path log -1 $commit_sha)"
  fi
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

is_binary_file() {
  local filepath="$1"
  if [ ! -f "$filepath" ]; then
    return 1
  fi
  if LC_ALL=C grep -q $'\x00' "$filepath" 2>/dev/null; then
    return 0
  fi
  local mime_type
  mime_type=$(file --mime-type -b "$filepath" 2>/dev/null || echo "text/plain")
  case "$mime_type" in
    text/*|application/json|application/xml|application/javascript)
      return 1
      ;;
    *)
      return 0
      ;;
  esac
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
  if [ -n "$(git status --porcelain)" ]; then
    if ! git diff --cached --quiet; then
      error_msg "There are staged changes in the working tree"
      echo "You have staged changes that need to be committed."
      echo ""
      echo "Choose one option:"
      echo -e "1. Use ${GREEN}--continue${NC} to commit staged changes and proceed with update"
      echo -e "2. Run ${YELLOW}git reset HEAD${NC} to unstage changes and start fresh"
      echo -e "3. Run ${YELLOW}git commit${NC} to commit changes manually, then retry"
      clean_exit 1 "" true
    else
      error_msg "Working tree has uncommitted changes"
      echo "Please commit or stash your changes before running this script."
      echo ""
      echo -e "If you're resolving conflicts from a previous run, use the ${CYAN}--continue${NC} option."
      clean_exit 1 "" true
    fi
  fi
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

inject_conflict_markers() {
  local patch_file="$1"
  local commit_sha="$2"
  local commit_msg="$3"
  shift 3
  local failed_files=("$@")

  local commit_url
  commit_url=$(get_repo_commit_url "$LOCAL_REPO_RESOLVED" "$commit_sha")

  for rel_file in "${failed_files[@]}"; do
    [ -z "$rel_file" ] && continue

    local target_file="$MONOREPO_ROOT/$WORKSPACE_LOCATION/$TARGET_RELATIVE/$rel_file"

    if ! grep -q '^<<<<<<< ' "$target_file" 2>/dev/null; then

      local temp_patch="$TMP_DIR/file_patch_$$.txt"
      awk -v file="$rel_file" '
        /^diff --git/ {
          in_file = ($0 ~ " b/" file "$" || $0 ~ " b/" file " ")
          if (in_file) print
          next
        }
        in_file { print }
        /^diff --git/ && !in_file { exit }
      ' "$patch_file" > "$temp_patch"

      if [ -s "$temp_patch" ]; then
        local is_binary_patch=false
        if grep -q "^GIT binary patch" "$temp_patch" 2>/dev/null || grep -q "^Binary files" "$temp_patch" 2>/dev/null; then
          is_binary_patch=true
        fi

        if [ "$is_binary_patch" = true ] || { [ -f "$target_file" ] && is_binary_file "$target_file"; }; then
          local patch_sidecar="$MONOREPO_ROOT/$WORKSPACE_LOCATION/$TARGET_RELATIVE/${rel_file}.patch"
          local meta_sidecar="$MONOREPO_ROOT/$WORKSPACE_LOCATION/$TARGET_RELATIVE/${rel_file}.patch-info.txt"

          mkdir -p "$(dirname "$patch_sidecar")"
          cp "$temp_patch" "$patch_sidecar"

          cat > "$meta_sidecar" << METAEOF
PATCH INFO — Binary file conflict
==================================
UPSTREAM COMMIT: $commit_sha
COMMIT MESSAGE: $commit_msg
FILE: $rel_file
WORKSPACE: $WORKSPACE_LOCATION
PACKAGE: $PACKAGE_NAME
LOCAL REPO: $LOCAL_REPO_LABEL
BRANCH: $LOCAL_BRANCH

This file is binary and cannot have conflict markers embedded.
The patch content has been saved to: ${rel_file}.patch
Review the patch and apply changes manually.

For more details, view the upstream commit at:
$commit_url
METAEOF

          warning_msg "Binary file '$rel_file' — patch saved to ${rel_file}.patch and ${rel_file}.patch-info.txt"
        else
          if [ ! -f "$target_file" ]; then
            mkdir -p "$(dirname "$target_file")"
            touch "$target_file"
            info_msg "Created new file for conflict markers: $rel_file"
          fi

          cat >> "$target_file" << EOF

<<<<<<< PATCH FAILED TO APPLY
UPSTREAM COMMIT: $commit_sha
COMMIT MESSAGE: $commit_msg
FILE: $rel_file
=======
The patch below could not be applied automatically.
This usually means the file content differs from what upstream expects.

WHAT THE PATCH WANTS TO DO:
────────────────────────────────────────────────────────────
EOF
          cat "$temp_patch" >> "$target_file"

          cat >> "$target_file" << EOF
────────────────────────────────────────────────────────────

INSTRUCTIONS:
1. Review the patch above (lines with - are removed, lines with + are added)
2. Manually apply the intended changes to this file
3. Remove this entire conflict marker block (from <<<<<<< to >>>>>>>)
4. Stage the file: git add $WORKSPACE_LOCATION
5. Continue: npm run update-subtree-local -- --package=$PACKAGE_NAME --local-repo=<local-repo-path> --branch=$LOCAL_BRANCH --continue


For more details, view the upstream commit at:
$commit_url
>>>>>>> END PATCH FAILED
EOF
        fi
      fi
      rm -f "$temp_patch"
    fi
  done
}

apply_patch_based_update() {
  local from_commit="$1"
  local to_commit="$2"
  local upstream_subdir="$3"
  local target_dir="$4"
  local single_commit_mode="${5:-false}"

  if [ "$single_commit_mode" = true ]; then
    info_msg "Applying single commit: $to_commit"
  else
    echo "Applying patch-based update from $from_commit to $to_commit"
  fi

  if [ "$single_commit_mode" != true ]; then
    if [ -z "$from_commit" ] || [ "$from_commit" = "null" ] || [ "$from_commit" = "" ]; then
      clean_exit 1 "No starting commit provided for patch-based update"
    fi

    if ! git -C "$LOCAL_REPO_RESOLVED" rev-parse --quiet --verify "$from_commit" >/dev/null; then
      warning_msg "Current commit $from_commit not found in local repository"
      clean_exit 1 "Cannot perform patch-based update - starting commit does not exist."
    fi
  fi

  local commits
  if [ "$single_commit_mode" = true ]; then
    commits="$to_commit"
  else
    if [ -n "$upstream_subdir" ]; then
      commits=$(git -C "$LOCAL_REPO_RESOLVED" rev-list --no-merges --reverse "$from_commit..$to_commit" -- "$upstream_subdir")
    else
      commits=$(git -C "$LOCAL_REPO_RESOLVED" rev-list --no-merges --reverse "$from_commit..$to_commit")
    fi
  fi

  if [ -z "$commits" ]; then
    if [ "$single_commit_mode" = true ]; then
      echo "Commit $to_commit has no relevant changes for the subtree"
    else
      echo "No commits to apply between $from_commit and $to_commit"
    fi
    return 0
  fi

  local total_commits
  total_commits=$(echo "$commits" | wc -l | tr -d ' ')
  echo -e "Found ${YELLOW}$total_commits${NC} commit(s) to apply"

  progress_msg "Fetching git objects from local repository for three-way merge support..."
  cleanup_temp_remote
  git remote add "$TEMP_REMOTE_NAME" "$LOCAL_REPO_RESOLVED"
  if ! git fetch -q "$TEMP_REMOTE_NAME" "$LOCAL_BRANCH" 2>/dev/null; then
    warning_msg "Failed to fetch branch objects — three-way merge may not work correctly"
  else
    success_msg "Git objects fetched — three-way merge enabled"
  fi

  local commit_count=0
  for commit in $commits; do
    commit_count=$((commit_count + 1))
    progress_msg "Applying commit $commit_count/$total_commits: $commit"

    local commit_msg
    commit_msg=$(git -C "$LOCAL_REPO_RESOLVED" log -1 --format="%s" "$commit")

    local patch_file="$TMP_DIR/patch_${commit}.patch"
    git -C "$LOCAL_REPO_RESOLVED" format-patch -1 "$commit" --stdout > "$patch_file"

    local filtered_patch="$TMP_DIR/filtered_${commit}.patch"
    filter_and_transform_patch "$patch_file" "$upstream_subdir" "$filtered_patch"

    if [ -s "$filtered_patch" ]; then
      cd "$MONOREPO_ROOT"

      ensure_base_blobs_in_index "$filtered_patch" "$WORKSPACE_LOCATION/$TARGET_RELATIVE"

      if ! git apply --directory="$WORKSPACE_LOCATION/$TARGET_RELATIVE" --3way --index "$filtered_patch" 2>"$TMP_DIR/apply_error.log"; then
        error_msg "Conflict detected while applying commit $commit_count/$total_commits"
        echo -e "   ${YELLOW}Commit message: $commit_msg${NC}"
        echo -e "   ${YELLOW}Upstream commit: $commit${NC}"
        echo ""

        local apply_error
        apply_error=$(cat "$TMP_DIR/apply_error.log" 2>/dev/null || echo "")
        local has_git_conflicts=false
        local has_rejected_patches=false
        local failed_files=()
        local succeeded_files=()
        local git_conflict_files=()

        while IFS= read -r conflict_file; do
          [ -n "$conflict_file" ] && git_conflict_files+=("$conflict_file")
        done < <(git diff --name-only --diff-filter=U 2>/dev/null)

        if [ ${#git_conflict_files[@]} -gt 0 ]; then
          has_git_conflicts=true
        fi

        if echo "$apply_error" | grep -q "patch does not apply"; then
          has_rejected_patches=true
          while IFS= read -r line; do
            if [[ "$line" =~ error:\ (.+):\ patch\ does\ not\ apply ]]; then
              local failed_file="${BASH_REMATCH[1]}"
              failed_file="${failed_file#$WORKSPACE_LOCATION/$TARGET_RELATIVE/}"
              failed_files+=("$failed_file")
            fi
          done <<< "$apply_error"

          if [ "$has_git_conflicts" = false ] && [ ${#failed_files[@]} -gt 0 ]; then
            info_msg "Attempting to apply other files from the patch individually..."
            echo ""

            local all_files
            all_files=$(grep '^diff --git' "$filtered_patch" | sed 's/^diff --git a\/.* b\///' || true)

            while IFS= read -r file; do
              [ -z "$file" ] && continue

              local is_failed=false
              for failed in "${failed_files[@]}"; do
                if [ "$file" = "$failed" ]; then
                  is_failed=true
                  break
                fi
              done

              if [ "$is_failed" = false ]; then
                local single_file_patch="$TMP_DIR/single_${file//\//_}.patch"
                awk -v target="$file" '
                  /^diff --git/ {
                    in_target = ($0 ~ " b/" target "$")
                    if (in_target) print
                    next
                  }
                  in_target { print }
                  /^diff --git/ && !in_target { exit }
                ' "$filtered_patch" > "$single_file_patch"

                if [ -s "$single_file_patch" ] && git apply --directory="$WORKSPACE_LOCATION/$TARGET_RELATIVE" --3way --index "$single_file_patch" 2>/dev/null; then
                  succeeded_files+=("$file")
                  echo -e "  ${GREEN}✓${NC} $file"
                else
                  failed_files+=("$file")
                  echo -e "  ${RED}✗${NC} $file"
                fi
              fi
            done <<< "$all_files"
            echo ""
          fi
        fi

        if [ "$has_git_conflicts" = true ] && [ "$has_rejected_patches" = false ]; then
          warning_msg "Git created conflict markers (partial application succeeded)"
          echo "Some changes were applied, but conflicts need manual resolution."
          echo ""
          echo -e "${YELLOW}Files with git conflict markers:${NC}"
          for conflict_file in "${git_conflict_files[@]}"; do
            echo "  $conflict_file"
          done
        elif [ "$has_git_conflicts" = false ] && [ "$has_rejected_patches" = true ]; then
          warning_msg "Patch was completely rejected (no automatic application possible)"
          echo "This typically means file content differs significantly from upstream."
          echo ""
          echo -e "${CYAN}Common causes:${NC}"
          echo "  * Local customizations/modifications in the fork"
          echo "  * Different code structure than upstream expects"
          echo "  * Previous patches changed the context"
        else
          warning_msg "Mixed results: some changes applied with conflicts, others rejected"
          if [ ${#git_conflict_files[@]} -gt 0 ]; then
            echo ""
            echo -e "${YELLOW}Files with git conflict markers:${NC}"
            for conflict_file in "${git_conflict_files[@]}"; do
              echo "  $conflict_file"
            done
          fi
        fi

        echo ""

        if [ ${#succeeded_files[@]} -gt 0 ]; then
          success_msg "Successfully applied ${#succeeded_files[@]} file(s):"
          for file in "${succeeded_files[@]}"; do
            echo "  ✓ $file"
          done
          echo ""
        fi

        if [ "$has_rejected_patches" = true ] && [ ${#failed_files[@]} -gt 0 ]; then
          info_msg "Injecting conflict markers for ${#failed_files[@]} failed file(s)..."
          inject_conflict_markers "$filtered_patch" "$commit" "$commit_msg" "${failed_files[@]}"
          echo ""
          warning_msg "Files that need manual resolution:"
          for failed_file in "${failed_files[@]}"; do
            echo "  ✗ $failed_file"
          done
          echo ""
        fi

        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${CYAN}RESOLUTION STEPS:${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo "1. Find conflict markers in: $WORKSPACE_LOCATION/$TARGET_RELATIVE/"
        echo ""
        echo "   Two types of markers to look for:"
        echo -e "   ${RED}a)${NC} Git conflict markers:    ${RED}<<<<<<<${NC} ${YELLOW}=======${NC} ${RED}>>>>>>>${NC}"
        echo -e "   ${RED}b)${NC} Script-injected markers: ${RED}<<<<<<< PATCH FAILED${NC} ... ${RED}>>>>>>> END PATCH${NC}"
        echo ""
        echo "2. For EACH conflict marker:"
        echo "   * Review what the patch wants to change"
        echo "   * Manually apply the intended changes"
        echo "   * Remove all conflict marker lines"
        echo ""
        echo "3. Verify your changes make sense:"
        echo -e "   ${YELLOW}git diff $WORKSPACE_LOCATION${NC}"
        echo ""
        echo "4. Stage all resolved files:"
        echo -e "   ${YELLOW}git add $WORKSPACE_LOCATION${NC}"
        echo ""

        local continue_cmd="npm run update-subtree-local -- --package=$PACKAGE_NAME --local-repo=$LOCAL_REPO_RESOLVED --branch=$LOCAL_BRANCH"
        if [ -n "$COMMIT_SHA" ]; then
          continue_cmd="$continue_cmd --commit=$COMMIT_SHA"
        fi
        continue_cmd="$continue_cmd --continue"

        echo "5. Continue the update process:"
        echo -e "   ${GREEN}$continue_cmd${NC}"
        if [ ${#succeeded_files[@]} -gt 0 ]; then
          echo ""
          echo "   Note: Successfully applied files are already staged."
          echo "   This will commit everything and proceed to the next patch."
        fi
        echo ""
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        info_msg "Progress: Applied $((commit_count - 1))/$total_commits commits successfully"
        info_msg "Failed on commit: $commit ($commit_count/$total_commits)"
        info_msg "Remaining: $((total_commits - commit_count + 1)) commits"
        clean_exit 1 "" true
      fi

      set +e
      safe_git_commit_if_changes "${COMMIT_PREFIX}Update $PACKAGE_NAME: $commit_msg

Upstream commit: $commit" "$WORKSPACE_LOCATION/$TARGET_RELATIVE"
      local commit_exit_code=$?
      set -e

      if [ $commit_exit_code -eq 0 ]; then
        if update_package_json_commit "$commit"; then
          git add "$PACKAGE_JSON"
          git commit -q --amend --no-edit
          success_msg "Applied commit $commit_count/$total_commits: $commit_msg"
        else
          warning_msg "Committed changes but failed to update package.json tracking"
        fi
      elif [ $commit_exit_code -eq 2 ]; then
        if update_package_json_commit "$commit"; then
          local tracking_msg="${COMMIT_PREFIX}Update $PACKAGE_NAME tracking to $commit (no file changes)"
          set +e
          safe_git_commit_if_changes "$tracking_msg" "$PACKAGE_JSON" >/dev/null
          local tracking_exit_code=$?
          set -e
          if [ $tracking_exit_code -ne 0 ] && [ $tracking_exit_code -ne 2 ]; then
            clean_exit 1 "Failed to commit tracking update for commit $commit_count/$total_commits"
          fi
          info_msg "No changes from commit $commit_count/$total_commits"
        else
          warning_msg "Failed to update package.json tracking for commit $commit_count/$total_commits"
        fi
      else
        clean_exit 1 "Failed to commit changes for commit $commit_count/$total_commits"
      fi

    else
      info_msg "No relevant changes in commit $commit_count/$total_commits for subtree"

      cd "$MONOREPO_ROOT"
      if update_package_json_commit "$commit"; then
        local tracking_msg="${COMMIT_PREFIX}Update $PACKAGE_NAME tracking to $commit (no file changes)"
        set +e
        safe_git_commit_if_changes "$tracking_msg" "$PACKAGE_JSON" >/dev/null
        local tracking_exit_code=$?
        set -e
        if [ $tracking_exit_code -ne 0 ] && [ $tracking_exit_code -ne 2 ]; then
          clean_exit 1 "Failed to commit tracking update for commit $commit_count/$total_commits"
        fi
      else
        warning_msg "Failed to update package.json tracking for commit $commit_count/$total_commits"
      fi
    fi
  done
}

filter_and_transform_patch() {
  local input_patch="$1"
  local upstream_subdir="$2"
  local output_patch="$3"

  if [ -z "$upstream_subdir" ]; then
    cp "$input_patch" "$output_patch"
    return 0
  fi

  awk -v subdir="$upstream_subdir" '
    BEGIN {
      in_relevant_file = 0
      skip_file = 0
      subdir_prefix = subdir "/"
    }

    /^diff --git/ {
      split($0, parts, " ")
      old_path_full = parts[3]
      new_path_full = parts[4]

      gsub(/^a\//, "", old_path_full)
      gsub(/^b\//, "", new_path_full)
      old_path = old_path_full
      new_path = new_path_full

      if (old_path ~ "^" subdir_prefix || new_path ~ "^" subdir_prefix) {
        in_relevant_file = 1
        skip_file = 0

        gsub("a/" subdir_prefix, "a/", $0)
        gsub("b/" subdir_prefix, "b/", $0)
        print $0
      } else {
        in_relevant_file = 0
        skip_file = 1
      }
      next
    }

    /^index / {
      if (in_relevant_file && !skip_file) print $0
      next
    }

    /^(new|deleted) file mode/ {
      if (in_relevant_file && !skip_file) print $0
      next
    }

    /^(rename|copy) (from|to)/ {
      if (in_relevant_file && !skip_file) {
        gsub(subdir_prefix, "", $0)
        print $0
      }
      next
    }

    /^(---|[+][+][+])/ {
      if (in_relevant_file && !skip_file) {
        if ($0 ~ "^---.*/" subdir_prefix) {
          gsub("/" subdir_prefix, "/", $0)
        } else if ($0 ~ "^[+][+][+].*/" subdir_prefix) {
          gsub("/" subdir_prefix, "/", $0)
        }
        print $0
      }
      next
    }

    {
      if (in_relevant_file && !skip_file) print $0
    }
  ' "$input_patch" > "$output_patch"
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
