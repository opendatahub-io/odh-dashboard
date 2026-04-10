# MaaS

## Overview

- MaaS (Model as a Service) manages LLM endpoint access and API keys for external providers: operators configure providers and quotas; users list endpoints and create API tokens.
- Ships a Go BFF and React frontend (Mod Arch pattern).

## Design Intent

- **BFF**: Authenticates; resolves current user (Kubernetes RBAC or forwarded token in federated mode); proxies upstream MaaS REST API (`MAAS_API_URL`); reads Kubernetes for gateway and tier configuration; rate limits as Kuadrant `RateLimitPolicy` CRDs.
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
