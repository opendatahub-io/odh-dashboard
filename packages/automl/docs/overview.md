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

**Last Updated**: 2026-04-10 | **Template**: package-template v2

## Overview

AutoML provides automated ML pipeline optimization for OpenShift AI: it orchestrates experiments through Kubeflow Pipelines using AutoGluon, evaluates configurations, and aims to produce deployable model artifacts. The package is early-stage with functional BFF infrastructure and placeholder frontend UI.

**Package path**: `packages/automl/`

## Deployment Modes

| Mode | How to start | Notes |
|------|-------------|-------|
| Standalone | `make dev-start` | BFF and frontend with mocked clients; UI `http://localhost:9108`. Default for local work. |
| Kubeflow | `make dev-start-kubeflow` | Integrates with the Kubeflow Dashboard; Material UI theme. Same dev URL as standalone. |
| Federated | `make dev-start-federated` + `npm run dev` at repo root | Micro-frontend in the main ODH Dashboard; access via `http://localhost:4010`. |

Standalone suits most local development. Kubeflow mode is for Kubeflow-shaped deployments and MUI. Federated mode requires the host dashboard running so the remote bundle and auth context load correctly.

## Design Intent

The Go BFF is the single ingress for AutoML traffic. It authenticates via the cluster auth chain, proxies experiment orchestration to Kubeflow Pipelines, and talks to the Kubernetes API for resources. In standalone and kubeflow modes it also serves compiled frontend assets; in federated mode it serves API routes only while the main ODH Dashboard hosts the UI.

Data flow: React → BFF (`/api/v1/...`) → Kubeflow Pipelines and/or Kubernetes → JSON back to the UI. For local work without live endpoints, `cmd/main.go` supports in-memory mocks for Kubernetes and HTTP (KFP) clients.

Module Federation remote name is `automl`; the host loads `./AutoMLApp` as the root app component. Main-dashboard extension wiring is still evolving as the feature matures.

## Key Concepts

| Term | Definition |
|------|-----------|
| **AutoML run** | A single optimization campaign: Kubeflow Pipeline experiments exploring parameter combinations for a dataset. |
| **AutoGluon** | ML library that performs automated model selection and hyperparameter search within pipeline runs. |
| **Optimal configuration** | Parameter set with the best evaluation metric across a campaign; candidate for model registration. |
| **BFF** | Go backend-for-frontend: auth, cluster API proxy, static assets (non-federated). |
| **Deployment mode** | `standalone`, `kubeflow`, or `federated` — controls theme, asset serving, and integration points. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Kubeflow Pipelines | External API | BFF proxies experiment creation, run monitoring, and artifact retrieval. |
| Main ODH Dashboard | Host application | Loads AutoML via Module Federation in federated mode; provides auth context. |
| model-registry | Package | Registers optimal model configurations after a successful campaign. |

## Known Issues / Gotchas

- Frontend is largely placeholder; BFF and OpenAPI contract are ahead of UI.
- Kubeflow mode uses Material UI, not PatternFly v6 — guard PF imports if you share code across modes.
- Without a live Kubeflow Pipelines endpoint, enable the HTTP client mock or the BFF may fail at startup when mocks are off.
- Docker deployment is not documented here; use the package `Makefile` targets for local workflows.
- Contract tests expect `GET /healthcheck` on the BFF.

## Related Docs

- [Install Guide] — installation and cluster prerequisites
- [Local Deployment Guide] — local development and cluster setup
- [Local Deployment Guide (UI)] — UI-focused local deployment
- [Kubeflow Development Guide] — kubeflow-mode environment
- [Guidelines] — documentation style guide
- [Module Federation Docs] — Module Federation in this monorepo
- [Backend Overview] — main dashboard backend
- [AutoRAG Overview] — sibling package with the same BFF pattern
- [BOOKMARKS] — full doc index
