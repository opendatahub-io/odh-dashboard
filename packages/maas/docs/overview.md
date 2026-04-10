[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[MLflow Overview]: ../../mlflow/docs/overview.md
[Gen AI Overview]: ../../gen-ai/docs/overview.md
[Install Guide]: install.md
[Local Deployment Guide]: local-deployment-guide.md
[Local Deployment Guide (UI)]: local-deployment-guide-ui.md

# MaaS

**Last Updated**: 2026-04-10 | **Template**: package-template v2

## Overview

MaaS (Model as a Service) manages LLM endpoint access and API keys for external model providers in ODH Dashboard: operators configure providers and quotas; users list endpoints and create API tokens. The package ships a Go BFF and React frontend (Mod Arch pattern).

**Package path**: `packages/maas/`

## Deployment Modes

| Mode | How to start | Notes |
|------|-------------|-------|
| Standalone | `make dev-start` | BFF ~4000, mock k8s + mock HTTP; Material UI (`STYLE_THEME=mui-theme`) |
| Kubeflow | `make dev-start-kubeflow` | Live Kubeflow (~8085); MUI; namespace from Kubeflow |
| Federated | `make dev-start-federated` + main `npm run dev` | BFF ~8081 (`AUTH_METHOD=user_token`), frontend ~9104; PatternFly |

Standalone and Kubeflow use Material UI; federated uses PatternFly for RHOAI shell compatibility (same pattern as several other Mod Arch packages).

## Design Intent

The BFF sits between the React app and upstream systems: it authenticates, resolves the current user (Kubernetes RBAC or forwarded token in federated mode), and proxies to the upstream MaaS REST API (`MAAS_API_URL`) while reading Kubernetes for gateway and tier configuration. Rate limits are represented as Kuadrant `RateLimitPolicy` CRDs.

For local work without a cluster, `cmd/main.go` supports `--mock-k8s-client` and `--mock-http-client`. `GET /healthcheck` supports probes and contract tests.

In federated mode the frontend is a Module Federation remote named **`maas`**, exposing **`./extensions`** (ODH registrations) and **`./extension-points`** (contracts for the host). The main dashboard loads `remoteEntry.js` and mounts MaaS into the shell. Base path and theme follow `DEPLOYMENT_MODE` / `STYLE_THEME` and `PUBLIC_PATH` when embedded.

## Key Concepts

| Term | Definition |
|------|-----------|
| **ModelEndpoint** | Registered LLM inference endpoint with an OpenAI-compatible API surface |
| **APIToken** | User-scoped token for a specific model endpoint |
| **LLMProvider** | External provider whose models are exposed through MaaS |
| **UsageQuota** | Rate/token limits, stored as Kuadrant `RateLimitPolicy` CRDs |
| **Tier** | Named quota level mapped to groups via ConfigMap |
| **MaaS Gateway** | Kuadrant/Envoy ingress enforcing quotas per token |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `packages/gen-ai` | Package | Chat uses MaaS endpoints and API tokens |
| Kubernetes (Kuadrant) | Kubernetes API | `RateLimitPolicy`, `TokenRateLimitPolicy` for quotas |
| External LLM providers | HTTP | OpenAI-compatible traffic via configured upstream URL |
| Main ODH Dashboard | Host application | Federated load via remote `maas` |

## Known Issues / Gotchas

- **Themes**: MUI in standalone/kubeflow; PatternFly only in federated—do not assume one UI stack across modes.
- **Deprecated flags**: Prefer `--deployment-mode=<mode>` over legacy `--standalone-mode` / `--federated-platform`.
- **`MOCK_HTTP_CLIENT`**: Fixtures under `bff/internal/integrations/maas/testdata/` do not cover all edge cases.
- **Kubeflow mode**: Expects a Kuadrant-capable cluster; not fully mockable.

## Related Docs

- [Install Guide] — installation and cluster prerequisites
- [Local Deployment Guide] — local development and cluster setup
- [Local Deployment Guide (UI)] — UI-focused deployment walkthrough
- [Guidelines] — documentation style guide
- [Module Federation Docs] — federation in this monorepo
- [Backend Overview] — main dashboard backend
- [Gen AI Overview] — consumer of MaaS endpoints
- [MLflow Overview] — sibling Mod Arch–style package
- [BOOKMARKS] — full doc index
