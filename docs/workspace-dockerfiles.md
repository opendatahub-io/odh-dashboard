# Workspace Dockerfiles for Module Federation

This document explains the workspace-aware Dockerfile pattern used for building Module Federation packages in the ODH Dashboard monorepo.

## Overview

The ODH Dashboard uses a modular architecture with [Module Federation](./module-federation.md) to enable dynamic loading of UI components. Federated modules now live under the root `packages/` directory (previously `frontend/packages/`) and depend on other workspace packages and shared dependencies (for example the main `frontend/` application and plugin core libraries).

Traditional Dockerfiles that build from the package directory level fail for these modules because they cannot access workspace dependencies like `@odh-dashboard/plugin-core` and `@openshift/dynamic-plugin-sdk`.

## The Problem

Module Federation packages often have dependencies that are:

1. **Workspace packages** - Internal packages like `@odh-dashboard/plugin-core`
2. **Shared federated modules** - External packages like `@openshift/dynamic-plugin-sdk`
3. **TypeScript configurations** - Shared tsconfig from `@odh-dashboard/tsconfig`

When building with a standard Dockerfile from the package directory, these dependencies are not available, causing build failures like:

```text
Module not found: Error: Can't resolve '@odh-dashboard/plugin-core'
Module not found: Error: Can't resolve '@openshift/dynamic-plugin-sdk'
```

## The Solution: Workspace-Aware Dockerfiles

Workspace-aware Dockerfiles solve this problem by:

1. **Building from the repository root** - Provides access to all workspace packages (root, frontend, backend, and module packages)
2. **Installing workspace dependencies first** - Creates the workspace node_modules with all packages
3. **Copying shared packages** - Ensures workspace packages are available during build
4. **Installing federated dependencies** - Adds required Module Federation packages to the build context

## Dockerfile Structure

The workspace Dockerfile follows this pattern:

```dockerfile
# Multi-stage workspace-aware Dockerfile for Module Federation packages
# Build from repository root: docker build --file ./packages/<module>/Dockerfile.workspace .

# Source code arguments - can be overridden for different modules
ARG MODULE_NAME=your-module
ARG UI_SOURCE_CODE=./packages/${MODULE_NAME}/upstream/frontend
ARG BFF_SOURCE_CODE=./packages/${MODULE_NAME}/upstream/bff

# UI build stage
FROM node-base AS ui-builder
WORKDIR /usr/src/workspace

# Copy workspace configuration and shared packages
COPY package.json package-lock.json* ./
COPY packages/plugin-core/ ./packages/plugin-core/
COPY packages/tsconfig/ ./packages/tsconfig/
COPY src/ ./src/

# Copy the specific module source code
COPY ${UI_SOURCE_CODE} ./${UI_SOURCE_CODE}

# Install workspace dependencies (creates workspace node_modules)
RUN npm ci --omit=optional

# Set up the specific module
WORKDIR /usr/src/workspace/${UI_SOURCE_CODE}

# Install module dependencies and build
RUN npm ci --omit=optional
RUN npm run build:prod
```

## Build Arguments

Workspace Dockerfiles support parameterization through build arguments:

| Argument | Description | Default |
|----------|-------------|---------|
| `MODULE_NAME` | Name of the module to build | `template` |
| `UI_SOURCE_CODE` | Path to UI source relative to repo root | `./packages/${MODULE_NAME}/upstream/frontend` |
| `BFF_SOURCE_CODE` | Path to BFF source relative to repo root | `./packages/${MODULE_NAME}/upstream/bff` |
| `NODE_BASE_IMAGE` | Base image for Node.js build stage | `registry.access.redhat.com/ubi9/nodejs-20:latest` |
| `GOLANG_BASE_IMAGE` | Base image for Go build stage | `registry.access.redhat.com/ubi9/go-toolset:1.24` |
| `DISTROLESS_BASE_IMAGE` | Base image for final runtime stage | `registry.access.redhat.com/ubi9-minimal:latest` |

## Usage Examples

### Building a Specific Module

