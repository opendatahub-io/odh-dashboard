#!/bin/bash

set -e

# This script imports a subdirectory from an upstream repository into the monorepo
# using git subtree. The configuration is read from the package.json file.
#
# - The monorepo's history is preserved and is NOT rewritten.
# - The script works by cloning the upstream repo to a temporary directory,
#   filtering out everything except the desired subdirectory (if specified),
#   and then using git subtree to add or update the code in the monorepo.
# - This is safe for repeated use and for syncing updates from upstream.
# - Only the temporary clone is rewritten; the monorepo is never rewritten.
# - Changes from upstream are squashed into a single commit to avoid polluting history.
#
# Usage:
#   ./package-subtree.sh <package-name> [commit-sha]
# If a commit SHA is provided, that commit is used; otherwise, the latest on main is used.

if [ -z "$1" ]; then
  echo "Error: Package name is required."
  echo "Usage: $0 <package-name> [commit-sha]"
  exit 1
fi

# Find the monorepo root first
MONOREPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$MONOREPO_ROOT"

# Ensure the working tree is clean before proceeding
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: There are uncommitted changes or staged files in your working tree."
  echo "Please commit or stash your changes before running this script."
  exit 1
fi

PACKAGE_NAME="$1"
COMMIT_SHA="$2"

# For file operations we use absolute paths
PACKAGE_DIR_ABS="$MONOREPO_ROOT/frontend/packages/$PACKAGE_NAME"
PACKAGE_JSON_PATH="$PACKAGE_DIR_ABS/package.json"

# For git operations we use relative paths
PACKAGE_DIR_REL="frontend/packages/$PACKAGE_NAME"

# Ensure the package directory exists
if [ ! -d "$PACKAGE_DIR_ABS" ]; then
  echo "Error: Package directory $PACKAGE_DIR_ABS does not exist."
  exit 1
fi

# Ensure the package.json exists
if [ ! -f "$PACKAGE_JSON_PATH" ]; then
  echo "Error: Package.json not found at $PACKAGE_JSON_PATH."
  exit 1
fi

# Check for jq, which we'll use to parse package.json
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required for parsing package.json."
  echo "Please install jq and try again."
  exit 1
fi

# Extract subtree configuration from package.json
if ! jq -e '.subtree' "$PACKAGE_JSON_PATH" > /dev/null; then
  echo "Error: No 'subtree' property found in $PACKAGE_JSON_PATH."
  exit 1
fi

UPSTREAM_REPO=$(jq -r '.subtree.repo' "$PACKAGE_JSON_PATH")
UPSTREAM_SUBDIR=$(jq -r '.subtree.src' "$PACKAGE_JSON_PATH")
TARGET_SUBDIR_FROM_JSON=$(jq -r '.subtree.target' "$PACKAGE_JSON_PATH")
CURRENT_COMMIT=$(jq -r '.subtree.commit // ""' "$PACKAGE_JSON_PATH")

