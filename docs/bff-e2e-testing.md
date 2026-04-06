# BFF E2E Testing Guide

This guide explains how to configure Backend-For-Frontend (BFF) packages for E2E testing in the GitHub Actions CI pipeline.

## Overview

The ODH Dashboard monorepo supports modular architecture packages that have both frontend and BFF components. The E2E test pipeline can automatically detect and start BFF services when changes are made to these packages.

## How It Works

1. **Change Detection**: When a PR is submitted, Turbo detects which packages have changed
2. **BFF Detection**: For each changed package, the workflow checks if `bffConfig.enabled=true` in package.json
3. **BFF Startup**: Detected BFFs are started in the background before E2E tests run
4. **Health Checks**: Each BFF must pass a health check before tests proceed
5. **Cleanup**: BFF processes are automatically stopped after tests complete

## Adding BFF Support to a Package

### Step 1: Add bffConfig to package.json

Add the `bffConfig` object to your package's `package.json`:

```json
{
  "name": "@odh-dashboard/your-package",
  "e2eCiTags": ["@YourPackageCI"],
  "bffConfig": {
    "enabled": true,
    "port": 9102,
    "healthEndpoint": "/healthcheck",
    "startCommand": "make dev-bff-e2e-mock",
    "startCommandCluster": "make dev-bff-e2e-cluster"
  }
}
```

**Configuration Options:**

| Field | Required | Description |
|-------|----------|-------------|
| `enabled` | Yes | Set to `true` to enable BFF auto-start |
| `port` | Yes | Port the BFF listens on (must be unique per package) |
| `healthEndpoint` | Yes | Endpoint to check BFF readiness (e.g., `/healthcheck`) |
| `startCommand` | Yes | Command to start BFF in mock mode (no cluster required) |
| `startCommandCluster` | Yes | Command to start BFF connected to cluster |

### Step 2: Add Makefile Targets

Add standardized e2e targets to your package's Makefile:

```makefile
############ E2E Test Targets ############
# These targets are used by the GitHub Actions e2e workflow to start BFFs
# Port is configurable via E2E_BFF_PORT environment variable for parallel runner support

E2E_BFF_PORT ?= 9102

.PHONY: dev-bff-e2e-mock
dev-bff-e2e-mock: ## Run BFF for e2e tests (mock mode, no cluster required)
	cd bff && make run PORT=$(E2E_BFF_PORT) LOG_LEVEL=info \
		MOCK_K8S_CLIENT=true \
		# Add other mock flags as needed

.PHONY: dev-bff-e2e-cluster
dev-bff-e2e-cluster: ## Run BFF for e2e tests (federated mode, connected to cluster)
	cd bff && make run PORT=$(E2E_BFF_PORT) LOG_LEVEL=info \
		MOCK_K8S_CLIENT=false \
		AUTH_METHOD=user_token \
		AUTH_TOKEN_HEADER=x-forwarded-access-token \
		AUTH_TOKEN_PREFIX=""
```

**Important**: Use `E2E_BFF_PORT` environment variable instead of hardcoded ports. This allows the CI pipeline to allocate unique ports for parallel runners.

### Step 3: Add e2eCiTags

Add `e2eCiTags` to your package.json to enable automatic test selection:

```json
{
  "e2eCiTags": ["@YourPackageCI"]
}
```

Then add the corresponding tag to your Cypress test files:

```typescript
describe('Your Feature', { tags: ['@YourPackageCI'] }, () => {
  // tests
});
```

### Step 4: Implement Health Endpoint

Ensure your BFF has a health endpoint that returns HTTP 200 when ready. Example:

```go
// In your BFF router setup
router.GET("/healthcheck", func(c *gin.Context) {
    c.JSON(200, gin.H{"status": "healthy"})
})
```

## Running BFF E2E Tests Locally

### Mock Mode (No Cluster Required)

```bash
# Start BFF in mock mode
cd packages/your-package
make dev-bff-e2e-mock

# In another terminal, start frontend
cd frontend
npm run start:dev

# In another terminal, run tests
npm run cypress:run -- --env grepTags="@YourPackageCI"
```

### Cluster Mode

```bash
# Login to cluster
oc login -u admin -p password --server=https://your-cluster

# Start BFF connected to cluster
cd packages/your-package
make dev-bff-e2e-cluster

# In another terminal, start frontend
cd frontend
npm run start:dev:ext

# In another terminal, run tests
npm run cypress:run -- --env grepTags="@YourPackageCI"
```

## Supported Packages

Currently, the following packages have BFF E2E support: automl, autorag, eval-hub, gen-ai, maas, mlflow, model-registry.

To see current port assignments, run `node scripts/validate-module-ports.js`. The source of truth for each package is `module-federation.local.port` in its `package.json` (frontend port) and `PORT=` in its `Makefile` (BFF port). CI tags are in the `e2eCiTags` field of each package's `package.json`.

## Troubleshooting

### BFF Health Check Fails

1. Check BFF logs: `tail -f /tmp/bff_<package-name>.log`
2. Verify the health endpoint is correct
3. Ensure all dependencies are installed: `cd bff && go mod download`

### Port Conflicts

The CI pipeline uses dynamic port allocation based on the GitHub `run_id`. If you encounter conflicts:

1. The workflow will attempt to find an alternative port
2. Check `/tmp/gha-bff/` for port allocation files
3. Ensure `E2E_BFF_PORT` is used in your Makefile targets

### BFF Not Starting

1. Verify `bffConfig.enabled=true` in package.json
2. Check that `startCommandCluster` command is correct
3. Ensure Go is installed: `go version` (requires Go >= 1.24)

## Architecture

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                           GitHub Actions Runner                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐                                                            │
│  │   Frontend   │    BFF Services (started dynamically based on changes):    │
│  │   Webpack    │    ┌─────────────────────────────────────────────────────┐ │
│  │   :4000+     │    │ automl:4001  autorag:4001  eval-hub:4002            │ │
│  └──────┬───────┘    │ gen-ai:8080  maas:8081     mlflow:4020              │ │
│         │            │ model-registry:4000                                  │ │
│         │            └─────────────────────────────┬───────────────────────┘ │
│         │                                          │                          │
│         └──────────────────┬───────────────────────┘                          │
│                            │                                                  │
│                            ▼                                                  │
│                   ┌────────────────┐                                         │
│                   │  Cypress Tests │                                         │
│                   └────────────────┘                                         │
│                            │                                                  │
└────────────────────────────┼─────────────────────────────────────────────────┘
                             │
                             ▼
                   ┌────────────────┐
                   │  PSI Cluster   │
                   │  (dash-e2e-int │
                   │   or dash-e2e) │
                   └────────────────┘
```
