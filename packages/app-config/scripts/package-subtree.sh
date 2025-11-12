#!/bin/bash

set -e

# Script to sync upstream repository content into monorepo using patch-based incremental updates
# Usage: ./package-subtree.sh --package=<package-name> [--commit=<commit-sha>] [--continue]

# Reduce git hook noise
export SKIP_LINT_HOOK=true
export HUSKY=0

# Colors and icons for better UX
# Enable colors unless explicitly disabled
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Disable colors if explicitly requested
if [ "${NO_COLOR:-}" = "1" ] || [ "${TERM:-}" = "dumb" ]; then
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  CYAN=''
  NC=''
fi

# Icons
ERROR_ICON="❌"
SUCCESS_ICON="✅"
WARNING_ICON="⚠️"
INFO_ICON="ℹ️"
PROGRESS_ICON="🔄"

# Helper functions for colored output
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

# Helper function to safely update package.json commit hash
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

# Helper function to safely commit changes if there are any
safe_git_commit_if_changes() {
  local commit_message="$1"
  local target_path="$2"
  
  git add "$target_path"
  if ! git diff --cached --quiet; then
    if ! git commit -q -m "$commit_message"; then
      error_msg "Failed to commit changes"
      return 1
    fi
    return 0  # Changes were committed
  fi
  return 2  # No changes to commit
}

# Helper function to copy upstream files
copy_upstream_files() {
  local upstream_subdir="$1"
  local target_dir="$2"
  
  # Ensure target directory exists
  if ! mkdir -p "$target_dir"; then
    error_msg "Failed to create target directory: $target_dir"
    return 1
  fi
  
  # Copy files based on whether we have a subdirectory filter, excluding VCS metadata
  if command -v rsync >/dev/null 2>&1; then
    if [ -n "$upstream_subdir" ]; then
      if ! rsync -a --delete --exclude='.git' "$upstream_subdir"/ "$target_dir"/; then
        error_msg "Failed to rsync files from $upstream_subdir to $target_dir"
        return 1
      fi
    else
      if ! rsync -a --delete --exclude='.git' ./ "$target_dir"/; then
        error_msg "Failed to rsync files to $target_dir"
        return 1
      fi
    fi
  else
    # Fallback to tar if rsync is unavailable
    if [ -n "$upstream_subdir" ]; then
      if ! ( cd "$upstream_subdir" && tar --exclude='.git' -cf - . ) | ( cd "$target_dir" && tar -xpf - ); then
        error_msg "Failed to copy files from $upstream_subdir to $target_dir using tar"
        return 1
      fi
    else
      if ! ( tar --exclude='.git' -cf - . ) | ( cd "$target_dir" && tar -xpf - ); then
        error_msg "Failed to copy files to $target_dir using tar"
        return 1
      fi
    fi
  fi
  
  return 0
}

# Clean exit function to reduce npm noise
clean_exit() {
  local exit_code=${1:-1}
  local message="$2"
  local is_user_error=${3:-false}
  
  if [ -n "$message" ]; then
    error_msg "$message"
  fi

  # For user errors (conflicts, validation, etc.), exit with 0 to avoid npm noise
  # Only system errors (git failures, file system issues) should cause npm to show errors
  if [ "$is_user_error" = "true" ] && [ -n "${npm_config_user_agent:-}" ]; then
    exit 0  # Exit with 0 to suppress npm error noise for user errors
  fi
  
  exit $exit_code
}

show_usage() {
  echo "Usage: $0 --package=<package-name> [--commit=<commit-sha>] [--continue]"
  echo ""
  echo "Options:"
  echo "  --package=NAME     Required. Name of the package to update (e.g., @odh-dashboard/model-registry)"
  echo "  --commit=SHA       Optional. Specific commit to update to (default: latest)"
  echo "  --continue         Continue from a previous conflict resolution"
  echo ""
  echo "Examples:"
  echo "  $0 --package=@odh-dashboard/model-registry"
  echo "  $0 --package=@odh-dashboard/model-registry --commit=abc123"
  echo "  $0 --package=@odh-dashboard/model-registry --continue"
}

