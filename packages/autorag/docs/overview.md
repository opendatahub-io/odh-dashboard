# AutoRAG

## Overview

- Automates RAG configuration optimization for OpenShift AI via Kubeflow Pipelines and the ai4rag engine; evaluates parameter combinations toward deployable RAG Pattern artifacts.
- Early-stage package: functional BFF infrastructure; frontend UI is largely placeholder.

## Design Intent

- **BFF (single ingress)**: Cluster auth chain; proxies optimization to the ai4rag engine and Kubeflow Pipelines; uses the Kubernetes API where needed.
- **Serving by deployment mode**:
  - Standalone and kubeflow: BFF serves compiled frontend assets.
  - Federated: APIs only on the BFF; main dashboard hosts the UI via Module Federation.
- **Data flow**: React → BFF (`/api/v1/...`) → ai4rag engine, Kubeflow Pipelines, and/or Kubernetes → response.
- **Local dev**: `cmd/main.go` can use in-memory mocks for Kubernetes and HTTP (ai4rag) when endpoints are unavailable.
- **Module Federation**: Remote name `autorag`; host loads `./AutoRAGApp`. Main-dashboard extension registration is still TBD as the feature matures.

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
