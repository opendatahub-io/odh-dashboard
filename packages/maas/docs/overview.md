# MaaS

## Overview

- MaaS (Model as a Service) manages LLM endpoint access and API keys for external providers: operators configure providers and quotas; users list endpoints and create API tokens.
- Ships a Go BFF and React frontend (Mod Arch pattern).

## Design Intent

- **BFF**: Authenticates; resolves current user (Kubernetes RBAC or forwarded token in federated mode); proxies upstream MaaS REST API (`MAAS_API_URL`); reads Kubernetes for `MaaSSubscription`, `MaaSAuthPolicy`, `MaaSModelRef`, OpenShift `Group`, and core `Namespace`.
- **Local dev without cluster**: `cmd/main.go` supports `--mock-k8s-client` and `--mock-http-client`; `GET /healthcheck` for probes and contract tests.
- **Federated mode**:
  - Module Federation remote **`maas`**: **`./extensions`** (ODH registrations), **`./extension-points`** (host contracts).
  - Main dashboard loads `remoteEntry.js` and mounts MaaS in the shell.
  - Base path and theme follow `DEPLOYMENT_MODE` / `STYLE_THEME` and `PUBLIC_PATH` when embedded.

## Key Concepts

| Term | Definition |
|------|-----------|
| **ModelEndpoint** | Registered LLM inference endpoint with an OpenAI-compatible API surface |
| **APIToken** | User-scoped token for a specific model endpoint |
| **LLMProvider** | External provider whose models are exposed through MaaS |
| **UsageQuota** | Rate/token limits as `tokenRateLimits` on `MaaSSubscription` model refs (BFF persists them on that CR); Kuadrant/Envoy enforces limits at the gateway |
| **MaaS Gateway** | Kuadrant/Envoy ingress enforcing quotas per token |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `packages/gen-ai` | Package | Chat uses MaaS endpoints and API tokens |
| Kubernetes | Kubernetes API | `MaaSSubscription`, `MaaSAuthPolicy`, `MaaSModelRef`; OpenShift `Group` (subscription form); core `Namespace` (namespace picker) |
| External LLM providers | HTTP | OpenAI-compatible traffic via configured upstream URL |
| Main ODH Dashboard | Host application | Federated load via remote `maas` |

## Known Issues / Gotchas

- **Themes**: MUI in standalone/kubeflow; PatternFly only in federated—do not assume one UI stack across modes.
- **Deprecated flags**: Prefer `--deployment-mode=<mode>` over legacy `--standalone-mode` / `--federated-platform`.
- **`MOCK_HTTP_CLIENT`**: Fixtures under `bff/internal/integrations/maas/testdata/` do not cover all edge cases.
- **Kubeflow mode**: Expects a Kuadrant-capable cluster; not fully mockable.

For cluster-backed Cypress E2E runs, `dev-bff-e2e-cluster` keeps `MAAS_API_URL` pointed at the real gateway and sets `E2E_USE_PROXY_FROM_ENV=true` for the MaaS BFF. Its MaaS API client then honors the runner's `HTTPS_PROXY` and `NO_PROXY` settings. Other startup targets do not set this flag.