# Parse command line arguments
CONTINUE_MODE=false
PACKAGE_NAME=""
COMMIT_SHA=""

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

# Change to monorepo root to ensure we're in a safe directory
cd "$MONOREPO_ROOT"

# Read config from package.json (needed for both modes)
UPSTREAM_REPO=$(jq -r '.subtree.repo' "$PACKAGE_JSON")
UPSTREAM_SUBDIR=$(jq -r '.subtree.src // ""' "$PACKAGE_JSON")
TARGET_RELATIVE=$(jq -r '.subtree.target' "$PACKAGE_JSON")
CURRENT_COMMIT=$(jq -r '.subtree.commit // ""' "$PACKAGE_JSON")

# Validate required configuration fields
if [ -z "$UPSTREAM_REPO" ] || [ "$UPSTREAM_REPO" = "null" ]; then
  clean_exit 1 "Missing subtree.repo in $PACKAGE_JSON" true
fi
if [ -z "$TARGET_RELATIVE" ] || [ "$TARGET_RELATIVE" = "null" ]; then
  clean_exit 1 "Missing subtree.target in $PACKAGE_JSON" true
fi

# Handle continue mode
if [ "$CONTINUE_MODE" = true ]; then
  progress_msg "Continue mode: Processing staged changes from conflict resolution"
  
  # Check if there are files with actual conflict markers (not just UU status)
  # Collect unmerged paths as an array, preserving NUL delimiters
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

  # Check if there are any unmerged files at all (resolved or not)
  if [ "${#conflict_files[@]}" -gt 0 ]; then
    # Files have UU status but no conflict markers - they're resolved, just need staging
    warning_msg "Found resolved conflicts that need staging"
    echo "Files with resolved conflicts:"
    for file in "${conflict_files[@]}"; do
      echo "  $file"
    done
  fi
  
  # Check if there are staged changes to commit
  if git diff --cached --quiet; then
    error_msg "No staged changes found"
    echo -e "Please stage your resolved conflicts: ${YELLOW}git add $WORKSPACE_LOCATION${NC}"
    clean_exit 1 "" true
  fi
  
  # Commit the staged changes before proceeding
  info_msg "Committing staged changes..."
  
  # Set up temp directory for continue mode
  TMP_DIR=$(mktemp -d)
  trap 'cd "$MONOREPO_ROOT"; rm -rf "$TMP_DIR"' EXIT
  
  # Clone repository to determine commit information
  git clone -q "$UPSTREAM_REPO" "$TMP_DIR/repo"
  cd "$TMP_DIR/repo"
  
  # Get target commit SHA
  if [ -n "$COMMIT_SHA" ]; then
    git checkout -q "$COMMIT_SHA"
    TARGET_COMMIT=$(git rev-parse HEAD)
  else
    TARGET_COMMIT=$(git rev-parse HEAD)
  fi
  
  # We need to determine what commit we're continuing from
  # This should be the next commit after the current one in package.json
  commits=$(git rev-list --reverse "$CURRENT_COMMIT..$TARGET_COMMIT")
  if [ -n "$commits" ]; then
    continue_commit=$(echo "$commits" | head -n 1)
    continue_commit_msg=$(git log -1 --format="%s" "$continue_commit")
    
    cd "$MONOREPO_ROOT"
    git commit -q -m "Update $PACKAGE_NAME: $continue_commit_msg (resolved conflicts)

