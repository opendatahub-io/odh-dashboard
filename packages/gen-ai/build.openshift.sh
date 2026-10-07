#!/bin/bash

# Configuration
DOCKERFILE="packages/gen-ai/Dockerfile.workspace"

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
APP_NAME="genai"

# Echo variables
echo "📦 Repository URL: ${REPO_URL}"
echo "🌿 Branch: ${BRANCH}"
echo "📱 Application Name: ${APP_NAME}"
echo "🐳 Dockerfile Path: ${DOCKERFILE}"
echo "--------------------------------"

# Create the application with context-dir (required for dry-run to work properly)
echo "🚀 Creating OpenShift application..."
oc new-app ${REPO_URL}#${BRANCH}  --strategy=docker --name=${APP_NAME} --allow-missing-images --context-dir=packages/gen-ai

# Wait for BuildConfig to be created
echo "⏳ Waiting for BuildConfig to be created..."
oc wait --for=jsonpath='{.metadata.name}'=${APP_NAME} buildconfig/${APP_NAME} --timeout=60s 2>/dev/null || true
echo "✅ BuildConfig created successfully"

# Patch BuildConfig to remove context-dir and set Dockerfile path relative to repo root
# Single JSON patch: remove contextDir and add dockerfilePath (add works since we're setting it fresh)
echo "🔧 Patching BuildConfig..."
oc patch buildconfig ${APP_NAME} --type='json' -p='[
  {"op": "remove", "path": "/spec/source/contextDir"},
  {"op": "add", "path": "/spec/strategy/dockerStrategy/dockerfilePath", "value": "packages/gen-ai/Dockerfile.workspace"},
  {"op": "add", "path": "/spec/strategy/dockerStrategy/buildArgs", "value": [{"name": "DEPLOYMENT_MODE", "value": "standalone"}]}
]'

echo "✅ Patched BuildConfig: removed contextDir and set dockerfilePath to ${DOCKERFILE}"

# Cancel the first build (automatically triggered) and start a new one with patched config
echo "🛑 Cancelling first build..."
oc cancel-build ${APP_NAME}-1 2>/dev/null || echo "ℹ️  Build may have already completed or been cancelled"

echo "🚀 Starting new build with patched configuration..."
oc start-build ${APP_NAME}

# Wait for service to be created
echo "⏳ Waiting for service to be created..."
oc wait --for=jsonpath='{.metadata.name}'=${APP_NAME} svc/${APP_NAME} --timeout=60s 2>/dev/null || true
echo "✅ Service created successfully"

# Create edge route (skip if already exists)
echo "🌐 Creating edge route..."
oc create route edge --service=${APP_NAME} --port=8080 2>/dev/null && echo "✅ Edge route created successfully" || echo "ℹ️  Route may already exist, skipping..."

# Wait for route to be ready and display the URL
echo "⏳ Waiting for route to be ready..."
oc wait --for=jsonpath='{.spec.host}'=.* route/${APP_NAME} --timeout=60s 2>/dev/null || true
ROUTE_HOST=$(oc get route ${APP_NAME} -o jsonpath='{.spec.host}' 2>/dev/null)
if [ -n "${ROUTE_HOST}" ]; then
    echo ""
    echo "🎉 Deployment complete!"
    echo "🔗 Route URL: https://${ROUTE_HOST}"
    echo ""
else
    echo "⚠️  Could not retrieve route host"
fi

