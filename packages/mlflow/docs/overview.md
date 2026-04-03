[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[MaaS Overview]: ../../maas/docs/overview.md
[Model Registry Overview]: ../../model-registry/docs/overview.md
# MLflow

**Last Updated**: 2026-03-30 | **Template**: package-template v1

## Overview

The MLflow package integrates MLflow experiment tracking into ODH Dashboard, letting data
scientists browse experiments, inspect and compare runs, and view artifacts without leaving
the dashboard. The package includes a minimal Go BFF that handles auth (user identity via
`/api/v1/user`), namespace resolution (`/api/v1/namespaces`), and static asset serving; all
MLflow experiment data is fetched by proxying through the dashboard backend to an external
MLflow server. The package ships as a Module Federation remote.

**Package path**: `packages/mlflow/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Standalone | `make dev-start` | `http://localhost:4000` |
| Federated | `make dev-start-federated` + run main dashboard | `http://localhost:9110` |

- **Standalone**: BFF starts on port 4000 with `--mock-k8s-client` and `--mock-http-client`
  enabled; uses Material UI theme. Provides auth and namespace endpoints for local iteration.
- **Federated**: BFF starts on port 4020 with `AUTH_METHOD=user_token`; frontend starts on
  port 9110 with PatternFly theme. The main ODH Dashboard must be running concurrently.

> **Note**: MLflow does not have a kubeflow deployment mode. The two supported modes are
> `standalone` and `federated`.

## BFF Architecture

The MLflow package includes a Go BFF, but it serves only infrastructure concerns — auth,
namespace resolution, and asset serving — not MLflow domain data. MLflow experiment and run
data is fetched by the frontend directly via the dashboard backend proxy to the external
MLflow server.

```text
packages/mlflow/bff/
├── cmd/main.go                          # Entry point; accepts flag/env config
├── internal/
│   ├── api/                             # HTTP handlers
│   │   ├── healthcheck_handler.go       # Liveness probe
│   │   ├── namespaces_handler.go        # Namespace enumeration
│   │   ├── user_handler.go              # Current-user resolution
│   │   └── extensions.go               # Extension registration helpers
│   ├── config/environment.go            # EnvConfig struct
│   ├── integrations/kubernetes/         # k8s client (internal + token-based)
│   └── repositories/                    # Namespace and user data access
└── Makefile
```

**Mock flags** accepted by `cmd/main.go`:
- `--mock-k8s-client` — use in-memory Kubernetes mock (no cluster required)
- `--mock-http-client` — use canned HTTP responses

**Health endpoint**: `GET /healthcheck` — required for liveness probes and contract tests.

## OpenAPI Specification

**Location**: `packages/mlflow/api/openapi/mlflow.yaml`

Key endpoint groups:

| Endpoint group | Description |
|---------------|-------------|
| `GET /healthcheck` | Liveness probe; no auth required |
| `GET /api/v1/namespaces` | List namespaces accessible to the user |
| `GET /api/v1/user` | Resolve current authenticated user |

MLflow domain endpoints (experiments, runs, metrics, artifacts) are not defined here — they
are served by the external MLflow server and accessed via the dashboard backend proxy.

## Module Federation

**Config file**: `packages/mlflow/frontend/config/moduleFederation.js`

**Remote entry name**: `mlflow`

**Exposed modules**:
- `./extensions` — ODH extension registrations (routes, nav items) loaded by the host at runtime
- `./extension-points` — Extension point contracts consumed by the host dashboard

**Main dashboard registration**: the host reads `remoteEntry.js` from the MLflow remote and
mounts the experiment-browsing pages into the dashboard shell navigation.

```bash
# Start in federated mode (requires main dashboard running separately)
cd packages/mlflow
make dev-start-federated
# In repo root:
npm run dev
```

## Architecture

```text
packages/mlflow/
├── api/openapi/mlflow.yaml        # OpenAPI spec (infrastructure endpoints only)
├── bff/                           # Go BFF — auth, namespaces, asset serving
├── frontend/
│   ├── src/
│   │   ├── odh/                   # extensions.ts and extension-points.ts
│   │   ├── app/                   # App entry, routing
│   │   ├── components/            # Shared UI components
│   │   ├── pages/                 # Experiments, Runs, Metrics, Artifacts pages
│   │   └── api/                   # Frontend calls: proxy → external MLflow server
│   ├── config/
│   │   ├── moduleFederation.js    # Module Federation plugin config
│   │   ├── webpack.common.js      # Common Webpack config
│   │   └── webpack.dev.js / webpack.prod.js
│   └── docs/                      # Frontend-specific architecture and env docs
├── docs/                          # See Package Documentation below
├── Dockerfile
├── Makefile
└── README.md
```

The frontend uses PatternFly in federated mode and Material UI in standalone mode, selected
via `STYLE_THEME` at build time. All MLflow data requests go through the ODH Dashboard
backend proxy rather than directly to the MLflow server, preserving consistent auth handling.

## Key Concepts

| Term | Definition |
|------|-----------|
| **MLflowExperiment** | A named collection of MLflow runs; top-level grouping unit in MLflow |
| **MLflowRun** | A single execution of a training or evaluation script, capturing params, metrics, and artifacts |
| **Metric** | A scalar value (e.g., accuracy, loss) logged per step during a run |
| **Artifact** | A file or directory (model weights, plots, datasets) logged by a run |
| **Tag** | A key-value label attached to an experiment or run for filtering and search |
| **Dashboard backend proxy** | The main ODH Dashboard Node.js backend that forwards authenticated requests to the external MLflow server |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- Go >= 1.24
- An external MLflow server reachable from the dashboard backend (optional for mocked dev)

### Environment setup

```bash
cp packages/mlflow/.env.local.example packages/mlflow/.env.local
# Edit .env.local: set MLFLOW_URL if connecting to a real MLflow server
```

### Start in standalone mode (recommended for development)

```bash
cd packages/mlflow
make dev-start
# BFF:      http://localhost:4000  (mock k8s + mock HTTP)
# Frontend: http://localhost:4000
```

### Start in federated mode

```bash
cd packages/mlflow
make dev-start-federated
# BFF:      http://localhost:4020  (user_token auth, live cluster)
# Frontend: http://localhost:9110
# Also run the main dashboard: cd <repo-root> && npm run dev
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `PORT` | BFF HTTP port | `4000` | No |
| `DEPLOYMENT_MODE` | `standalone` or `federated` | `standalone` | No |
| `STYLE_THEME` | UI theme: `mui-theme` or `patternfly-theme` | `mui-theme` | No |
| `AUTH_METHOD` | `internal` (service account) or `user_token` (forwarded token) | `internal` | No |
| `AUTH_TOKEN_HEADER` | Header carrying the user token in `user_token` mode | `Authorization` | No |
| `AUTH_TOKEN_PREFIX` | Prefix stripped from the token header value | `Bearer` | No |
| `DEV_MODE` | Enable development mode (local kubeconfig) | `false` | No |
| `DEV_MODE_CLIENT_PORT` | Frontend client port the BFF proxies to in dev mode (set to `8085` by federated Makefile target) | `8080` | No |
| `MOCK_K8S_CLIENT` | Use in-memory Kubernetes mock | `false` | No |
| `INSECURE_SKIP_VERIFY` | Skip TLS verification for outbound calls (dev only) | `false` | No |
| `LOG_LEVEL` | BFF log level: `error`, `warn`, `info`, `debug` | `INFO` | No |

Full list in `packages/mlflow/.env.local.example`.

## Testing

### BFF unit tests

```bash
cd packages/mlflow/bff
make test
```

### Frontend unit tests

```bash
cd packages/mlflow/frontend && npm run test:unit
```

### Cypress tests

```bash
npm run test:cypress-ci -- --spec "**/mlflow/**"
```

Contract tests follow the `@odh-dashboard/contract-tests` framework. Start the BFF with
`--mock-k8s-client --mock-http-client`, then run `npm run test:contract` from
`packages/mlflow/`.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| External MLflow server | HTTP (via proxy) | All experiment and run data is fetched through the ODH Dashboard backend proxy to the MLflow REST API |
| `packages/model-registry` | Package | Users can register the best run from an experiment directly as a versioned model in Model Registry |
| Main ODH Dashboard | Host application | Loads this package via Module Federation in federated mode; provides the backend proxy for MLflow API calls |

## Known Issues / Gotchas

- The MLflow package supports two deployment modes: `standalone` and `federated`.
  The Makefile provides `dev-start` (standalone) and `dev-start-federated` targets.
- MLflow domain data (experiments, runs) bypasses the BFF entirely and flows through the
  main dashboard backend proxy. The OpenAPI spec covers only infrastructure endpoints.
- `STYLE_THEME=mui-theme` is the default even for standalone mode; set it explicitly to
  `patternfly-theme` if you need PatternFly styling outside federated mode.
- The `api/openapi/mlflow.yaml` spec describes only the BFF scaffold endpoints, not the full
  MLflow REST API. Refer to upstream MLflow docs for the complete API surface.

## Related Docs

- [Guidelines] — documentation style guide
- [Module Federation Docs] — how Module Federation works in this monorepo
- [Backend Overview] — main dashboard backend reference (provides the MLflow proxy)
- [MaaS Overview] — sibling package using the same BFF scaffold
- [Model Registry Overview] — register MLflow runs as versioned models
- [BOOKMARKS] — full doc index