```bash
# (Build from repository root)
cd ../.. # ensure you're at repo root if you were inside a subfolder

# Build model-registry module
docker build \
  --file ./packages/model-registry/Dockerfile.workspace \
  --tag model-registry:latest \
  .

# Build with custom arguments
docker build \
  --file ./packages/model-registry/Dockerfile.workspace \
  --build-arg MODULE_NAME=model-registry \
  --build-arg DEPLOYMENT_MODE=production \
  --tag model-registry:prod \
  .
```

### Using the Template for New Modules

1. Copy the template Dockerfile:

   ```bash
   cp packages/template/Dockerfile.workspace packages/your-module/
   ```

2. Update the default MODULE_NAME:

   ```dockerfile
   ARG MODULE_NAME=your-module
   ```

3. Build from the repository root:

   ```bash
   docker build --file ./packages/your-module/Dockerfile.workspace --tag your-module:latest .
   ```

## .dockerignore Configuration

Workspace builds require a properly configured `.dockerignore` file in the frontend directory to:

1. **Exclude unnecessary files** - Reduce build context size
2. **Include required packages** - Allow access to shared packages and target module
3. **Optimize build performance** - Skip irrelevant directories

Example `.dockerignore` for workspace builds:

```dockerignore
# Exclude all node_modules except workspace level
**/node_modules
!node_modules

# Exclude build outputs
**/dist
**/build
**/coverage

# Exclude test files
**/__tests__
**/*.test.*
**/*.spec.*

# Exclude other modules' source code (when building specific module)
packages/*/upstream
!packages/plugin-core
!packages/tsconfig
!packages/MODEL_NAME_PLACEHOLDER

# Exclude development files
**/.env.local
**/cypress
**/test-results
```

## Best Practices

### 1. Always Build from Repository Root

```bash
# ✅ Correct - build from repository root
docker build --file ./packages/model-registry/Dockerfile.workspace --tag model-registry .

# ❌ Wrong - build from package directory
cd packages/model-registry
docker build --file ./Dockerfile.workspace --tag model-registry .
```

### 2. Use Parameterized Module Names

```dockerfile
# ✅ Parameterized for reusability
ARG MODULE_NAME=model-registry
ARG UI_SOURCE_CODE=./packages/${MODULE_NAME}/upstream/frontend

# ❌ Hardcoded for single module
COPY ./packages/model-registry/upstream/frontend ./ui-source
```

### 3. Install Workspace Dependencies First

```dockerfile
# ✅ Install workspace deps first, then module deps
RUN npm ci --omit=optional  # at workspace level
WORKDIR /usr/src/workspace/${UI_SOURCE_CODE}
RUN npm ci --omit=optional  # at module level

# ❌ Skip workspace dependency installation
WORKDIR /usr/src/workspace/${UI_SOURCE_CODE}
RUN npm ci --omit=optional  # missing workspace context
```

## Troubleshooting

### Module Not Found Errors

```text
Module not found: Error: Can't resolve '@odh-dashboard/plugin-core'
```

**Solution:** Ensure you're building from the repository root and copying workspace packages:

```dockerfile
COPY packages/plugin-core/ ./packages/plugin-core/
```

### Large Build Context

```text
WARN[0000] Large build context size detected
```

**Solution:** Optimize `.dockerignore` to exclude unnecessary files:

```dockerignore
**/node_modules
!node_modules
**/dist
**/coverage
```

### Wrong Build Directory

```text
Error: COPY failed: file not found in build context
```

**Solution:** Always build from the frontend directory, not the package directory.

## Related Documentation

- [Module Federation](./module-federation.md) - Overview of the Module Federation architecture
- [Development Setup](./dev-setup.md) - Local development environment setup
- [Architecture](./architecture.md) - Overall system architecture
- [Extensibility](./extensibility.md) - How to extend the dashboard with new modules

## Examples in the Codebase

- `packages/model-registry/Dockerfile.workspace` - Production workspace Dockerfile for Model Registry
- `packages/plugin-template/Dockerfile.workspace` - Template for creating new workspace Dockerfiles
- `frontend/.dockerignore` - Optimized dockerignore for legacy frontend builds (module builds now use root context)
