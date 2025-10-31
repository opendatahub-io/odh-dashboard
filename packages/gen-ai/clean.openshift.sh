#!/bin/bash

APP_NAME="genai"

echo "🧹 Cleaning up OpenShift resources for ${APP_NAME}..."
echo ""

# Delete route
echo "🌐 Deleting route..."
oc delete route ${APP_NAME} >>debug.log 2>&1 && echo "✅ Route deleted" || echo "ℹ️  Route not found or already deleted"

# Delete service
echo "🔌 Deleting service..."
oc delete svc ${APP_NAME} >>debug.log 2>&1 && echo "✅ Service deleted" || echo "ℹ️  Service not found or already deleted"

# Delete deployment/deploymentconfig
echo "🚀 Deleting deployment..."
oc delete deployment ${APP_NAME} >>debug.log 2>&1 && echo "✅ Deployment deleted" || echo "ℹ️  Deployment not found or already deleted"
oc delete deploymentconfig ${APP_NAME} >>debug.log 2>&1 && echo "✅ DeploymentConfig deleted" || echo "ℹ️  DeploymentConfig not found or already deleted"

# Delete all builds (associated with buildconfig)
echo "🔨 Deleting builds..."
oc delete builds -l buildconfig=${APP_NAME} >>debug.log 2>&1 && echo "✅ Builds deleted" || echo "ℹ️  No builds found or already deleted"

# Delete buildconfig (this will also clean up associated builds in the future)
echo "📦 Deleting BuildConfig..."
oc delete buildconfig ${APP_NAME} >>debug.log 2>&1 && echo "✅ BuildConfig deleted" || echo "ℹ️  BuildConfig not found or already deleted"

# Also delete ImageStream if it exists (often created automatically)
echo "🖼️  Deleting ImageStream..."
oc delete imagestream ${APP_NAME} >>debug.log 2>&1 && echo "✅ ImageStream deleted" || echo "ℹ️  ImageStream not found or already deleted"

echo ""
echo "🎉 Cleanup complete!"

