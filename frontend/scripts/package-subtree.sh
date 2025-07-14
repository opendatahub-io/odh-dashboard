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

# Copy content (staying in monorepo root)
rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

if [ -n "$UPSTREAM_SUBDIR" ]; then
  cp -r "$TMP_DIR/repo/$UPSTREAM_SUBDIR/." "$TARGET_DIR/"
else
  cp -r "$TMP_DIR/repo/." "$TARGET_DIR/"
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