Upstream commit: $continue_commit"
    
    success_msg "Committed resolved conflicts for $continue_commit: $continue_commit_msg"
    
    # Update package.json to reflect this commit was successfully applied
    if update_package_json_commit "$continue_commit"; then
      if ! git add "$PACKAGE_JSON"; then
        clean_exit 1 "Failed to stage package.json after committing conflicts"
      fi
      git commit -q --amend --no-edit
      info_msg "Updated package.json to track commit $continue_commit"
    else
      clean_exit 1 "Failed to update package.json after committing conflicts"
    fi
    
    # Update CURRENT_COMMIT so the main loop continues from the next commit
    CURRENT_COMMIT="$continue_commit"
  else
    # No more commits, just commit with a generic message
    git commit -q -m "Update $PACKAGE_NAME: Manual conflict resolution"
    success_msg "Committed staged changes"
  fi
  
else
  # Normal mode - check clean working tree
  if [ -n "$(git status --porcelain)" ]; then
    # Check if there are staged changes
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

# Derive target path (relative to workspace directory)
TARGET_DIR="$MONOREPO_ROOT/$WORKSPACE_LOCATION/$TARGET_RELATIVE"

progress_msg "Syncing $PACKAGE_NAME from $UPSTREAM_REPO"

# Set up temp directory
TMP_DIR=$(mktemp -d)
trap 'cd "$MONOREPO_ROOT"; rm -rf "$TMP_DIR"' EXIT

# Clone repository
git clone -q "$UPSTREAM_REPO" "$TMP_DIR/repo"
cd "$TMP_DIR/repo"

# Get target commit SHA
if [ -n "$COMMIT_SHA" ]; then
  git checkout -q "$COMMIT_SHA"
  TARGET_COMMIT=$(git rev-parse HEAD)
else
  TARGET_COMMIT=$(git rev-parse HEAD)
fi

# Handle initial setup case
if [ ! -d "$TARGET_DIR" ] && ([ -z "$CURRENT_COMMIT" ] || [ "$CURRENT_COMMIT" = "null" ] || [ "$CURRENT_COMMIT" = "" ]); then
  progress_msg "Performing initial setup - no previous commit found"
  
  # Checkout target commit
  cd "$TMP_DIR/repo"
  git checkout -q "$TARGET_COMMIT"
  
  # Copy files to target directory
  if ! copy_upstream_files "$UPSTREAM_SUBDIR" "$TARGET_DIR"; then
    clean_exit 1 "Failed to copy files during initial setup"
  fi
  
  # Switch to repo root for git operations
  cd "$MONOREPO_ROOT"
  
  # Update package.json to track the initial commit
  if ! update_package_json_commit "$TARGET_COMMIT"; then
    clean_exit 1 "Failed to update package.json during initial setup"
  fi
  
  # Stage the copied files and updated package.json
  if ! git add "$WORKSPACE_LOCATION" "$PACKAGE_JSON"; then
    clean_exit 1 "Failed to stage files during initial setup"
  fi
  
  # Create initial commit
  initial_commit_msg="chore(subtree): initial sync of $PACKAGE_NAME to $TARGET_COMMIT"
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

# Function to inject helpful conflict markers for failed patches
inject_conflict_markers() {
  local patch_file="$1"
  local commit_sha="$2"
  local commit_msg="$3"
  shift 3
  local failed_files=("$@")
  
  # Only process files that actually failed
  for rel_file in "${failed_files[@]}"; do
    [ -z "$rel_file" ] && continue
    
    local target_file="$MONOREPO_ROOT/$WORKSPACE_LOCATION/$TARGET_RELATIVE/$rel_file"
    
    # Only inject if file exists and doesn't already have conflict markers
    if [ -f "$target_file" ] && ! grep -q '^<<<<<<< ' "$target_file" 2>/dev/null; then
      
      # Extract the relevant patch section for this file
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
        # Append informative marker to the file
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
        # Append the actual patch content
        cat "$temp_patch" >> "$target_file"
        
        cat >> "$target_file" << EOF
────────────────────────────────────────────────────────────

INSTRUCTIONS:
1. Review the patch above (lines with - are removed, lines with + are added)
2. Manually apply the intended changes to this file
3. Remove this entire conflict marker block (from <<<<<<< to >>>>>>>)
4. Stage the file: git add $WORKSPACE_LOCATION
5. Continue: npm run update-subtree -- --continue

For more details, view the upstream commit at:
  https://github.com/<owner>/<repo>/commit/${commit_sha}
>>>>>>> END PATCH FAILED
EOF
      fi
      rm -f "$temp_patch"
    fi
  done
}

