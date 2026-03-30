[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[AutoRAG Overview]: ../../autorag/docs/overview.md
[Install Guide]: install.md
[Local Deployment Guide]: local-deployment-guide.md
[Local Deployment Guide (UI)]: local-deployment-guide-ui.md
[Kubeflow Development Guide]: kubeflow-development-guide.md

# AutoML

**Last Updated**: 2026-03-30 | **Template**: package-template v1

## Overview

AutoML provides automated ML pipeline optimization for OpenShift AI, enabling data scientists
to discover optimal model configurations without manual parameter tuning. It orchestrates
experiments through Kubeflow Pipelines using the AutoGluon library, evaluates configurations
against test datasets, and produces deployable model artifacts. The package is early-stage with
functional BFF infrastructure and placeholder frontend UI.

**Package path**: `packages/automl/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Standalone | `make dev-start` | `http://localhost:9108` |
| Kubeflow | `make dev-start-kubeflow` | `http://localhost:9108` |
| Federated | `make dev-start-federated` + run main dashboard | `http://localhost:4010` |

Standalone mode runs the BFF and frontend together with mocked clients — use it for most local
development. Kubeflow mode targets integration with the Kubeflow Dashboard and applies a
Material UI theme. Federated mode loads AutoML as a micro-frontend inside the main ODH
Dashboard; you must also run `npm run dev` from the repo root.

## BFF Architecture

```text
packages/automl/bff/
├── cmd/main.go           # Entry point; accepts mock flags
├── internal/
│   ├── api/              # HTTP handlers
│   ├── models/           # Domain models
│   └── repositories/     # Data access (k8s, Kubeflow Pipelines)
├── go.mod
└── Makefile
```

**Mock flags** accepted by `cmd/main.go`:

- `--mock-k8s-client` — use in-memory mock for Kubernetes
- `--mock-http-client` — use in-memory mock for HTTP (Kubeflow Pipelines) calls

**Health endpoint**: `GET /healthcheck` — required for contract tests.

Start the BFF alone in mocked mode:

```bash
cd packages/automl/bff
make run
```

Start without mocks (requires cluster access):

```bash
cd packages/automl/bff
make run PORT=4003 MOCK_K8S_CLIENT=false MOCK_HTTP_CLIENT=false DEV_MODE=true DEPLOYMENT_MODE=standalone
```

## OpenAPI Specification

**Location**: `packages/automl/api/openapi/automl.yaml`

The spec is OpenAPI 3.0 and is the contract between the React frontend and the Go BFF. Key
endpoint groups are added as AutoML run management and results retrieval features are
implemented. Validate frontend HTTP calls against this spec using the contract test framework.

## Module Federation

**Config file**: `packages/automl/frontend/config/webpack.common.js`

**Remote entry name**: `automl`

**Exposed modules**:

- `./AutoMLApp` — root application component loaded by the main ODH Dashboard in federated mode

**Main dashboard registration**: `frontend/src/app/` (extension registration file TBD as
feature matures).

```bash
# Start in federated mode (main dashboard must also be running)
cd packages/automl
make dev-start-federated
# In repo root:
npm run dev
# Access AutoML via the ODH Dashboard side navigation at http://localhost:4010
```

## Architecture

```text
packages/automl/
├── api/openapi/
│   └── automl.yaml           # OpenAPI 3.0 specification
├── bff/                      # Go BFF
│   ├── cmd/main.go
│   ├── internal/
│   └── Makefile
├── frontend/
│   ├── src/
│   │   ├── app/              # App entry, routes, extensions
│   │   ├── components/       # Package-specific UI components
│   │   ├── pages/            # Page-level components
│   │   └── api/              # Frontend API calls to BFF
│   └── config/               # Webpack / Module Federation config
├── docs/                    # See Package Documentation below
├── Dockerfile
├── Makefile
└── package.json
```

The Go BFF is the single ingress for all AutoML traffic. It authenticates requests via the
cluster auth chain, proxies experiment orchestration calls to Kubeflow Pipelines, and serves
the compiled React frontend assets in standalone and kubeflow modes. In federated mode the
BFF serves only API routes; the main ODH Dashboard hosts the frontend assets via Module
Federation.

Data flow: React frontend → BFF (`/api/v1/...`) → Kubeflow Pipelines API (experiment
orchestration) or Kubernetes API (resource management) → response back to frontend.

## Key Concepts

| Term | Definition |
|------|-----------|
| **AutoML run** | A single optimization campaign: a set of Kubeflow Pipeline experiments exploring parameter combinations for a given dataset. |
| **AutoGluon** | The underlying ML library that performs automated model selection and hyperparameter search within each pipeline run. |
| **Optimal configuration** | The parameter set that produced the best evaluation metric across all runs in a campaign; the candidate for model registration. |
| **BFF** | Go Backend-for-Frontend — authenticates requests, proxies cluster APIs, and serves static assets. |
| **Deployment mode** | One of `standalone`, `kubeflow`, or `federated`; controls UI theme, asset serving strategy, and integration points. |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- Go >= 1.24
- Docker or Podman (optional, for containerized runs)
- OpenShift / Kubernetes cluster access (optional — mocked by default)

### Environment setup

```bash
cp packages/automl/.env.local.example packages/automl/.env.local
# Edit .env.local with cluster details if running without mocks
```

### Start in standalone mode (recommended for development)

```bash
cd packages/automl
make dev-start
# Frontend: http://localhost:9108  BFF: http://localhost:4003
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `PORT` | BFF HTTP port | `4003` | No |
| `DEPLOYMENT_MODE` | `standalone`, `kubeflow`, or `federated` | `standalone` | No |
| `DEV_MODE` | Enable development features | `false` | No |
| `MOCK_K8S_CLIENT` | Use in-memory Kubernetes mock | `false` | No |
| `MOCK_HTTP_CLIENT` | Use in-memory HTTP mock | `false` | No |
| `STATIC_ASSETS_DIR` | Directory for compiled frontend assets | `./static` | No |
| `LOG_LEVEL` | Logging verbosity (`ERROR`, `WARN`, `INFO`, `DEBUG`) | `INFO` | No |

Full variable list: `packages/automl/.env.local.example`.

## Testing

### Contract tests

```bash
cd packages/automl
npm run test:contract
```

Validates frontend HTTP expectations against `api/openapi/automl.yaml` using the
`@odh-dashboard/contract-tests` framework.

### Frontend unit tests

```bash
npx turbo run test:unit --filter=@odh-dashboard/automl
```

### Cypress tests

```bash
npm run test:cypress-ci -- --spec "**/automl/**"
```

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Kubeflow Pipelines | External API | BFF proxies experiment creation, run monitoring, and artifact retrieval |
| Main ODH Dashboard | Host application | Loads AutoML via Module Federation in federated mode; provides auth context |
| model-registry | Package | BFF registers optimal model configurations after a successful AutoML campaign |

## Known Issues / Gotchas

- The React frontend is currently a placeholder. Most UI pages are scaffolded but not yet
  functional; the BFF and OpenAPI contract are ahead of the frontend implementation.
- Kubeflow mode uses Material UI instead of PatternFly v6. Do not import PF components
  expecting them to render correctly in kubeflow mode without theme-guarding them.
- `MOCK_HTTP_CLIENT=true` is required for local development without a live Kubeflow Pipelines
  endpoint; omitting it will cause BFF startup errors if the endpoint is unreachable.
- Docker deployment is not yet documented. Use `make dev-start` for all local workflows.

## Package Documentation

- [Install Guide] — installation and cluster prerequisites
- [Local Deployment Guide] — detailed local development and cluster setup
- [Local Deployment Guide (UI)] — UI-focused local deployment walkthrough
- [Kubeflow Development Guide] — kubeflow-mode development environment setup

## Related Docs

- [Guidelines] — documentation style guide for this repository
- [Module Federation Docs] — how Module Federation works in this monorepo
- [Backend Overview] — main ODH Dashboard backend reference
- [AutoRAG Overview] — sibling package with an identical BFF pattern
- [BOOKMARKS] — full doc index
