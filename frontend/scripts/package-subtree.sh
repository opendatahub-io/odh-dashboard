#!/bin/bash

set -e

# Simple script to sync upstream repository content into monorepo
# Usage: ./package-subtree.sh <package-name> [commit-sha]

if [ -z "$1" ]; then
  echo "Usage: $0 <package-name> [commit-sha]"
  exit 1
fi

# Variables
PACKAGE_NAME="$1"
COMMIT_SHA="$2"
MONOREPO_ROOT="$(git rev-parse --show-toplevel)"
PACKAGE_JSON="$MONOREPO_ROOT/frontend/packages/$PACKAGE_NAME/package.json"

# Change to monorepo root to ensure we're in a safe directory
cd "$MONOREPO_ROOT"

# Check clean working tree
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working tree has uncommitted changes"
  exit 1
fi

# Read config from package.json
UPSTREAM_REPO=$(jq -r '.subtree.repo' "$PACKAGE_JSON")
UPSTREAM_SUBDIR=$(jq -r '.subtree.src // ""' "$PACKAGE_JSON")
TARGET_RELATIVE=$(jq -r '.subtree.target' "$PACKAGE_JSON")
CURRENT_COMMIT=$(jq -r '.subtree.commit // ""' "$PACKAGE_JSON")

# Derive target path (relative to package directory)
TARGET_DIR="$MONOREPO_ROOT/frontend/packages/$PACKAGE_NAME/$TARGET_RELATIVE"

echo "Syncing $PACKAGE_NAME from $UPSTREAM_REPO"

# Set up temp directory
TMP_DIR=$(mktemp -d)
trap "cd '$MONOREPO_ROOT'; rm -rf '$TMP_DIR'" EXIT

# Clone and checkout desired commit
git clone -q "$UPSTREAM_REPO" "$TMP_DIR/repo"

# Get commit SHA (do this before changing directory)
if [ -n "$COMMIT_SHA" ]; then
  ACTUAL_COMMIT=$(cd "$TMP_DIR/repo" && git checkout -q "$COMMIT_SHA" && git rev-parse HEAD)
else
  ACTUAL_COMMIT=$(cd "$TMP_DIR/repo" && git rev-parse HEAD)
fi

# Early exit if no changes
if [ "$CURRENT_COMMIT" = "$ACTUAL_COMMIT" ] && [ -d "$TARGET_DIR" ]; then
  echo "Already up-to-date at $ACTUAL_COMMIT"
  exit 0
fi

# Handle first-time setup vs updates
if [ ! -d "$TARGET_DIR" ] || [ -z "$CURRENT_COMMIT" ] || [ "$CURRENT_COMMIT" = "null" ]; then
  echo "Performing initial copy from $UPSTREAM_REPO"
  mkdir -p "$TARGET_DIR"
  
  if [ -n "$UPSTREAM_SUBDIR" ]; then
    cp -r "$TMP_DIR/repo/$UPSTREAM_SUBDIR/." "$TARGET_DIR/"
  else
    cp -r "$TMP_DIR/repo/." "$TARGET_DIR/"
  fi