# Function to apply patch-based updates
apply_patch_based_update() {
  local from_commit="$1"
  local to_commit="$2"
  local upstream_subdir="$3"
  local target_dir="$4"
  
  echo "Applying patch-based update from $from_commit to $to_commit"
  
  # Validate that we have a starting commit for patch-based updates
  if [ -z "$from_commit" ] || [ "$from_commit" = "null" ] || [ "$from_commit" = "" ]; then
    clean_exit 1 "No starting commit provided for patch-based update - this should be handled at the main script level"
  fi
  
  # Verify commits exist
  if ! git rev-parse --quiet --verify "$from_commit" >/dev/null; then
    warning_msg "Current commit $from_commit not found in upstream repository"
    clean_exit 1 "Cannot perform patch-based update - starting commit does not exist. Consider running with no package.json commit to force initial setup."
  fi
  
  # Get list of commits to apply (oldest first)
  local commits
  commits=$(git rev-list --no-merges --reverse "$from_commit..$to_commit")
  
  if [ -z "$commits" ]; then
    echo "No commits to apply between $from_commit and $to_commit"
    return 0
  fi
  
  local total_commits
  total_commits=$(echo "$commits" | wc -l | tr -d ' ')
  echo -e "Found ${YELLOW}$total_commits${NC} commits to apply"
  
  # Apply each commit as a patch with incremental commits
  local commit_count=0
  for commit in $commits; do
    commit_count=$((commit_count + 1))
    progress_msg "Applying commit $commit_count/$total_commits: $commit"
    
    # Get commit message from upstream
    local commit_msg
    commit_msg=$(git log -1 --format="%s" "$commit")
    
    # Generate patch for this specific commit
    local patch_file="$TMP_DIR/patch_${commit}.patch"
    git format-patch -1 "$commit" --stdout > "$patch_file"
    
    # Filter and transform the patch
    local filtered_patch="$TMP_DIR/filtered_${commit}.patch"
    filter_and_transform_patch "$patch_file" "$upstream_subdir" "$filtered_patch"
    
    # Apply the filtered patch in target directory
    if [ -s "$filtered_patch" ]; then
      cd "$MONOREPO_ROOT"
      
      # Try to apply the patch with 3-way merge for better conflict resolution
      if ! git apply --directory="$WORKSPACE_LOCATION/$TARGET_RELATIVE" --3way --index "$filtered_patch" 2>"$TMP_DIR/apply_error.log"; then
        error_msg "Conflict detected while applying commit $commit_count/$total_commits"
        echo -e "   ${YELLOW}Commit message: $commit_msg${NC}"
        echo -e "   ${YELLOW}Upstream commit: $commit${NC}"
        echo ""
        
        # Parse error output
        local apply_error=$(cat "$TMP_DIR/apply_error.log" 2>/dev/null || echo "")
        local has_git_conflicts=false
        local has_rejected_patches=false
        local failed_files=()
        local succeeded_files=()
        
        # Check if git created conflict markers (partial success with conflicts)
        if git diff --name-only --diff-filter=U 2>/dev/null | grep -q .; then
          has_git_conflicts=true
        fi
        
        # Check for completely rejected patches and collect failed files
        if echo "$apply_error" | grep -q "patch does not apply"; then
          has_rejected_patches=true
          # Extract file names that failed
          while IFS= read -r line; do
            if [[ "$line" =~ error:\ (.+):\ patch\ does\ not\ apply ]]; then
              local failed_file="${BASH_REMATCH[1]}"
              # Remove the directory prefix to get relative path
              failed_file="${failed_file#$WORKSPACE_LOCATION/$TARGET_RELATIVE/}"
              failed_files+=("$failed_file")
            fi
          done <<< "$apply_error"
          
          # If patch was completely rejected, try to apply files individually
          if [ "$has_git_conflicts" = false ] && [ ${#failed_files[@]} -gt 0 ]; then
            info_msg "Attempting to apply other files from the patch individually..."
            echo ""
            
            # Extract all files from the patch
            local all_files=$(grep '^diff --git' "$filtered_patch" | sed 's/^diff --git a\/.* b\///' || true)
            
            while IFS= read -r file; do
              [ -z "$file" ] && continue
              
              # Skip if this is one of the files that already failed
              local is_failed=false
              for failed in "${failed_files[@]}"; do
                if [ "$file" = "$failed" ]; then
                  is_failed=true
                  break
                fi
              done
              
              if [ "$is_failed" = false ]; then
                # Extract patch for just this file
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
                
                # Try to apply this single file
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
        
        # Provide context about what happened
        if [ "$has_git_conflicts" = true ] && [ "$has_rejected_patches" = false ]; then
          warning_msg "Git created conflict markers (partial application succeeded)"
          echo "Some changes were applied, but conflicts need manual resolution."
        elif [ "$has_git_conflicts" = false ] && [ "$has_rejected_patches" = true ]; then
          warning_msg "Patch was completely rejected (no automatic application possible)"
          echo "This typically means file content differs significantly from upstream."
          echo ""
          echo -e "${CYAN}Common causes:${NC}"
          echo "  • Local customizations/modifications in the fork"
          echo "  • Different code structure than upstream expects"
          echo "  • Previous patches changed the context"
        else
          warning_msg "Mixed results: some changes applied with conflicts, others rejected"
        fi
        
        echo ""
        
        # Show summary of what succeeded and what failed
        if [ ${#succeeded_files[@]} -gt 0 ]; then
          success_msg "Successfully applied ${#succeeded_files[@]} file(s):"
          for file in "${succeeded_files[@]}"; do
            echo "  ✓ $file"
          done
          echo ""
        fi
        
        # Try to inject helpful markers for completely failed files
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
        echo "   • Review what the patch wants to change"
        echo "   • Manually apply the intended changes"
        echo "   • Remove all conflict marker lines"
        echo ""
        echo "3. Verify your changes make sense:"
        echo -e "   ${YELLOW}git diff $WORKSPACE_LOCATION${NC}"
        echo ""
        echo "4. Stage all resolved files:"
        echo -e "   ${YELLOW}git add $WORKSPACE_LOCATION${NC}"
        echo ""
        echo "5. Continue the update process:"
        echo -e "   ${GREEN}npm run update-subtree -- --continue${NC}"
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
      
      # Stage changes and create commit
      safe_git_commit_if_changes "Update $PACKAGE_NAME: $commit_msg

Upstream commit: $commit" "$WORKSPACE_LOCATION/$TARGET_RELATIVE"
      local commit_exit_code=$?
      
      if [ $commit_exit_code -eq 0 ]; then
        # Changes were committed, update package.json
        if update_package_json_commit "$commit"; then
          git add "$PACKAGE_JSON"
          git commit -q --amend --no-edit
          success_msg "Applied commit $commit_count/$total_commits: $commit_msg"
        else
          warning_msg "Committed changes but failed to update package.json tracking"
        fi
      elif [ $commit_exit_code -eq 2 ]; then
        # No changes to commit, but still update package.json for tracking
        if update_package_json_commit "$commit"; then
          local tracking_msg="Update $PACKAGE_NAME tracking to $commit (no file changes)"
          if safe_git_commit_if_changes "$tracking_msg" "$PACKAGE_JSON" >/dev/null; then
            info_msg "No changes from commit $commit_count/$total_commits"
          fi
        else
          warning_msg "Failed to update package.json tracking for commit $commit_count/$total_commits"
        fi
      else
        # Commit failed
        clean_exit 1 "Failed to commit changes for commit $commit_count/$total_commits"
      fi
      
      cd "$TMP_DIR/repo"
    else
      info_msg "No relevant changes in commit $commit_count/$total_commits for subtree"
      
      # Still update package.json to track progress
      cd "$MONOREPO_ROOT"
      if update_package_json_commit "$commit"; then
        local tracking_msg="Update $PACKAGE_NAME tracking to $commit (no file changes)"
        safe_git_commit_if_changes "$tracking_msg" "$PACKAGE_JSON" >/dev/null
      else
        warning_msg "Failed to update package.json tracking for commit $commit_count/$total_commits"
      fi
      
      cd "$TMP_DIR/repo"
    fi
  done
}

# Function to filter and transform patch files
filter_and_transform_patch() {
  local input_patch="$1"
  local upstream_subdir="$2"
  local output_patch="$3"
  
  # If no subdirectory filter, just copy the patch
  if [ -z "$upstream_subdir" ]; then
    cp "$input_patch" "$output_patch"
    return 0
  fi
  
  # Use awk to filter and transform the patch
  awk -v subdir="$upstream_subdir" '
    BEGIN {
      in_relevant_file = 0
      skip_file = 0
      subdir_prefix = subdir "/"
    }
    
    # Handle file headers
    /^diff --git/ {
      # Extract file paths using split instead of match for better compatibility
      split($0, parts, " ")
      old_path_full = parts[3]  # a/path/to/file
      new_path_full = parts[4]  # b/path/to/file
      
      # Remove a/ and b/ prefixes
      gsub(/^a\//, "", old_path_full)
      gsub(/^b\//, "", new_path_full)
      old_path = old_path_full
      new_path = new_path_full
      
      # Check if file is in our subdirectory
      if (old_path ~ "^" subdir_prefix || new_path ~ "^" subdir_prefix) {
        in_relevant_file = 1
        skip_file = 0
        
        # Transform paths by removing subdirectory prefix
        gsub("a/" subdir_prefix, "a/", $0)
        gsub("b/" subdir_prefix, "b/", $0)
        print $0
      } else {
        in_relevant_file = 0
        skip_file = 1
      }
      next
    }
    
    # Handle index lines
    /^index / {
      if (in_relevant_file && !skip_file) print $0
      next
    }
    
    # Handle file mode changes
    /^(new|deleted) file mode/ {
      if (in_relevant_file && !skip_file) print $0
      next
    }
    
    # Handle rename/copy headers
    /^(rename|copy) (from|to)/ {
      if (in_relevant_file && !skip_file) {
        # Transform paths
        gsub(subdir_prefix, "", $0)
        print $0
      }
      next
    }
    
    # Handle --- and +++ lines (file paths in unified diff)
    /^(---|[+][+][+])/ {
      if (in_relevant_file && !skip_file) {
        # Transform paths
        if ($0 ~ "^---.*/" subdir_prefix) {
          gsub("/" subdir_prefix, "/", $0)
        } else if ($0 ~ "^[+][+][+].*/" subdir_prefix) {
          gsub("/" subdir_prefix, "/", $0)
        }
        print $0
      }
      next
    }
    
    # Handle all other lines (hunks, context, etc.)
    {
      if (in_relevant_file && !skip_file) print $0
    }
  ' "$input_patch" > "$output_patch"
}

# Check if target directory exists, if not create it
if [ ! -d "$TARGET_DIR" ]; then
  mkdir -p "$TARGET_DIR"
fi

# Apply patch-based update
apply_patch_based_update "$CURRENT_COMMIT" "$TARGET_COMMIT" "$UPSTREAM_SUBDIR" "$TARGET_DIR"

# Ensure we're back in monorepo root
cd "$MONOREPO_ROOT"

success_msg "Successfully updated $PACKAGE_NAME to $TARGET_COMMIT"
