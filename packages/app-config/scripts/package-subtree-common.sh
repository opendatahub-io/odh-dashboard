#!/bin/bash
# package-subtree-common.sh — shared functions for package-subtree.sh and package-subtree-local.sh
# Source this file; do not execute it directly.
#
# Required globals (set by caller before using most functions):
#   PACKAGE_JSON       — path to the package's package.json
#   MONOREPO_ROOT      — monorepo root directory
#   WORKSPACE_LOCATION — workspace-relative path
#   TARGET_RELATIVE    — subtree target directory relative to workspace
#   PACKAGE_NAME       — npm package name
#   TMP_DIR            — temporary directory for intermediate files

export SKIP_LINT_HOOK=true
export HUSKY=0

# ── Colors & Icons ────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

if [ "${NO_COLOR:-}" = "1" ] || [ "${TERM:-}" = "dumb" ]; then
  RED='' GREEN='' YELLOW='' BLUE='' CYAN='' NC=''
fi

ERROR_ICON="❌"
SUCCESS_ICON="✅"
WARNING_ICON="⚠️"
INFO_ICON="ℹ️"
PROGRESS_ICON="🔄"

error_msg()    { echo -e "${RED}${ERROR_ICON} $1${NC}" >&2; }
success_msg()  { echo -e "${GREEN}${SUCCESS_ICON} $1${NC}"; }
warning_msg()  { echo -e "${YELLOW}${WARNING_ICON} $1${NC}"; }
info_msg()     { echo -e "${CYAN}${INFO_ICON} $1${NC}"; }
progress_msg() { echo -e "${BLUE}${PROGRESS_ICON} $1${NC}"; }

# ── Utilities ─────────────────────────────────────────────────────

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
    exit 0
  fi

  exit $exit_code
}

# ── Working-tree check ───────────────────────────────────────────

check_working_tree_clean() {
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
}

# ── Patch helpers ────────────────────────────────────────────────

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

extract_single_file_patch() {
  local patch_file="$1"
  local rel_file="$2"
  local output_file="$3"

  awk -v file="$rel_file" '
    /^diff --git/ {
      if (in_file) exit
      in_file = ($0 ~ " b/" file "$" || $0 ~ " b/" file " ")
      if (in_file) print
      next
    }
    in_file { print }
  ' "$patch_file" > "$output_file"
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

# ── Conflict marker injection ───────────────────────────────────
# Injects conflict markers into files that failed to apply.
# Handles both text and binary files.
#
# Args:
#   $1 — patch file
#   $2 — commit SHA
#   $3 — commit message
#   $4 — commit URL (human-readable)
#   $5 — continue command for the user
#   $6+ — list of failed file paths (relative to upstream root)

inject_conflict_markers() {
  local patch_file="$1"
  local commit_sha="$2"
  local commit_msg="$3"
  local commit_url="$4"
  local continue_cmd="$5"
  shift 5
  local failed_files=("$@")

  for rel_file in "${failed_files[@]}"; do
    [ -z "$rel_file" ] && continue

    local target_file="$MONOREPO_ROOT/$WORKSPACE_LOCATION/$TARGET_RELATIVE/$rel_file"

    if grep -q '^<<<<<<< ' "$target_file" 2>/dev/null; then
      continue
    fi

    local temp_patch="$TMP_DIR/file_patch_$$.txt"
    extract_single_file_patch "$patch_file" "$rel_file" "$temp_patch"

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
5. Continue: $continue_cmd

For more details, view the upstream commit at:
$commit_url
>>>>>>> END PATCH FAILED
EOF
      fi
    fi
    rm -f "$temp_patch"
  done
}

# ── Patch-based update (shared) ─────────────────────────────────
# Applies a sequence of commits from upstream to the target directory.
# Uses callbacks/hooks for script-specific behaviors (git commands, URLs, etc).
#
# Required callbacks (caller must define these before calling):
#   _git_upstream_cmd       — git command wrapper for upstream repo
#   _get_continue_cmd       — returns --continue command for conflict resolution
#   _get_commit_url         — returns commit URL for a given SHA
#   _pre_apply_hook         — called once before iteration (setup, fetch, etc)
#   _before_apply_hook      — called before git apply on each patch (receives filtered_patch path)
#   _post_iteration_hook    — called after each commit iteration
#   _filter_rev_list        — filters/customizes rev-list (e.g., add subdir filter)
#
# Args:
#   $1 — from_commit
#   $2 — to_commit
#   $3 — upstream_subdir
#   $4 — target_dir
#   $5 — single_commit_mode (default: false)

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

    if ! $_git_upstream_cmd rev-parse --quiet --verify "$from_commit" >/dev/null; then
      warning_msg "Current commit $from_commit not found in upstream repository"
      clean_exit 1 "Cannot perform patch-based update - starting commit does not exist."
    fi
  fi

  local commits
  if [ "$single_commit_mode" = true ]; then
    commits="$to_commit"
  else
    commits=$(_filter_rev_list "$from_commit" "$to_commit" "$upstream_subdir")
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

  _pre_apply_hook

  local commit_count=0
  for commit in $commits; do
    commit_count=$((commit_count + 1))
    progress_msg "Applying commit $commit_count/$total_commits: $commit"

    local commit_msg
    commit_msg=$($_git_upstream_cmd log -1 --format="%s" "$commit")

    local patch_file="$TMP_DIR/patch_${commit}.patch"
    $_git_upstream_cmd format-patch -1 "$commit" --stdout > "$patch_file"

    local filtered_patch="$TMP_DIR/filtered_${commit}.patch"
    filter_and_transform_patch "$patch_file" "$upstream_subdir" "$filtered_patch"

    if [ -s "$filtered_patch" ]; then
      cd "$MONOREPO_ROOT"

      _before_apply_hook "$filtered_patch"

      if ! git apply --directory="$WORKSPACE_LOCATION/$TARGET_RELATIVE" --3way --index "$filtered_patch" 2>"$TMP_DIR/apply_error.log"; then
        local commit_url
        commit_url=$(_get_commit_url "$commit")
        local continue_cmd
        continue_cmd=$(_get_continue_cmd)
        handle_apply_conflict "$commit_count" "$total_commits" "$commit" "$commit_msg" "$filtered_patch" "$continue_cmd" "$commit_url"
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

    _post_iteration_hook
  done
}

# ── Conflict resolution handler ─────────────────────────────────
# Called when git apply --3way fails during apply_patch_based_update.
# This function never returns — it exits via clean_exit.
#
# Args:
#   $1 — commit_count
#   $2 — total_commits
#   $3 — commit SHA
#   $4 — commit_msg
#   $5 — filtered_patch path
#   $6 — continue_cmd (full command for the user to run)
#   $7 — commit_url

handle_apply_conflict() {
  local commit_count="$1"
  local total_commits="$2"
  local commit="$3"
  local commit_msg="$4"
  local filtered_patch="$5"
  local continue_cmd="$6"
  local commit_url="$7"

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
          extract_single_file_patch "$filtered_patch" "$file" "$single_file_patch"

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
    inject_conflict_markers "$filtered_patch" "$commit" "$commit_msg" "$commit_url" "$continue_cmd" "${failed_files[@]}"
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
}
