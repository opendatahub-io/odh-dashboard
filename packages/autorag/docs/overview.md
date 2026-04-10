[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[AutoML Overview]: ../../automl/docs/overview.md
[Install Guide]: install.md
[Local Deployment Guide]: local-deployment-guide.md
[Local Deployment Guide (UI)]: local-deployment-guide-ui.md
[Kubeflow Development Guide]: kubeflow-development-guide.md
[Pipeline Runs API]: pipeline-runs-api.md

# AutoRAG

**Last Updated**: 2026-04-10 | **Template**: package-template v2

## Overview

AutoRAG provides automated RAG configuration optimization for OpenShift AI: it orchestrates experiments through Kubeflow Pipelines using the ai4rag engine, evaluates parameter combinations, and aims to produce deployable RAG Pattern artifacts. The package is early-stage with functional BFF infrastructure and placeholder frontend UI.

**Package path**: `packages/autorag/`

## Deployment Modes

| Mode | How to start | Notes |
|------|-------------|-------|
| Standalone | `make dev-start` | BFF and frontend with mocked clients; UI `http://localhost:9107`. Default for local work. |
| Kubeflow | `make dev-start-kubeflow` | Kubeflow Dashboard integration; Material UI theme. |
| Federated | `make dev-start-federated` + `npm run dev` at repo root | Micro-frontend in the main ODH Dashboard; `http://localhost:4010`. |

Standalone suits most local development. Kubeflow targets Kubeflow deployments. Federated mode needs the host dashboard for the remote entry and auth.

## Design Intent

The Go BFF is the single ingress for AutoRAG. It authenticates through the cluster chain, proxies optimization work to the ai4rag engine and Kubeflow Pipelines, and uses the Kubernetes API where needed. It serves compiled frontend assets in standalone and kubeflow modes; in federated mode it exposes APIs only while the main dashboard hosts the UI via Module Federation.

Data flow: React → BFF (`/api/v1/...`) → ai4rag engine, Kubeflow Pipelines, and/or Kubernetes → response. `cmd/main.go` can run with in-memory mocks for Kubernetes and HTTP (ai4rag) when endpoints are unavailable.

Module Federation remote name is `autorag`; the host loads `./AutoRAGApp`. Main-dashboard extension registration is still TBD as the feature matures.

## Key Concepts

| Term | Definition |
|------|-----------|
| **AutoRAG workflow** | One optimization campaign: pipeline experiments exploring RAG parameters for a dataset and evaluation suite. |
| **ai4rag engine** | Optimization engine that searches RAG parameters within each pipeline run. |
| **RAG Pattern** | Deployable artifact from a successful campaign: validated retrieval and generation parameters. |
| **BFF** | Go backend-for-frontend: auth, proxies to cluster and ai4rag, static assets (non-federated). |
| **Deployment mode** | `standalone`, `kubeflow`, or `federated` — theme, asset serving, and integration points. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Kubeflow Pipelines | External API | Experiment creation, run monitoring, artifact retrieval. |
| ai4rag engine | External service | RAG parameter search jobs and optimization results. |
| Main ODH Dashboard | Host application | Module Federation host in federated mode; auth context. |
| model-registry | Package | Registers optimal RAG Pattern configurations after a successful campaign. |

## Known Issues / Gotchas

- Frontend is largely placeholder; BFF and contract are ahead of UI.
- Kubeflow mode uses Material UI — do not assume PatternFly renders without theme guards.
- Without a live ai4rag endpoint, enable the HTTP client mock or expect BFF startup failures when mocks are off.
- Docker deployment is not documented here; use `Makefile` targets locally.
- Contract tests expect `GET /healthcheck` on the BFF.

## Related Docs

- [Install Guide] — installation and cluster prerequisites
- [Local Deployment Guide] — cluster setup and local deployment
- [Local Deployment Guide (UI)] — UI-focused local deployment
- [Kubeflow Development Guide] — kubeflow-mode environment
- [Pipeline Runs API] — pipeline run API reference
- [Guidelines] — documentation style guide
- [Module Federation Docs] — Module Federation in this monorepo
- [Backend Overview] — main dashboard backend
- [AutoML Overview] — sibling package with the same BFF pattern
- [BOOKMARKS] — full doc index