# Derive the org/repo slug from UPSTREAM_REPO
ORG_REPO_SLUG=$(echo "$UPSTREAM_REPO" | sed '
s#^[^@:/]*://[^/]*/*##
s#^[^@]*@?[^:]*:##
s/\.git$//
s#^/*##
s#/*$##
')

if [ -z "$ORG_REPO_SLUG" ]; then
  echo "Error: Could not derive org/repo slug from UPSTREAM_REPO ('$UPSTREAM_REPO')."
  exit 1
fi

# Define the new effective target path components
EFFECTIVE_TARGET_BASE_DIR="upstream" # Literal 'upstream' directory
EFFECTIVE_TARGET_NESTED_PATH="$EFFECTIVE_TARGET_BASE_DIR/$ORG_REPO_SLUG" # e.g., upstream/kubeflow/model-registry

# For file operations we use absolute paths - REPLACES original TARGET_DIR_ABS definition
TARGET_DIR_ABS="$PACKAGE_DIR_ABS/$EFFECTIVE_TARGET_NESTED_PATH"
# For git operations we use relative paths - REPLACES original TARGET_DIR_REL definition
TARGET_DIR_REL="$PACKAGE_DIR_REL/$EFFECTIVE_TARGET_NESTED_PATH"

# Validate required properties from package.json
if [ -z "$UPSTREAM_REPO" ] || [ "$UPSTREAM_REPO" = "null" ]; then
  echo "Error: subtree.repo is missing in package.json."
  exit 1
fi

if [ -z "$TARGET_SUBDIR_FROM_JSON" ] || [ "$TARGET_SUBDIR_FROM_JSON" = "null" ]; then
  echo "Error: subtree.target is missing in package.json (though its value is not directly used for the new path structure, it must be present)."
  exit 1
fi

# src is optional - if not provided, we use the entire repo
if [ -z "$UPSTREAM_SUBDIR" ] || [ "$UPSTREAM_SUBDIR" = "null" ]; then
  UPSTREAM_SUBDIR=""
  echo "No src specified, using entire repository."
fi

echo "Updating package: $PACKAGE_NAME"
echo "Upstream repository: $UPSTREAM_REPO"
if [ -n "$UPSTREAM_SUBDIR" ]; then
  echo "Upstream subdirectory: $UPSTREAM_SUBDIR"
fi
echo "Target directory: $TARGET_DIR_REL"

# Check early if this is an update operation (TARGET_DIR_ABS already exists)
# The clean working tree check is now done universally at the start of the script.
if [ -d "$TARGET_DIR_ABS" ]; then
  echo "Target directory exists, this is an update operation."
fi

echo ""
echo "Fetching upstream repository..."

TMP_DIR="$(mktemp -d)"

# Ensure the temp directory is always cleaned up on exit or error
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

# Suppress verbose output from git clone
git clone -q "$UPSTREAM_REPO" "$TMP_DIR/upstream-repo"
cd "$TMP_DIR/upstream-repo"

# Checkout the desired commit or main branch and suppress the detached HEAD advice
if [ -n "$COMMIT_SHA" ]; then
  git -c advice.detachedHead=false checkout -q "$COMMIT_SHA"
else
  git checkout -q main
fi

# Capture the actual commit SHA from the original upstream repository
# This will be used for a more informative commit message in the monorepo
UPSTREAM_SOURCE_SHA=$(git rev-parse HEAD)

# If we're using the same commit as before, check if we need to proceed
if [ -n "$CURRENT_COMMIT" ] && [ "$CURRENT_COMMIT" = "$UPSTREAM_SOURCE_SHA" ]; then
  echo "Checking for changes since last update..."
fi

echo ""
echo "Processing upstream repository..."

# Filter the repo to only the desired subdirectory if specified.
# Skip filtering if no src is provided to use the entire repo.
if [ -n "$UPSTREAM_SUBDIR" ]; then
  # This is done ONLY on the temp clone, never on the monorepo.
  # This ensures the monorepo's history is never rewritten.
  # --force is used to avoid errors if the temp clone is not considered 'fresh' by git filter-repo.
  if command -v git-filter-repo &> /dev/null; then
    git filter-repo --force --quiet --subdirectory-filter "$UPSTREAM_SUBDIR" > /dev/null
  else
    echo "git-filter-repo is not installed. It is highly recommended for this operation."
    read -p "Would you like to install git-filter-repo now? (y/n): " install_filter_repo
    if [[ "$install_filter_repo" =~ ^[Yy]$ ]]; then
      echo "Attempting to install git-filter-repo via pip..."
      pip install --user git-filter-repo || {
        echo "Failed to install git-filter-repo. Please install it manually and re-run the script.";
        exit 1;
      }
      # Add common pip install locations to PATH for this session
      export PATH="$HOME/.local/bin:$HOME/Library/Python/3.11/bin:$PATH"
      git filter-repo --force --quiet --subdirectory-filter "$UPSTREAM_SUBDIR" > /dev/null
    else
      echo "Falling back to git filter-branch (deprecated, slower, and less reliable)."
      git filter-branch --quiet --subdirectory-filter "$UPSTREAM_SUBDIR" -- --all > /dev/null
    fi
  fi
fi

# Prefix all paths in the (potentially already subdirectory-filtered) temporary repo
# This helps avoid path clashes if the upstream project uses common directory names (e.g., 'frontend', 'docs')
# that might also exist at the root or other locations in the monorepo.
if command -v git-filter-repo &> /dev/null; then
  echo "Prefixing all paths in temporary upstream history with: '$EFFECTIVE_TARGET_NESTED_PATH'"
  git filter-repo --force --quiet --to-subdirectory-filter "$EFFECTIVE_TARGET_NESTED_PATH" > /dev/null
  echo "All upstream content now effectively under '$EFFECTIVE_TARGET_NESTED_PATH/' in the temporary clone."

  echo "Making '$EFFECTIVE_TARGET_NESTED_PATH' the new root of the temporary repository for subtree operation."
  git filter-repo --force --quiet --subdirectory-filter "$EFFECTIVE_TARGET_NESTED_PATH" > /dev/null
  echo "Temporary repository root now contains the content previously under '$EFFECTIVE_TARGET_NESTED_PATH/'."
else
  echo "Warning: git-filter-repo is not installed. Cannot perform path prefixing in the upstream history."
  echo "         This step is highly recommended to avoid potential path clashes with the main repository."
  echo "         Please consider installing git-filter-repo and re-running."
  # Not attempting this with filter-branch due to its complexity and potential for errors in this context.
fi

# Create a branch for subtree operations, but suppress output
git checkout -q -b filtered-main

# Return to the monorepo root
cd "$MONOREPO_ROOT"

# Generate a remote name based on package name to avoid conflicts
REMOTE_NAME="${PACKAGE_NAME}-upstream"

# Remove the remote if it already exists (cleanup from previous runs)
if git remote | grep -q "^$REMOTE_NAME$"; then
  git remote remove "$REMOTE_NAME" > /dev/null
fi
git remote add "$REMOTE_NAME" "$TMP_DIR/upstream-repo" > /dev/null
git fetch --quiet "$REMOTE_NAME" filtered-main:refs/remotes/"$REMOTE_NAME"/filtered-main > /dev/null

echo ""
echo "Checking for updates..."

# Flag to track if changes were made
CHANGES_MADE=true

# Handle initial add or update
if [ ! -d "$TARGET_DIR_ABS" ]; then
  # First time add - use subtree add with specified commit message
  echo "Adding subtree for the first time..."
  git subtree add --squash --prefix="$TARGET_DIR_REL" "$TMP_DIR/upstream-repo" filtered-main -m "Add '$TARGET_DIR_REL' from upstream repository commit '$UPSTREAM_SOURCE_SHA'" > /dev/null
else
  # Temporarily disable error handling to capture exit code
  set +e
  SUBTREE_OUTPUT=$(git subtree pull --squash --prefix="$TARGET_DIR_REL" "$REMOTE_NAME" filtered-main -m "Update '$TARGET_DIR_REL' from upstream repository commit '$UPSTREAM_SOURCE_SHA'" 2>&1)
  SUBTREE_EXIT_CODE=$?
  set -e
  
  # Check if the subtree was already up to date by looking for various possible messages
  if echo "$SUBTREE_OUTPUT" | grep -q "Already up to date\|Subtree is already at commit"; then
    CHANGES_MADE=false
  elif [ $SUBTREE_EXIT_CODE -ne 0 ]; then
    # If it's any other error, show a clean error message
    echo "Error: Failed to update subtree. Details:"
    echo "$SUBTREE_OUTPUT"
    exit $SUBTREE_EXIT_CODE
  fi
fi

# Clean up: remove the temp remote (temp directory is cleaned by trap)
git remote remove "$REMOTE_NAME" > /dev/null

echo ""

# Only update package.json if actual content changes were made
if [ "$CHANGES_MADE" = true ]; then
  # Update the commit ID in package.json
  jq --arg commit "$UPSTREAM_SOURCE_SHA" '.subtree.commit = $commit' "$PACKAGE_JSON_PATH" > "$TMP_DIR/package.json.new"
  mv "$TMP_DIR/package.json.new" "$PACKAGE_JSON_PATH"

  # Check if there are changes to commit
  if git diff --quiet "$PACKAGE_JSON_PATH"; then
    echo "No changes to package.json needed."
  else
    # Commit the updated package.json
    git add "$PACKAGE_JSON_PATH"
    git commit -m "Update $PACKAGE_NAME subtree commit reference to $UPSTREAM_SOURCE_SHA" > /dev/null
  fi
  
  echo "✅ The subtree has been updated in $TARGET_DIR_REL to commit $UPSTREAM_SOURCE_SHA"
else
  # If we have a different commit but no content changes, explain the situation
  if [ "$CURRENT_COMMIT" != "$UPSTREAM_SOURCE_SHA" ]; then
    echo "ℹ️ The specified commit has a different ID but contains identical content"
    echo "   after filtering to the specified subdirectory."
    echo "   package.json has NOT been updated since the content is identical."
  fi
  echo "✅ Subtree is already up-to-date - no changes needed"
fi

# Always exit successfully if we've made it this far
exit 0
