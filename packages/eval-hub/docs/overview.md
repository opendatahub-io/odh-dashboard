[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../docs/BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[Model Registry Package]: ../../model-registry/docs/overview.md
[Model Serving Package]: ../../model-serving/docs/overview.md
[Install Guide]: install.md
[Local Deployment Guide]: local-deployment-guide.md
[Local Deployment Guide (UI)]: local-deployment-guide-ui.md
[Kubeflow Development Guide]: kubeflow-development-guide.md

# Eval Hub

**Last Updated**: 2026-03-09 | **Template**: package-template v1

## Overview

Eval Hub is the centralized model evaluation UI in the ODH Dashboard. It lets data scientists
create evaluation runs, configure evaluation metrics, view results, and compare model performance
across versions. The package ships a Go BFF and a React/PatternFly v6 frontend.

**Package path**: `packages/eval-hub/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Standalone | `make dev-start` | `http://localhost:9105` |
| Kubeflow | `make dev-start-kubeflow` | `http://localhost:9105` |
| Federated | `make dev-start-federated` + run main dashboard | `http://localhost:4010` |

Standalone mode starts the BFF on port 4002 with all mock clients enabled
(`MOCK_K8S_CLIENT`, `MOCK_HTTP_CLIENT`, `MOCK_EVALHUB_CLIENT`) and the frontend on port 9105.
Kubeflow mode disables mocks and port-forwards the live eval-hub service. Federated mode uses
PatternFly theme and `AUTH_METHOD=user_token`.

## BFF Architecture

```text
packages/eval-hub/bff/
├── cmd/main.go           # Entry point; accepts mock flags
├── internal/
│   ├── api/              # HTTP handlers
│   ├── config/           # Server configuration
│   ├── constants/        # Shared constants
│   ├── helpers/          # Utility helpers
│   ├── integrations/     # External service clients (eval-hub, HTTP)
│   ├── mocks/            # In-memory mock implementations
│   ├── models/           # Domain models
│   └── repositories/     # Data access (k8s, external APIs)
├── openapi/src/          # OpenAPI 3.0 specification
├── go.mod
└── Makefile
```

**Mock flags** accepted by `main.go` (set via Makefile env vars):

- `MOCK_K8S_CLIENT=true` — use in-memory mock for Kubernetes
- `MOCK_HTTP_CLIENT=true` — mock outbound HTTP calls
- `MOCK_EVALHUB_CLIENT=true` — mock the eval-hub service client

**Health endpoint**: `GET /healthcheck` — required for contract tests.

## OpenAPI Specification

**Location**: `packages/eval-hub/bff/openapi/src/eval-hub.yaml`

Key endpoint groups:

- `/api/v1/evaluation-runs` — create, list, and retrieve evaluation runs
- `/api/v1/metrics` — configure and query evaluation metrics
- `/api/v1/benchmarks` — model benchmark results and comparisons

## Module Federation

**Config file**: `packages/eval-hub/frontend/config/moduleFederation.js`

**Remote entry name**: `evalHub`

**Exposed modules**:

- `./extensions` — ODH Dashboard extension registrations for eval-hub pages
- `./extension-points` — extension point type definitions consumed by the main dashboard

**Main dashboard registration**: The main dashboard loads `evalHub@<remote>/remoteEntry.js` at
runtime and mounts the exposed extensions into its routing tree.

```bash
# Start in federated mode (also requires main dashboard running)
cd packages/eval-hub
make dev-start-federated
# Then in repo root:
npm run dev
```

## Architecture

```text
packages/eval-hub/
├── api/                  # Shared API type definitions
├── bff/                  # Go BFF
├── frontend/
│   ├── src/
│   │   ├── app/          # App entry, routes, extensions
│   │   │   ├── api/      # Frontend API calls to BFF
│   │   │   ├── components/
│   │   │   ├── context/
│   │   │   ├── hooks/
│   │   │   ├── pages/    # EvaluationRuns, Metrics, Benchmarks pages
│   │   │   └── utilities/
│   │   └── odh/          # Extension and extension-point definitions
│   └── config/           # Webpack / Module Federation config
├── docs/                # See Package Documentation below
├── scripts/
├── Dockerfile
├── Makefile
└── package.json
```

Data flows from the Kubernetes cluster and the eval-hub service through the Go BFF, which
authenticates requests, applies RBAC, and returns typed JSON to the React frontend. In federated
mode the BFF is deployed separately; the main ODH Dashboard loads the frontend bundle at runtime
via Module Federation and routes `/eval-hub/*` traffic to it.

## Key Concepts

| Term | Definition |
|------|-----------|
| **EvaluationRun** | A single execution of an evaluation pipeline against a specific model version, capturing inputs, outputs, and metric scores. |
| **EvaluationMetric** | A named, configurable measure (e.g. accuracy, F1, BLEU) applied during an EvaluationRun. |
| **ModelBenchmark** | An aggregated view comparing EvaluationRun results across model versions or endpoints. |
| **eval-hub service** | The backend evaluation orchestration service (external to this package) that the BFF proxies. |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- Go >= 1.24
- Access to an OpenShift / Kubernetes cluster (optional — mocks cover local dev)

### Environment setup

```bash
cp packages/eval-hub/.env.local.example packages/eval-hub/.env.local
# Edit .env.local with your cluster details if not using mocks
```

### Start in standalone mode (recommended for development)

```bash
cd packages/eval-hub
make dev-start
# BFF:      http://localhost:4002
# Frontend: http://localhost:9105
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `PORT` | BFF HTTP port | `4002` | No |
| `DEPLOYMENT_MODE` | `standalone`, `kubeflow`, or `federated` | `standalone` | No |
| `DEV_MODE` | Enable development features and verbose logging | `false` | No |
| `MOCK_K8S_CLIENT` | Use in-memory Kubernetes mock | `false` | No |
| `MOCK_HTTP_CLIENT` | Use in-memory HTTP client mock | `false` | No |
| `MOCK_EVALHUB_CLIENT` | Use in-memory eval-hub service mock | `false` | No |
| `EVAL_HUB_URL` | Base URL for the external eval-hub service | — | Yes (non-mock) |
| `EVAL_HUB_NAMESPACE` | Kubernetes namespace for port-forward targets | — | Kubeflow |
| `STYLE_THEME` | UI theme: `mui-theme` or `patternfly-theme` | `mui-theme` | No |

Full list in `packages/eval-hub/.env.local.example`.

## Testing

### Contract Tests

```bash
cd packages/eval-hub
npm run test:contract
```

Validates frontend HTTP expectations against the BFF's OpenAPI schema.
Framework: `@odh-dashboard/contract-tests`.

### Frontend Unit Tests

```bash
npx turbo run test:unit --filter=@odh-dashboard/eval-hub
```

### Cypress Tests

```bash
npm run test:cypress-ci -- --spec "**/eval-hub/**"
```

### BFF Tests

```bash
cd packages/eval-hub/bff
make test
```

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host application | Loads this package via Module Federation in federated mode |
| `packages/model-registry` | Package | Supplies registered model versions for evaluation targeting |
| `packages/model-serving` | Package | Supplies deployed endpoints to evaluate against |
| Kubeflow Pipelines | External service | Orchestrates evaluation pipeline execution |
| eval-hub service | External service | BFF proxies evaluation run CRUD and result retrieval |
| Kubernetes | Cluster API | BFF reads CRDs and RBAC for namespace/user context |

## Known Issues / Gotchas

- Standalone mock mode does not validate `EVAL_HUB_URL`; set it before switching to kubeflow
  or federated mode or the BFF will fail to start.
- The `STYLE_THEME` default is `mui-theme` in standalone/kubeflow; federated mode overrides
  this to `patternfly-theme` automatically via the Makefile.
- Port 4002 is shared with other packages in the monorepo — ensure no other BFF is running
  on the same port before starting eval-hub in standalone mode.

## Package Documentation

- [Install Guide] — installation and cluster prerequisites
- [Local Deployment Guide] — detailed local development and cluster setup
- [Local Deployment Guide (UI)] — UI-focused local deployment walkthrough
- [Kubeflow Development Guide] — kubeflow-mode development environment setup

## Related Docs

- [Guidelines] — documentation style guide
- [Module Federation Docs] — how Module Federation works in this monorepo
- [Backend Overview] — main dashboard backend reference
- [Model Registry Package] — registered model versions consumed by eval-hub
- [Model Serving Package] — deployed endpoints consumed by eval-hub
- [BOOKMARKS] — full doc index
