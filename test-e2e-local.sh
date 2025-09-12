#!/bin/bash

# Local E2E Test Runner - Matches Jenkins format
# Usage: ./test-e2e-local.sh @SanitySet1

set -e

TAG=${1:-"@SanitySet1"}
# Remove @ from tag name for directory naming
TAG_DIR=$(echo "$TAG" | sed 's/@//')
RESULTS_DIR="./frontend/src/__tests__/cypress/results/$TAG_DIR"

echo "🧪 Testing E2E locally with tag: $TAG"
echo "📁 Results will be saved to: $RESULTS_DIR"

# Create results directory
mkdir -p "$RESULTS_DIR"

# Set environment variables (matches Jenkins format)
export CY_TEST_CONFIG="./frontend/src/__tests__/cypress/test-variables.yml"
export CY_RESULTS_DIR="$RESULTS_DIR"

# Build the frontend first
echo "🔨 Building frontend..."
cd frontend
npm run cypress:server:build

# Start the dev server in background
echo "🚀 Starting dev server..."
npm run start:dev &
SERVER_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for localhost:9001 to be ready..."
npx wait-on tcp:127.0.0.1:9001 --timeout 60000
echo "✅ Server is ready!"

# Run the tests with Jenkins-style command format
echo "🎯 Running Cypress tests with tag: $TAG"
CYPRESS_BROWSER=electron CYPRESS_BASE_URL=http://localhost:9001 CY_TEST_TAGS="$TAG" CY_SKIP_TAGS="@Bug,@Maintain,@NonConcurrent" CY_RESULTS_DIR="$RESULTS_DIR" npm run test:cypress:ci:matrix

# Clean up server
echo "🧹 Cleaning up server..."
kill $SERVER_PID 2>/dev/null || true

echo "✅ Local E2E test completed!"
echo "📊 Results saved to: $RESULTS_DIR"
