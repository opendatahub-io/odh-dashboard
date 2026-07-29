# BFF E2E Testing Guide

This guide explains how E2E tests run against the full local stack (backend + BFFs) in CI and locally.

## Overview

The E2E test pipeline uses a "build-then-serve" model:

1. **Shared build**: The Test workflow builds all frontends to `public-cypress/` and caches them
2. **Artifact download**: The E2E workflow's `build-cypress` job checks the cache; on a hit it uploads directly, on a miss it rebuilds. The `e2e-tests` job downloads the `cypress-build` artifact.
3. **Local stack**: Backend + all BFFs start via `turbo run cypress:server:e2e`, serving pre-built static files
4. **E2E Proxy**: A lightweight reverse proxy on `:4040` sits in front of the stack, injecting auth headers and routing requests to the backend, BFFs, or cluster
5. **Cypress**: Tests hit `http://localhost:4040` (proxy), which forwards to the local stack

No webpack dev servers are used in CI. BFFs serve both their API routes and static frontend files via `STATIC_ASSETS_DIR`.

## Architecture

```text
                            ┌─────────────────────────────┐
                            │         Cypress             │
                            │   http://localhost:4040     │
                            └─────────────┬───────────────┘
                                          │
                            ┌─────────────▼───────────────┐
                            │   E2E Proxy :4040           │
                            │   - POST/GET /e2e-login     │
                            │   - routes /api/service/*   │
                            │     to cluster              │
                            │     (Authorization: Bearer) │
                            │   - routes non-odh-dashboard│
                            │     MF proxies to cluster   │
                            │   - everything else to      │
                            │     backend :4000           │
                            │     (x-forwarded-access-    │
                            │      token)                 │
                            └───┬─────────────────┬───────┘
                                │                 │
               ┌────────────────┘                 └─────────────────┐
               ▼                                                    ▼
    ┌──────────────────────────────┐                   ┌───────────────────┐
    │   Node Backend :4000         │                   │   Live Cluster    │
    │   - serves frontend/         │                   │   (/api/service)  │
    │     public-cypress/          │                   └───────────────────┘
    │   - proxies /_mf/* to BFFs   │
    │   - proxies /api/* routes    │
    └───┬──────┬──────┬────────────┘
        │      │      │
        ▼      ▼      ▼
    ┌──────┐┌──────┐┌──────┐
    │:9102 ││:9104 ││ ...  │  BFFs (STATIC_ASSETS_DIR)
    └──────┘└──────┘└──────┘
```

## How It Works in CI

1. Test workflow builds and caches `**/public-cypress` (keyed by commit SHA)
2. E2E workflow restores cache → runs `npm run prepare:e2e` (go mod download) → starts `npm run start:e2e` (turbo starts backend + all BFFs + proxy)
3. Backend serves `frontend/public-cypress/` on port 4000, injects `mfRemotesJson` at request time
4. Backend proxies `/_mf/{name}/*` to each BFF's `module-federation.local.port`
5. BFFs serve their `public-cypress/` via `STATIC_ASSETS_DIR` flag
6. E2E Proxy on `:4040` injects auth headers per target: `x-forwarded-access-token` for the local backend, `Authorization: Bearer` for cluster-bound requests
7. Cypress hits `http://localhost:4040` with `CYPRESS_E2E_PROXY=true`

## Token Handling

The E2E proxy handles all authentication. See [`packages/cypress/src/e2e-proxy/README.md`](../packages/cypress/src/e2e-proxy/README.md) for full details on endpoints, routing, and auth header injection.

Key points:
- The proxy seeds a token on startup from the current `oc` session
- Cypress calls `POST /e2e-login` on the proxy to switch users (isolated kubeconfig — does NOT affect `~/.kube/config`)
- Auth headers differ by target: `x-forwarded-access-token` for the local backend, `Authorization: Bearer` for cluster-bound requests

## Running E2E Locally (Build-Then-Serve)

```bash
# 1. Login to cluster
oc login -u admin -p password --server=https://your-cluster

# 2. Build all frontends (skip if already cached)
npm run cypress:server:build

# 3. Prepare BFF dependencies (go mod download)
npm run prepare:e2e

# 4. Start the full local stack + run tests
npm run test:cypress:e2e
```

`test:cypress:e2e` starts the stack, waits for readiness, runs Cypress, and kills everything when done. It supports passthrough args:

```bash
# Filter by tags
npm run test:cypress:e2e -- --env grepTags="@Pipelines",grepFilterSpecs=true

# Run specific spec
npm run test:cypress:e2e -- --spec "**/pipelines/*.cy.ts"
```

Or step-by-step:

```bash
# Start backend + BFFs + proxy
turbo run cypress:server:e2e --concurrency=20 &

# Wait for all E2E services to be ready
turbo run cypress:server:e2e:wait

# Run Cypress (E2E_PROXY implies baseUrl=http://localhost:4040 and /e2e-login auth)
cd frontend
CYPRESS_E2E_PROXY=true npm run cypress:run:chrome -- \
  --env grepTags="@ci-dashboard-regression-tags",grepFilterSpecs=true

# Or interactive mode
CYPRESS_E2E_PROXY=true npm run cypress:open
```

## Adding E2E Support to a New BFF Package

### Step 1: Add scripts to package.json

```json
{
  "scripts": {
    "prepare:e2e": "cd bff && go mod download",
    "start:e2e": "STATIC_ASSETS_DIR=../frontend/public-cypress make dev-bff-e2e-cluster E2E_BFF_PORT=<MF_LOCAL_PORT>",
    "start:e2e:wait": "wait-on -i 1000 http-get://localhost:<MF_LOCAL_PORT>/healthcheck"
  }
}
```

Replace `<MF_LOCAL_PORT>` with the `module-federation.local.port` value from your package.json.

### Step 2: Ensure Makefile has `dev-bff-e2e-cluster` target

```makefile
E2E_BFF_PORT ?= <DEFAULT_PORT>

.PHONY: dev-bff-e2e-cluster
dev-bff-e2e-cluster:
	cd bff && make run PORT=$(E2E_BFF_PORT) LOG_LEVEL=info \
		AUTH_METHOD=user_token \
		AUTH_TOKEN_HEADER=Authorization \
		AUTH_TOKEN_PREFIX="Bearer "
```

### Step 3: Add e2eCiTags

```json
{
  "e2eCiTags": ["@YourPackageCI"]
}
```

### Step 4: Verify BFF supports STATIC_ASSETS_DIR

The BFF's inner `bff/Makefile` should have `STATIC_ASSETS_DIR ?= ./static` and the Go code should serve from that directory.

## Port Mapping

BFFs listen on their `module-federation.local.port` so the backend proxy can reach them:

| Package | E2E BFF Port | Health Endpoint |
|---------|-------------|-----------------|
| gen-ai | 9102 | /healthcheck |
| maas | 9104 | /healthcheck |
| model-registry | 9100 | /healthcheck |
| autorag | 9107 | /healthcheck |
| eval-hub | 9106 | /healthcheck |
| automl | 9108 | /healthcheck |
| mlflow | 9110 | /healthcheck |
| agent-ops | 9111 | /healthcheck |
| core-bff | 9112 | /healthcheck |

## Turbo Task Definitions

The following tasks are defined in `turbo.jsonc`:

```jsonc
"prepare:e2e": { "cache": false },
"start:e2e": { "cache": false, "persistent": true },
"start:e2e:wait": { "cache": false }
```

`turbo run start:e2e` discovers and starts only workspaces that define the script (backend + BFF packages + cypress proxy).

## Troubleshooting

### BFF Health Check Fails

1. Check if BFF port matches `module-federation.local.port` in package.json
2. Ensure `go mod download` completed (run `npm run prepare:e2e`)
3. Check BFF logs in the turbo output

### Module Not Loading

1. Verify `public-cypress/` exists (run `npm run cypress:server:build`)
2. Check that `STATIC_ASSETS_DIR` path resolves correctly (relative to `bff/` directory)
3. Verify backend proxy routes are configured in `module-federation` config

### Token Issues

1. Ensure `oc login` succeeded before running tests (proxy seeds token on startup)
2. Verify `CYPRESS_E2E_PROXY=true` is set
3. Check proxy logs for `[e2e-proxy] Logged in as <user>` after `/e2e-login` call
4. Ensure `OCP_API_URL` is set in your `test-variables.yml`

### Proxy Returns 502 Bad Gateway

1. Verify the backend is running on `:4000` (check `npm run start:e2e` output)
2. Check that `BACKEND_PORT` env var matches if you customized it
3. For cluster-bound routes, verify `ODH_DASHBOARD_URL` in `test-variables.yml` is reachable