else
  echo "Applying changes from $CURRENT_COMMIT to $ACTUAL_COMMIT"
  
  # Create a temporary git repo to generate and apply the diff
  PATCH_DIR=$(mktemp -d)
  trap "cd '$MONOREPO_ROOT'; rm -rf '$TMP_DIR' '$PATCH_DIR'" EXIT
  
  # Clone and setup for patch generation
  git clone -q "$UPSTREAM_REPO" "$PATCH_DIR/repo"
  cd "$PATCH_DIR/repo"
  
  # Generate patch between commits
  echo "Generating patch between $CURRENT_COMMIT..$ACTUAL_COMMIT"
  if [ -n "$UPSTREAM_SUBDIR" ]; then
    # Generate patch for subdirectory only
    echo "Using subdirectory filter: $UPSTREAM_SUBDIR"
    git format-patch --relative="$UPSTREAM_SUBDIR" --stdout "$CURRENT_COMMIT..$ACTUAL_COMMIT" > "$PATCH_DIR/changes.patch"
  else
    # Generate patch for entire repo
    echo "Using entire repo"
    git format-patch --stdout "$CURRENT_COMMIT..$ACTUAL_COMMIT" > "$PATCH_DIR/changes.patch"
  fi
  
  echo "Patch file size: $(wc -c < "$PATCH_DIR/changes.patch") bytes"
  
  # Return to monorepo root
  cd "$MONOREPO_ROOT"
  
  # Apply patch if it's not empty
  if [ -s "$PATCH_DIR/changes.patch" ]; then
    echo "Applying upstream changes..."
    echo "Patch contents:"
    cat "$PATCH_DIR/changes.patch"
    echo "---"
    
    # Create backup of target directory
    BACKUP_DIR=$(mktemp -d)
    cp -r "$TARGET_DIR/." "$BACKUP_DIR/"
    
    # Try to apply the patch with multiple methods
    echo "Attempting to apply patch in directory: $TARGET_DIR"
    
    # Method 1: Try git apply with permissive flags
    if (cd "$TARGET_DIR" && git apply --ignore-whitespace --ignore-space-change --verbose "$PATCH_DIR/changes.patch" 2>/dev/null); then
      echo "✅ Successfully applied upstream changes with git apply"
      rm -rf "$BACKUP_DIR"
    # Method 2: Try standard patch command  
    elif (cd "$TARGET_DIR" && patch -p1 < "$PATCH_DIR/changes.patch"); then
      echo "✅ Successfully applied upstream changes with patch command"
      rm -rf "$BACKUP_DIR"
    else
      echo "⚠️  Patch application failed, attempting 3-way merge..."
      
      # Restore backup
      rm -rf "$TARGET_DIR"
      mv "$BACKUP_DIR" "$TARGET_DIR"
      
      # Try 3-way merge approach
      MERGE_DIR=$(mktemp -d)
      
      # Setup merge directories
      mkdir -p "$MERGE_DIR/base" "$MERGE_DIR/upstream" "$MERGE_DIR/current"
      
      # Get base version (old commit)
      cd "$TMP_DIR/repo"
      git checkout -q "$CURRENT_COMMIT"
      if [ -n "$UPSTREAM_SUBDIR" ]; then
        cp -r "$UPSTREAM_SUBDIR/." "$MERGE_DIR/base/" 2>/dev/null || true
      else
        cp -r . "$MERGE_DIR/base/"
      fi
      
      # Get upstream version (new commit)
      git checkout -q "$ACTUAL_COMMIT"
      if [ -n "$UPSTREAM_SUBDIR" ]; then
        cp -r "$UPSTREAM_SUBDIR/." "$MERGE_DIR/upstream/" 2>/dev/null || true
      else
        cp -r . "$MERGE_DIR/upstream/"
      fi
      
      # Copy current version
      cp -r "$TARGET_DIR/." "$MERGE_DIR/current/"
      
      cd "$MONOREPO_ROOT"
      
      # Perform 3-way merge using git
      cd "$MERGE_DIR"
      git init -q
      git config user.email "package-subtree@local"
      git config user.name "Package Subtree"
      
      # Add base version
      cp -r base/. .
      git add -A
      git commit -q -m "Base version"
      BASE_COMMIT=$(git rev-parse HEAD)
      
      # Add current version
      rm -rf * .[^.]*
      cp -r current/. .
      git add -A
      git commit -q -m "Current version"
      CURRENT_MERGE_COMMIT=$(git rev-parse HEAD)
      
      # Create upstream branch and merge
      git checkout -q -b upstream "$BASE_COMMIT"
      rm -rf * .[^.]*
      cp -r upstream/. .
      git add -A
      git commit -q -m "Upstream version"
      
      # Attempt merge
      git checkout -q "$CURRENT_MERGE_COMMIT"
      if git merge -q --no-edit upstream; then
        echo "✅ 3-way merge successful"
        # Copy merged result back
        rm -rf "$TARGET_DIR"
        mkdir -p "$TARGET_DIR"
        cp -r . "$TARGET_DIR/"
        # Remove git artifacts
        rm -rf "$TARGET_DIR/.git"
      else
        echo "❌ Merge conflicts detected. Manual resolution required."
        echo "Merge workspace available at: $MERGE_DIR"
        echo "Current directory preserved unchanged."
        # Don't clean up merge dir so user can inspect
        trap "cd '$MONOREPO_ROOT'; rm -rf '$TMP_DIR'" EXIT
        exit 1
      fi
      
      cd "$MONOREPO_ROOT"
      rm -rf "$MERGE_DIR"
    fi
  else
    echo "No changes to apply between $CURRENT_COMMIT and $ACTUAL_COMMIT"
  fi
fi

# Update package.json with the new commit ID
jq --arg commit "$ACTUAL_COMMIT" '.subtree.commit = $commit' "$PACKAGE_JSON" > "$PACKAGE_JSON.tmp"
mv "$PACKAGE_JSON.tmp" "$PACKAGE_JSON"

# Stage all changes and commit as single commit
git add "frontend/packages/$PACKAGE_NAME"
if ! git diff --cached --quiet; then
  git commit -m "Update $PACKAGE_NAME to $ACTUAL_COMMIT"
  echo "✅ Updated $PACKAGE_NAME to $ACTUAL_COMMIT"
else
  echo "ℹ️ Already up-to-date at $ACTUAL_COMMIT"
fi
