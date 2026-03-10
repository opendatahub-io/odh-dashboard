[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../docs/BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[MLflow Overview]: ../../mlflow/docs/overview.md
[Gen AI Overview]: ../../gen-ai/docs/overview.md
[Install Guide]: install.md
[Local Deployment Guide]: local-deployment-guide.md
[Local Deployment Guide (UI)]: local-deployment-guide-ui.md

# MaaS

**Last Updated**: 2026-03-09 | **Template**: package-template v1

## Overview

MaaS (Model as a Service) manages LLM endpoint access and API key management for external model
providers within ODH Dashboard. It allows platform operators to configure model providers and
usage quotas, and lets users list available LLM endpoints and generate API access tokens. The
package is production-ready and ships with a Go BFF and a React frontend.

**Package path**: `packages/maas/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Standalone | `make dev-start` | `http://localhost:4000` |
| Kubeflow | `make dev-start-kubeflow` | `http://localhost:4000` |
| Federated | `make dev-start-federated` + run main dashboard | `http://localhost:9104` |

- **Standalone**: BFF starts on port 4000 with `--mock-k8s-client` and `--mock-http-client`
  enabled; uses Material UI theme. Best for isolated local development.
- **Kubeflow**: BFF connects to a live Kubeflow cluster on port 8085; uses Material UI theme.
  Namespace selection is managed by Kubeflow.
- **Federated**: BFF starts on port 4020 with `AUTH_METHOD=user_token`; frontend starts on
  port 9104 with PatternFly theme. Requires the main ODH Dashboard also running.

> **Note**: Kubeflow and Standalone modes both use Material UI (`STYLE_THEME=mui-theme`).
> Federated mode switches to PatternFly (`STYLE_THEME=patternfly`). This is the only package
> in the monorepo that uses Material UI.

## BFF Architecture

```text
packages/maas/bff/
├── cmd/main.go                          # Entry point; accepts all flag/env config
├── internal/
│   ├── api/                             # HTTP handlers and middleware
│   │   ├── api_keys_handlers.go         # API key CRUD
│   │   ├── models_handler.go            # LLM model endpoint listing
│   │   ├── tiers_handlers.go            # Usage tier management
│   │   ├── namespaces_handler.go        # Namespace enumeration
│   │   └── user_handler.go              # Current-user resolution
│   ├── config/environment.go            # EnvConfig struct; flag defaults
│   ├── integrations/
│   │   ├── kubernetes/                  # k8s client (internal + token-based)
│   │   └── maas/maas_client.go          # HTTP client for upstream MaaS API
│   ├── models/                          # Domain structs: APIKey, Model, Tier, User
│   └── repositories/                    # Data access layer
├── openapi.yaml                         # OpenAPI 3.0 specification
└── Makefile
```

**Mock flags** accepted by `cmd/main.go`:
- `--mock-k8s-client` — use in-memory Kubernetes mock (no cluster required)
- `--mock-http-client` — use canned HTTP responses for upstream MaaS API calls

**Health endpoint**: `GET /healthcheck` — required for liveness probes and contract tests.

Data flows from the React frontend to the BFF, which authenticates the request, resolves
the user identity (via Kubernetes RBAC or a forwarded token in federated mode), and proxies
calls to the upstream MaaS API (`MAAS_API_URL`) or reads Kubernetes CRDs for tier and gateway
configuration. Rate limit policies are stored as Kuadrant `RateLimitPolicy` CRDs.

## OpenAPI Specification

**Location**: `packages/maas/bff/openapi.yaml`

Key endpoint groups:

| Endpoint group | Description |
|---------------|-------------|
| `GET /healthcheck` | Liveness probe; no auth required |
| `GET /api/v1/user` | Resolve current authenticated user |
| `GET /api/v1/namespaces` | List namespaces accessible to the user |
| `GET/POST/DELETE /api/v1/api-keys` | Manage LLM API access tokens |
| `GET /api/v1/models` | List available LLM model endpoints |
| `GET /api/v1/tiers` | List usage tiers from ConfigMap |

## Module Federation

**Config file**: `packages/maas/frontend/config/moduleFederation.js`

**Remote entry name**: `maas`

**Exposed modules**:
- `./extensions` — ODH extension registrations loaded by the main dashboard at runtime
- `./extension-points` — Extension point contracts consumed by the host

**Main dashboard registration**: registered via the `./extensions` remote module; the host
reads the remote entry at `remoteEntry.js` and mounts MaaS pages into the dashboard shell.

```bash
# Start in federated mode (requires main dashboard running separately)
cd packages/maas
make dev-start-federated
# In repo root:
npm run dev
```

## Architecture

```text
packages/maas/
├── bff/                    # Go BFF (see BFF Architecture above)
├── frontend/
│   ├── src/
│   │   ├── odh/            # extensions.ts and extension-points.ts (Module Federation)
│   │   ├── app/            # App entry, routing, theme provider
│   │   ├── components/     # Shared UI components
│   │   ├── pages/          # Page-level components (endpoints, API keys, providers)
│   │   └── api/            # Frontend API calls to BFF
│   └── config/
│       ├── moduleFederation.js   # Module Federation plugin config
│       ├── webpack.common.js     # Common Webpack config; theme path switching
│       └── webpack.dev.js / webpack.prod.js
├── docs/                        # See Package Documentation below
├── Dockerfile
├── Makefile
└── README.md
```

The frontend conditionally loads Material UI or PatternFly at build time via `STYLE_THEME`.
In kubeflow and standalone modes the base path is `/mod-arch/`; in federated mode it follows
`PUBLIC_PATH` set by the host dashboard.

## Key Concepts

| Term | Definition |
|------|-----------|
| **ModelEndpoint** | A registered LLM inference endpoint backed by an OpenAI-compatible API |
| **APIToken** | A scoped access token issued to a user for a specific model endpoint |
| **LLMProvider** | An external provider (e.g., OpenAI, Anthropic) whose models are exposed via MaaS |
| **UsageQuota** | Rate and token limits assigned to a user or group, stored as Kuadrant `RateLimitPolicy` CRDs |
| **Tier** | A named quota level (e.g., "basic", "standard") mapped to groups via a ConfigMap |
| **MaaS Gateway** | The Kuadrant/Envoy ingress gateway that enforces usage quotas per API token |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- Go >= 1.24
- Access to an OpenShift / Kubernetes cluster (optional — mocks cover most dev workflows)

### Environment setup

```bash
cp packages/maas/.env.local.example packages/maas/.env.local
# Edit .env.local: set MAAS_API_URL if connecting to a real MaaS backend
```

### Start in standalone mode (recommended for development)

```bash
cd packages/maas
make dev-start
# BFF:      http://localhost:4000  (mock k8s + mock HTTP)
# Frontend: http://localhost:4000
```

### Start in kubeflow mode

```bash
cd packages/maas
make dev-start-kubeflow
# Requires a Kubeflow cluster accessible at port 8085
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `PORT` | BFF HTTP port | `4000` | No |
| `DEPLOYMENT_MODE` | `standalone`, `kubeflow`, or `federated` | `standalone` | No |
| `STYLE_THEME` | UI theme: `mui-theme` or `patternfly-theme` | `mui-theme` | No |
| `MAAS_API_URL` | URL of the upstream MaaS REST API | `""` | Yes (non-mock) |
| `GATEWAY_NAMESPACE` | Namespace where the MaaS Gateway is deployed | `openshift-ingress` | No |
| `GATEWAY_NAME` | Name of the MaaS Gateway resource | `maas-default-gateway` | No |
| `TIERS_CONFIGMAP_NS` | Namespace of the tier-to-group ConfigMap | `opendatahub` | No |
| `TIERS_CONFIGMAP_NAME` | Name of the tier-to-group ConfigMap | `tier-to-group-mapping` | No |
| `AUTH_METHOD` | `internal` (service account) or `user_token` (forwarded token) | `internal` | No |
| `AUTH_TOKEN_HEADER` | Header carrying the user token in `user_token` mode | `Authorization` | No |
| `DEV_MODE` | Enable development mode (local kubeconfig) | `false` | No |
| `MOCK_K8S_CLIENT` | Use in-memory Kubernetes mock | `false` | No |
| `LOG_LEVEL` | BFF log level: `error`, `warn`, `info`, `debug` | `INFO` | No |

Full list in `packages/maas/.env.local.example`.

## Testing

### BFF unit tests

```bash
cd packages/maas
make test
# Runs go test ./internal/api using envtest (downloads k8s binaries on first run)
```

### Frontend unit tests

```bash
npx turbo run test:unit --filter=@odh-dashboard/maas
```

### Cypress tests

```bash
npm run test:cypress-ci -- --spec "**/maas/**"
```

Contract tests follow the `@odh-dashboard/contract-tests` framework. Start the BFF with
`--mock-k8s-client --mock-http-client`, then run `npm run test:contract` from
`packages/maas/`.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `packages/gen-ai` | Package | The chatbot package uses MaaS endpoints and API tokens to make LLM calls |
| Kubernetes (Kuadrant CRDs) | Kubernetes API | Reads `RateLimitPolicy` and `TokenRateLimitPolicy` CRDs for quota enforcement |
| External LLM providers | HTTP | Proxies OpenAI-compatible API requests; URL configured via `MAAS_API_URL` |
| Main ODH Dashboard | Host application | Loads this package via Module Federation in federated mode |

## Known Issues / Gotchas

- Material UI is used in both standalone and kubeflow modes; only federated mode uses
  PatternFly. Do not assume all packages share the same UI library.
- The `--standalone-mode` and `--federated-platform` BFF flags are deprecated. Use
  `--deployment-mode=<mode>` instead.
- `MOCK_HTTP_CLIENT=true` returns canned fixture data from
  `bff/internal/integrations/maas/testdata/`; the fixtures do not cover all edge cases.
- Kubeflow mode requires a live Kuadrant-enabled cluster; it cannot run fully mocked.

## Package Documentation

- [Install Guide] — installation and cluster prerequisites
- [Local Deployment Guide] — detailed local development and cluster setup
- [Local Deployment Guide (UI)] — UI-focused local deployment walkthrough

## Related Docs

- [Guidelines] — documentation style guide
- [Module Federation Docs] — how Module Federation works in this monorepo
- [Backend Overview] — main dashboard backend reference
- [Gen AI Overview] — chatbot package that consumes MaaS endpoints
- [MLflow Overview] — sibling package using the same BFF scaffold
- [BOOKMARKS] — full doc index
