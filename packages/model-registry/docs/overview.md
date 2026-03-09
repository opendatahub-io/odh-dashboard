[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../docs/BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[Model Serving]: ../../model-serving/docs/overview.md
[KServe]: ../../kserve/docs/overview.md

# Model Registry

**Last Updated**: 2026-03-09 | **Template**: package-template v1

## Overview

The Model Registry package provides the UI for browsing, registering, and versioning ML models
within Open Data Hub. It replaces the deprecated `frontend/src/pages/modelRegistry/` and
`frontend/src/pages/modelRegistrySettings/` pages. The package is sourced from the upstream
[kubeflow/model-registry](https://github.com/kubeflow/model-registry) repository and vendored
under `upstream/` via `npm run update-subtree`.

**Package path**: `packages/model-registry/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Standalone | `cd upstream && make dev-start` | `http://localhost:9100` |
| Kubeflow | `cd upstream && make dev-start-kubeflow` | `http://localhost:9100` |
| Federated | `cd upstream && make dev-start-federated` + run main dashboard | `http://localhost:9100` |

**Standalone**: BFF starts on port 4000 with all mock flags enabled; frontend on port 9100 with
`DEPLOYMENT_MODE=standalone` and `STYLE_THEME=mui-theme`. No cluster access is required.

**Kubeflow**: BFF connects to a live cluster. Port-forward the Model Registry service to
`DEV_MODE_MODEL_REGISTRY_PORT` (default 8085) and the catalog to `DEV_MODE_CATALOG_PORT` (8086).

**Federated**: Frontend runs with `DEPLOYMENT_MODE=federated` and `STYLE_THEME=patternfly` on
port 9100. The main ODH Dashboard loads it via Module Federation; the BFF reads the bearer token
from the `x-forwarded-access-token` header (`AUTH_METHOD=user_token`).

## BFF Architecture

The BFF is an **upstream Go server** located at `packages/model-registry/upstream/bff/`. It is
not a locally authored BFF — it is maintained in the kubeflow/model-registry repository and
vendored here.

```text
packages/model-registry/upstream/bff/
├── cmd/
│   └── main.go               # Entry point; accepts all flags and env vars
├── internal/
│   ├── api/                  # HTTP handlers (registered_models, model_versions, artifacts, …)
│   ├── config/               # EnvConfig, deployment mode, auth method structs
│   ├── models/               # Domain models (RegisteredModel, ModelVersion, etc.)
│   ├── repositories/         # Data access: model_registry_client, model_catalog_client, k8s
│   ├── integrations/         # Integration helpers
│   └── redhat/handlers/      # Red Hat–specific handler overrides (registered via init())
├── static/                   # Frontend static assets served in standalone/kubeflow modes
├── go.mod
└── Makefile
```

**Mock flags** accepted by `cmd/main.go` (as CLI flags or env vars):

| Flag | Env var | Effect |
|------|---------|--------|
| `--mock-k8s-client` | `MOCK_K8S_CLIENT` | In-memory Kubernetes mock |
| `--mock-mr-client` | `MOCK_MR_CLIENT` | In-memory Model Registry API mock |
| `--mock-mr-catalog-client` | `MOCK_MR_CATALOG_CLIENT` | In-memory Model Catalog mock |

**Health endpoint**: `GET /healthcheck` — required for contract tests and liveness probes.

## OpenAPI Specification

**Location**: `packages/model-registry/upstream/api/openapi/mod-arch.yaml`

The spec is an OpenAPI 3.0.3 document titled "Model Registry Mod Arch REST API". Key endpoint
groups:

- `GET /healthcheck` — liveness / readiness probe
- `GET /api/v1/namespaces` — list available cluster namespaces
- `GET /api/v1/user` — resolve user identity from request headers
- `/api/v1/model_registry/{mrName}/registered_models` — CRUD for RegisteredModel resources
- `/api/v1/model_registry/{mrName}/model_versions` — CRUD for ModelVersion resources
- `/api/v1/model_registry/{mrName}/model_artifacts` — CRUD for ModelArtifact resources
- `/api/v1/catalog/…` — Model Catalog sources, models, and settings

## Module Federation

**Config file**: `packages/model-registry/upstream/frontend/config/moduleFederation.js`

**Remote entry name**: `modelRegistry`

**Remote entry filename**: `remoteEntry.js`

**Exposed modules**:

- `./extensions` — ODH extension registrations (`src/odh/extensions`)
- `./extension-points` — Extension point type definitions (`src/odh/extension-points`)

**Shared singletons**: `react`, `react-dom`, `react-router`, `react-router-dom`,
`@patternfly/react-core`, `@openshift/dynamic-plugin-sdk`, `@odh-dashboard/plugin-core`.

**Main dashboard registration**: The main dashboard loads this remote at runtime using the
`module-federation` block in `packages/model-registry/package.json`:

```json
{
  "module-federation": {
    "name": "modelRegistry",
    "remoteEntry": "/remoteEntry.js",
    "authorize": true,
    "proxy": [{ "path": "/model-registry/api", "pathRewrite": "/api" }],
    "local": { "host": "localhost", "port": 9100 }
  }
}
```

```bash
# Start in federated mode (also requires main dashboard running)
cd packages/model-registry/upstream
make dev-start-federated
# In repo root (separate terminal):
npm run dev:backend
npm run dev:frontend
```

## Architecture

```text
packages/model-registry/
├── upstream/                        # Vendored from kubeflow/model-registry (clients/ui)
│   ├── api/openapi/mod-arch.yaml    # OpenAPI 3.0.3 specification
│   ├── bff/                         # Go BFF (see BFF Architecture above)
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── app/                 # App entry, routes, contexts, hooks, types
│   │   │   │   └── pages/           # modelRegistry, modelCatalog, settings pages
│   │   │   ├── odh/                 # ODH-specific extensions and extension-points
│   │   │   ├── concepts/            # Domain concept helpers
│   │   │   └── __mocks__/           # Jest mocks for unit tests
│   │   └── config/                  # Webpack + Module Federation config
│   ├── Makefile                     # Top-level dev targets (dev-start, dev-start-federated, …)
│   ├── CONTRIBUTING.md
│   └── docs/
├── contract-tests/                  # Consumer contract test fixtures
├── extensions.ts                    # Re-exports ODH extensions for the main dashboard
├── Dockerfile.workspace             # Workspace-aware Docker build (federated mode)
├── package.json                     # Workspace package; scripts, subtree config, MF config
└── docs/
    └── overview.md                  # This file
```

The BFF proxies all Model Registry REST calls on behalf of the browser. In standalone and
kubeflow modes the BFF also serves compiled frontend assets from `bff/static/`. In federated
mode the webpack dev server (port 9100) serves assets; the main ODH Dashboard backend proxies
`/model-registry/api` to the BFF. Data flow in federated mode:

```text
Browser → ODH Dashboard → /model-registry/api/* → BFF :4000 → Model Registry k8s Service
                                                             → Kubernetes API (namespaces, RBAC)
                                                             → Model Catalog service
```

## Key Concepts

| Term | Definition |
|------|-----------|
| **RegisteredModel** | Top-level entity representing an ML model; holds metadata (name, description, labels). Backed by a Model Registry k8s CRD. |
| **ModelVersion** | A versioned snapshot of a RegisteredModel; contains state (LIVE, ARCHIVED) and links to artifacts. |
| **ModelArtifact** | A storage URI (OCI, S3, URI) associated with a ModelVersion; describes where model weights live. |
| **ModelRegistry** | The server-side service (a k8s `Service` + CRD controller) that stores RegisteredModels, ModelVersions, and ModelArtifacts. Multiple registries can be deployed in one cluster. |
| **Model Catalog** | A curated read-only listing of shareable models from external sources (e.g., `oci://kubeflow.io`). Configured via CatalogSource CRs. |
| **BFF** | The upstream Go Backend-for-Frontend that handles auth, proxies calls to Model Registry services, and serves assets in non-federated modes. |
| **Deployment mode** | One of `standalone`, `kubeflow`, or `federated`; controls auth strategy, CORS, UI theme, and asset-serving behaviour. |
| **upstream/** | The vendored subtree from `kubeflow/model-registry` (`clients/ui`). Update with `npm run update-subtree`. |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- Go >= 1.24
- `make`
- Access to an OpenShift/Kubernetes cluster (optional — mocked locally via `--mock-*` flags)

### Environment setup

```bash
# Install upstream frontend dependencies
cd packages/model-registry
npm run install:module
```

### Start in standalone mode (fully mocked — no cluster required)

```bash
cd packages/model-registry/upstream
make dev-start
# BFF:      http://localhost:4000  (mocked k8s + model registry + catalog)
# Frontend: http://localhost:9100
```

### Start in federated mode (ODH integration)

```bash
# Terminal 1 — model-registry federated BFF + frontend
cd packages/model-registry/upstream
make dev-start-federated

# Terminal 2 — main ODH backend
npm run dev:backend   # from repo root

# Terminal 3 — main ODH frontend
npm run dev:frontend  # from repo root
# Open http://localhost:4010
```

For kubeflow mode, port-forward the Model Registry and Model Catalog services first:

```bash
kubectl port-forward svc/<model-registry-svc> 8085:8080 -n <namespace>
kubectl port-forward svc/model-catalog       8086:8443 -n <namespace>
cd packages/model-registry/upstream
make dev-start-kubeflow
```

### Docker build (federated, workspace-aware)

```bash
# Run from repo root — workspace dependencies are required
docker build \
  --file ./packages/model-registry/Dockerfile.workspace \
  --tag model-registry:latest .
```

## Environment Variables

All variables are read by the BFF at startup. The upstream Makefile passes them as CLI flags.

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `PORT` | BFF HTTP listen port | `8080` | No |
| `DEPLOYMENT_MODE` | `standalone`, `kubeflow`, or `federated` | `kubeflow` | No |
| `DEV_MODE` | Enable dev-mode cluster access (local kubeconfig) | `false` | No |
| `DEV_MODE_MODEL_REGISTRY_PORT` | Port for local Model Registry service in dev mode | `8080` | No |
| `DEV_MODE_CATALOG_PORT` | Port for local Model Catalog service in dev mode | `8081` | No |
| `MOCK_K8S_CLIENT` | Use in-memory Kubernetes mock | `false` | No |
| `MOCK_MR_CLIENT` | Use in-memory Model Registry mock | `false` | No |
| `MOCK_MR_CATALOG_CLIENT` | Use in-memory Model Catalog mock | `false` | No |
| `AUTH_METHOD` | `internal` (service account) or `user_token` (forwarded token) | `internal` | No |
| `AUTH_TOKEN_HEADER` | Header from which to extract the bearer token | `Authorization` | No |
| `AUTH_TOKEN_PREFIX` | Prefix stripped from the token header value | `Bearer ` | No |
| `INSECURE_SKIP_VERIFY` | Skip TLS verification for outbound calls (dev only) | `false` | No |
| `ALLOWED_ORIGINS` | CORS allowed origins (comma-separated or `*`) | `""` | No |
| `LOG_LEVEL` | BFF log level: `error`, `warn`, `info`, `debug` | `INFO` | No |
| `BUNDLE_PATHS` | Comma-separated PEM CA bundle paths for outbound TLS | `""` | No |

Frontend-only variables (set by Makefile, read by webpack/dotenv):

| Variable | Description | Default |
|----------|-------------|---------|
| `DEPLOYMENT_MODE` | Controls UI theme and auth flow | `standalone` |
| `STYLE_THEME` | `mui-theme` (standalone/kubeflow) or `patternfly` (federated) | `mui-theme` |
| `PORT` | Webpack dev server port | `9100` |

## Testing

### Contract tests

Contract tests validate the frontend's HTTP expectations against the BFF's OpenAPI schema using
the `@odh-dashboard/contract-tests` framework.

```bash
cd packages/model-registry
npm run test:contract
# Equivalent: odh-ct-bff-consumer --bff-dir upstream/bff
```

### BFF unit tests (Go)

```bash
cd packages/model-registry/upstream/bff
make test
```

### Frontend unit tests

```bash
npx turbo run test:unit --filter=@odh-dashboard/model-registry
# Or directly:
cd packages/model-registry/upstream/frontend
npm test
```

### Cypress end-to-end tests

```bash
# Build the federated frontend for Cypress
cd packages/model-registry
npm run cypress:server:build

# Serve and run (separate terminals)
npm run cypress:server
# Then in repo root:
npm run test:cypress-ci -- --spec "**/modelRegistry/**"
```

> **Note**: CI e2e tags (`@ModelRegistryCI`) are pending enablement. See the `// #e2eCiTags`
> comment in `packages/model-registry/package.json` for the backlog item.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard (frontend) | Host application | Loads `modelRegistry` remote via Module Federation in federated mode; proxies `/model-registry/api` to the BFF |
| Main ODH Dashboard (backend) | Auth gateway | Injects auth headers; the BFF reads `x-forwarded-access-token` in federated mode |
| `packages/model-serving` | Package | "Deploy model version" action navigates to model-serving to register an inference service |
| `packages/kserve` | Package | KServe inference service linking; model version deployment targets a KServe runtime |
| Model Registry k8s Service | Kubernetes | BFF proxies CRUD calls for RegisteredModel, ModelVersion, ModelArtifact to the in-cluster service |
| Kubernetes API | Kubernetes | BFF performs namespace listing and RBAC checks (SSAR) for registry access control |
| Model Catalog service | External service | BFF proxies catalog source, model listing, and settings endpoints; port-forwarded locally |
| `kubeflow/model-registry` upstream | Subtree source | `upstream/` is vendored from `clients/ui` in the upstream repo; update via `npm run update-subtree` |

## Known Issues / Gotchas

- **Upstream vendoring**: `upstream/` must not be edited directly for bug fixes intended to land
  in kubeflow/model-registry. Contribute upstream first, then re-vendor with `npm run update-subtree`.
- **Deprecated frontend pages**: `frontend/src/pages/modelRegistry/` and
  `frontend/src/pages/modelRegistrySettings/` in the main dashboard are deprecated. All active
  development happens in this package. Do not add features to the deprecated pages.
- **Style theme**: Standalone and kubeflow modes use `STYLE_THEME=mui-theme` (Material UI).
  Federated mode uses `STYLE_THEME=patternfly`. Mixing themes causes visual regressions.
- **`npm run start:dev:ext`**: Do not use this command for the main ODH frontend when testing
  federated integration — it bypasses the module federation proxy setup.
- **Docker build context**: `Dockerfile.workspace` requires the build context to be the repo
  root (not the package directory) because it copies workspace-level shared packages.
- **Deprecated BFF flags**: `--standalone-mode` and `--federated-platform` boolean flags still
  work but are superseded by `--deployment-mode`. Prefer `--deployment-mode=standalone` etc.
- **CI e2e tests**: Cypress e2e tests for model registry are not yet tagged for CI runs. Mock
  tests run in CI; full e2e requires a live cluster with a Model Registry service deployed.

## Related Docs

- [Guidelines] — documentation style guide for all packages
- [Module Federation Docs] — how Module Federation works in this monorepo
- [Backend Overview] — main ODH Dashboard backend reference
- [Model Serving] — `packages/model-serving` (deploy model versions to runtimes)
- [KServe] — `packages/kserve` (KServe inference service integration)
- [BOOKMARKS] — full doc index
