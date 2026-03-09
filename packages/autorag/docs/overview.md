[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../docs/BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[AutoML Overview]: ../../automl/docs/overview.md
[Local Deployment Guide]: ./local-deployment-guide.md
[Kubeflow Development Guide]: ./kubeflow-development-guide.md

# AutoRAG

**Last Updated**: 2026-03-09 | **Template**: package-template v1

## Overview

AutoRAG provides automated RAG (Retrieval-Augmented Generation) configuration optimization for
OpenShift AI, enabling data scientists to discover optimal RAG pipeline parameters without
manual tuning. It orchestrates experiments through Kubeflow Pipelines using the ai4rag engine,
evaluates parameter combinations against test datasets, and produces deployable RAG Pattern
artifacts. The package is early-stage with functional BFF infrastructure and placeholder
frontend UI.

**Package path**: `packages/autorag/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Standalone | `make dev-start` | `http://localhost:9000` |
| Kubeflow | `make dev-start-kubeflow` | `http://localhost:9000` |
| Federated | `make dev-start-federated` + run main dashboard | `http://localhost:4010` |

Standalone mode runs the BFF and frontend together with mocked clients — use it for most local
development. Kubeflow mode targets integration with the Kubeflow Dashboard and applies a
Material UI theme. Federated mode loads AutoRAG as a micro-frontend inside the main ODH
Dashboard; you must also run `npm run dev` from the repo root.

## BFF Architecture

```text
packages/autorag/bff/
├── cmd/main.go           # Entry point; accepts mock flags
├── internal/
│   ├── api/              # HTTP handlers
│   ├── models/           # Domain models
│   └── repositories/     # Data access (k8s, ai4rag engine)
├── go.mod
└── Makefile
```

**Mock flags** accepted by `cmd/main.go`:

- `--mock-k8s-client` — use in-memory mock for Kubernetes
- `--mock-http-client` — use in-memory mock for HTTP (ai4rag engine) calls

**Health endpoint**: `GET /healthcheck` — required for contract tests.

Start the BFF alone in mocked mode:

```bash
cd packages/autorag/bff
make run
```

Start without mocks (requires cluster access):

```bash
cd packages/autorag/bff
make run PORT=4000 MOCK_K8S_CLIENT=false MOCK_HTTP_CLIENT=false DEV_MODE=true DEPLOYMENT_MODE=standalone
```

## OpenAPI Specification

**Location**: `packages/autorag/api/openapi/autorag.yaml`

The spec is OpenAPI 3.0 and is the contract between the React frontend and the Go BFF. Key
endpoint groups are added as AutoRAG workflow management and results retrieval features are
implemented. Validate frontend HTTP calls against this spec using the contract test framework.

## Module Federation

**Config file**: `packages/autorag/frontend/config/webpack.common.js`

**Remote entry name**: `autorag`

**Exposed modules**:

- `./AutoRAGApp` — root application component loaded by the main ODH Dashboard in federated
  mode

**Main dashboard registration**: `frontend/src/app/` (extension registration file TBD as
feature matures).

```bash
# Start in federated mode (main dashboard must also be running)
cd packages/autorag
make dev-start-federated
# In repo root:
npm run dev
# Access AutoRAG via the ODH Dashboard side navigation at http://localhost:4010
```

## Architecture

```text
packages/autorag/
├── api/openapi/
│   └── autorag.yaml          # OpenAPI 3.0 specification
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
├── docs/
│   ├── overview.md           # This file
│   ├── local-deployment-guide.md
│   ├── local-deployment-guide-ui.md
│   ├── kubeflow-development-guide.md
│   └── install.md
├── Dockerfile
├── Makefile
└── package.json
```

The Go BFF is the single ingress for all AutoRAG traffic. It authenticates requests via the
cluster auth chain, proxies optimization calls to the ai4rag engine and Kubeflow Pipelines,
and serves the compiled React frontend assets in standalone and kubeflow modes. In federated
mode the BFF serves only API routes; the main ODH Dashboard hosts the frontend assets via
Module Federation.

Data flow: React frontend → BFF (`/api/v1/...`) → ai4rag engine / Kubeflow Pipelines API
(experiment orchestration) or Kubernetes API (resource management) → response back to
frontend.

## Key Concepts

| Term | Definition |
|------|-----------|
| **AutoRAG workflow** | A single optimization campaign: a set of Kubeflow Pipeline experiments exploring RAG parameter combinations for a given dataset and evaluation suite. |
| **ai4rag engine** | The underlying optimization engine that performs automated RAG parameter search within each pipeline run. |
| **RAG Pattern** | A deployable artifact produced by a successful AutoRAG campaign: a validated set of retrieval and generation parameters ready for production use. |
| **BFF** | Go Backend-for-Frontend — authenticates requests, proxies cluster and ai4rag APIs, and serves static assets. |
| **Deployment mode** | One of `standalone`, `kubeflow`, or `federated`; controls UI theme, asset serving strategy, and integration points. |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- Go >= 1.24
- Docker or Podman (optional, for containerized runs)
- OpenShift / Kubernetes cluster access (optional — mocked by default)

### Environment setup

```bash
cp packages/autorag/.env.local.example packages/autorag/.env.local
# Edit .env.local with cluster details if running without mocks
```

### Start in standalone mode (recommended for development)

```bash
cd packages/autorag
make dev-start
# Frontend + BFF available at http://localhost:9000
```

See [Local Deployment Guide] for detailed setup steps including cluster configuration.
See [Kubeflow Development Guide] for kubeflow-mode-specific setup.

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `PORT` | BFF HTTP port | `4000` | No |
| `DEPLOYMENT_MODE` | `standalone`, `kubeflow`, or `federated` | `standalone` | No |
| `DEV_MODE` | Enable development features | `false` | No |
| `MOCK_K8S_CLIENT` | Use in-memory Kubernetes mock | `false` | No |
| `MOCK_HTTP_CLIENT` | Use in-memory HTTP mock (ai4rag engine) | `false` | No |
| `STATIC_ASSETS_DIR` | Directory for compiled frontend assets | `./static` | No |
| `LOG_LEVEL` | Logging verbosity (`ERROR`, `WARN`, `INFO`, `DEBUG`) | `INFO` | No |

Full variable list: `packages/autorag/.env.local.example`.

## Testing

### Contract tests

```bash
cd packages/autorag
npm run test:contract
```

Validates frontend HTTP expectations against `api/openapi/autorag.yaml` using the
`@odh-dashboard/contract-tests` framework.

### Frontend unit tests

```bash
npx turbo run test:unit --filter=@odh-dashboard/autorag
```

### Cypress tests

```bash
npm run test:cypress-ci -- --spec "**/autorag/**"
```

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Kubeflow Pipelines | External API | BFF proxies experiment creation, run monitoring, and artifact retrieval |
| ai4rag engine | External service | BFF submits RAG parameter search jobs and retrieves optimization results |
| Main ODH Dashboard | Host application | Loads AutoRAG via Module Federation in federated mode; provides auth context |
| model-registry | Package | BFF registers optimal RAG Pattern configurations after a successful AutoRAG campaign |

## Known Issues / Gotchas

- The React frontend is currently a placeholder. Most UI pages are scaffolded but not yet
  functional; the BFF and OpenAPI contract are ahead of the frontend implementation.
- Kubeflow mode uses Material UI instead of PatternFly v6. Do not import PF components
  expecting them to render correctly in kubeflow mode without theme-guarding them.
- `MOCK_HTTP_CLIENT=true` is required for local development without a live ai4rag engine
  endpoint; omitting it will cause BFF startup errors if the endpoint is unreachable.
- Docker deployment is not yet documented. Use `make dev-start` for all local workflows.

## Related Docs

- [Guidelines] — documentation style guide for this repository
- [Module Federation Docs] — how Module Federation works in this monorepo
- [Backend Overview] — main ODH Dashboard backend reference
- [AutoML Overview] — sibling package with an identical BFF pattern
- [Local Deployment Guide] — detailed cluster setup and local deployment steps
- [Kubeflow Development Guide] — kubeflow-mode development environment setup
- [BOOKMARKS] — full doc index
