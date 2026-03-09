[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../docs/BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[LLMd Serving Package]: ../../llmd-serving/docs/overview.md
[MaaS Package]: ../../maas/docs/overview.md
[Model Serving Package]: ../../model-serving/docs/overview.md

# Gen AI

**Last Updated**: 2026-03-09 | **Template**: package-template v1

## Overview

Gen AI is the full LLM chatbot UI package in the ODH Dashboard. It provides a streaming chatbot
interface, model selection, conversation history, and system prompt configuration backed by a Go
BFF that integrates MCP (Model Context Protocol) and LSD (LLM Service Discovery) clients.

> **Note**: The `frontend/docs/gen-ai.md` doc covers only the lmEval integration in the main
> frontend. This package is the complete chatbot UI.

**Package path**: `packages/gen-ai/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Standalone | `make dev-start` | `http://localhost:8080` |
| Standalone (mocked) | `make dev-start-mock` | `http://localhost:8080` |
| Kubeflow | Deploy via `build.openshift.sh` | Cluster route |
| Federated | `make dev-start` + run main dashboard | `http://localhost:4010` |

Standalone mode requires `LLAMA_STACK_URL` and `MAAS_URL` to be set. Use `make dev-start-mock`
for fully offline development — it starts the BFF with all mock clients and no cluster access
required. The `build.openshift.sh` script handles OpenShift BuildConfig creation and routing for
kubeflow-style deployments.

## BFF Architecture

```text
packages/gen-ai/bff/
├── cmd/main.go           # Entry point; mock flags via env vars
├── internal/
│   ├── api/              # HTTP handlers and routing
│   ├── cache/            # Response caching layer
│   ├── config/           # Server configuration
│   ├── constants/        # Shared constants
│   ├── helpers/          # Utility helpers
│   ├── integrations/     # MCP, LSD, MaaS, MLflow clients
│   ├── models/           # Domain models
│   ├── repositories/     # Data access
│   ├── services/         # Business logic layer
│   ├── testutil/         # Test utilities
│   └── types/            # Shared type definitions
├── openapi/src/          # OpenAPI 3.0 specification
├── static/               # Frontend static assets (served in prod)
├── go.mod
└── Makefile
```

**Mock flags** accepted by `main.go` (set via Makefile env vars):

- `MOCK_K8S_CLIENT=true` — use in-memory mock for Kubernetes (`--mock-k8s-client`)
- `MOCK_LS_CLIENT=true` — mock the Llama Stack / LSD client (`--mock-ls-client`)
- `MOCK_MAAS_CLIENT=true` — mock the MaaS client
- `MOCK_MCP_CLIENT=true` — mock the MCP client (`--mock-mcp-client`)

Run `make dev-bff-mock` to enable all mocks simultaneously.

**Health endpoint**: `GET /healthcheck` — required for contract tests.

## OpenAPI Specification

**Location**: `packages/gen-ai/bff/openapi/src/gen-ai.yaml`

Key endpoint groups:

- `/api/llama-stack/*` — proxied to `LLAMA_STACK_URL`; LLM inference and model listing
- `/api/v1/sessions` — LLMSession CRUD; conversation history management
- `/api/v1/models` — model discovery via LSD and MaaS integrations
- `/api/v1/system-prompts` — system prompt configuration per session

## Module Federation

**Config file**: `packages/gen-ai/frontend/config/moduleFederation.js`

**Remote entry name**: `genAi`

**Exposed modules**:

- `./extensions` — ODH Dashboard extension registrations for Gen AI pages
- `./extension-points` — extension point type definitions consumed by the main dashboard
- `./AIAssetsMaaSTab` — MaaS tab component embedded in the AI Assets section of the main
  dashboard (`src/app/AIAssets/AIAssetsMaaSTab`)

**Main dashboard registration**: The main dashboard loads `genAi@<remote>/remoteEntry.js` at
runtime and mounts extensions into its routing tree. `AIAssetsMaaSTab` is imported directly as
a federated component into the main dashboard's AI Assets page.

```bash
# Start in federated mode (also requires main dashboard running)
cd packages/gen-ai
make dev-start
# Then in repo root:
npm run dev
```

## Architecture

```text
packages/gen-ai/
├── bff/                  # Go BFF
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── AIAssets/       # AI Assets MaaS tab (federated component)
│   │   │   ├── Chatbot/        # Core chatbot UI (streaming, history)
│   │   │   ├── context/        # React context providers
│   │   │   ├── hooks/          # Data-fetching and session hooks
│   │   │   ├── services/       # Frontend API calls to BFF
│   │   │   ├── shared/         # Shared UI components
│   │   │   ├── standalone/     # Standalone-mode app shell
│   │   │   ├── types/          # TypeScript type definitions
│   │   │   └── utilities/      # Helpers and formatters
│   │   └── odh/                # Extension and extension-point definitions
│   └── config/                 # Webpack / Module Federation config
├── docs/
│   └── overview.md             # This file
├── build.openshift.sh          # OpenShift standalone deploy script
├── clean.openshift.sh          # OpenShift cleanup script
├── Dockerfile
├── Makefile
└── package.json
```

The BFF proxies LLM inference traffic to the Llama Stack service and surfaces model lists from
both LSD and MaaS. Token streaming is forwarded as server-sent events directly to the browser.
MCP enables tool-augmented conversation; the BFF manages MCP session lifecycle and relays tool
calls transparently.

## Key Concepts

| Term | Definition |
|------|-----------|
| **LLMSession** | A named conversation context holding message history, system prompt, and selected model. Persisted by the BFF. |
| **ModelContext** | The resolved model configuration (endpoint, parameters, limits) attached to an LLMSession. |
| **SystemPrompt** | An operator- or user-supplied instruction prepended to every LLM request within a session. |
| **TokenStream** | Server-sent event stream delivering LLM response tokens incrementally to the browser. |
| **MCP** | Model Context Protocol — a standard for attaching external tools and context sources to LLM sessions. |
| **LSD** | LLM Service Discovery — internal service that enumerates available LLM endpoints in the cluster. |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- Go >= 1.24
- Access to an OpenShift / Kubernetes cluster (optional — mocks cover local dev)

### Environment setup

```bash
cp packages/gen-ai/.env.local.example packages/gen-ai/.env.local
# Edit .env.local — set LLAMA_STACK_URL and MAAS_URL for live mode,
# or skip and use make dev-start-mock for fully mocked development.
```

### Start in standalone mode with mocks (recommended for development)

```bash
cd packages/gen-ai
make dev-start-mock
# BFF + Frontend: http://localhost:8080
```

### Start against live services

```bash
cd packages/gen-ai
make dev-start
# Requires LLAMA_STACK_URL and MAAS_URL in .env.local
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `PORT` | BFF HTTP port | `8080` | No |
| `STATIC_ASSETS_DIR` | Directory for frontend static assets | `./static` | No |
| `LOG_LEVEL` | Logging verbosity (`debug`, `info`, `warn`, `error`) | `INFO` | No |
| `ALLOWED_ORIGINS` | CORS allowed origins | — | No |
| `LLAMA_STACK_URL` | Base URL for the Llama Stack API | — | Yes (non-mock) |
| `MAAS_URL` | Base URL for the MaaS API | — | Yes (non-mock) |
| `MOCK_K8S_CLIENT` | Use in-memory Kubernetes mock | `false` | No |
| `MOCK_LS_CLIENT` | Use in-memory Llama Stack mock | `false` | No |
| `MOCK_MAAS_CLIENT` | Use in-memory MaaS mock | `false` | No |
| `MOCK_MCP_CLIENT` | Use in-memory MCP mock | `false` | No |
| `DEPLOYMENT_MODE` | `standalone`, `kubeflow`, or `federated` | `standalone` | No |

Full list in `packages/gen-ai/.env.local.example`.

## Testing

### Contract Tests

```bash
cd packages/gen-ai
npm run test:contract
```

Validates frontend HTTP expectations against the BFF's OpenAPI schema.
Framework: `@odh-dashboard/contract-tests`.

### Frontend Unit Tests

```bash
npx turbo run test:unit --filter=@odh-dashboard/gen-ai
```

### Cypress Tests

```bash
npm run test:cypress-ci -- --spec "**/gen-ai/**"
```

### BFF Tests

```bash
cd packages/gen-ai/bff
make test
```

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host application | Loads this package via Module Federation; embeds `AIAssetsMaaSTab` |
| `packages/llmd-serving` | Package | LLM-specific serving endpoint types and CRD definitions |
| `packages/maas` | Package | Model as a Service — model catalog and token management |
| `packages/model-serving` | Package | Serving infrastructure; endpoint discovery for non-LLM models |
| Llama Stack | External service | LLM inference backend; BFF proxies `/api/llama-stack/*` to it |
| MCP server | External service | Tool-augmented conversation; BFF manages MCP session lifecycle |
| Kubernetes | Cluster API | LLM service CRDs and RBAC; read by BFF via LSD integration |

## Known Issues / Gotchas

- `LLAMA_STACK_URL` and `MAAS_URL` must be set before starting without mocks; the BFF exits
  immediately if either is missing and `MOCK_LS_CLIENT` / `MOCK_MAAS_CLIENT` are not enabled.
- Token streaming uses server-sent events; ensure no reverse proxy (e.g., nginx) buffers
  responses — set `X-Accel-Buffering: no` on the proxy layer.
- The `AIAssetsMaaSTab` federated component is consumed directly by the main dashboard; changes
  to its public props interface require coordinated updates in the main dashboard extension file.
- Debugger setup requires Delve (`dlv`) installed and added to `PATH`; see `README.md` for the
  full `launch.json` configuration and `make dev-start-debug` workflow.

## Related Docs

- [Guidelines] — documentation style guide
- [Module Federation Docs] — how Module Federation works in this monorepo
- [Backend Overview] — main dashboard backend reference
- [LLMd Serving Package] — LLM-specific serving endpoints consumed by gen-ai
- [MaaS Package] — Model as a Service integration
- [Model Serving Package] — serving infrastructure reference
- [BOOKMARKS] — full doc index
