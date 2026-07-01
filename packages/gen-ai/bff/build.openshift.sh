#!/bin/bash

# Configuration
DOCKERFILE="Dockerfile"

# Get Git information
# Get the remote and branch from upstream
UPSTREAM="$(git rev-parse --abbrev-ref @{u} 2>/dev/null || echo "")"
REMOTE="$(echo "$UPSTREAM" | cut -d/ -f1)"

if [ -z "$REMOTE" ]; then
    echo "❌ Error: Current branch is not tracking any remote branch"
    echo "💡 Fix with: git branch --set-upstream-to=REMOTE/BRANCH $(git rev-parse --abbrev-ref HEAD)"
    echo "   Example: git branch --set-upstream-to=origin/main main"
    exit 1
fi

REPO_URL="$(git remote get-url "${REMOTE}" 2>/dev/null)"

# Check if remote URL exists and is HTTPS
if [ -z "$REPO_URL" ]; then
    echo "❌ Error: Remote '${REMOTE}' not found"
    echo "💡 Fix with: git remote add ${REMOTE} https://github.com/YOUR_USERNAME/odh-dashboard.git"
    exit 1
elif [[ ! "$REPO_URL" =~ ^https:// ]]; then
    echo "❌ Error: Remote '${REMOTE}' is not using HTTPS for fetch"
    echo "💡 Current fetch URL: $REPO_URL"
    echo "💡 Fix with: git remote set-url ${REMOTE} https://github.com/YOUR_USERNAME/odh-dashboard.git"
    echo "💡 For SSH push only: git remote set-url --push ${REMOTE} git@github.com:YOUR_USERNAME/odh-dashboard.git"
    exit 1
fi

# Get current branch name
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
REPO_ROOT="$(git rev-parse --show-toplevel)"
# Get current directory relative to repo root
CURRENT_DIR="$(pwd)"
CONTEXT_DIR="${CURRENT_DIR#$REPO_ROOT/}"
DOCKERFILE_PATH="${CONTEXT_DIR}/${DOCKERFILE}"
APP_NAME="genai-bff"

# Echo variables
echo "Repository URL: ${REPO_URL}"
echo "Branch: ${BRANCH}"
echo "Context Directory: . (repo root)"
echo "Dockerfile Path: ${DOCKERFILE_PATH}"
echo "Application Name: ${APP_NAME}"
echo "--------------------------------"

# Create the application (context is repo root so pkg/tls is accessible)
oc new-app ${REPO_URL}#${BRANCH} \
  --context-dir=. \
  --strategy=docker \
  --docker-file=${DOCKERFILE_PATH} \
  --name=genai-bff

# Expose the service
oc create route edge --service=genai-bff

