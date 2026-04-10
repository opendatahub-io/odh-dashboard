[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[Model Registry Package]: ../../model-registry/docs/overview.md
[Model Serving Package]: ../../model-serving/docs/overview.md
[Install Guide]: install.md
[Local Deployment Guide]: local-deployment-guide.md
[Local Deployment Guide (UI)]: local-deployment-guide-ui.md
[Kubeflow Development Guide]: kubeflow-development-guide.md

# Eval Hub

**Last Updated**: 2026-04-10 | **Template**: package-template v2

## Overview

Eval Hub is the centralized model evaluation UI in the ODH Dashboard: create evaluation runs, configure metrics, inspect results, and compare model performance. It ships a Go BFF and a React frontend (PatternFly in federated mode; Material UI in standalone/kubeflow by default).

**Package path**: `packages/eval-hub/`

## Deployment Modes

| Mode | How to start | Notes |
|------|-------------|-------|
| Standalone | `make dev-start` | BFF on port 4002 with k8s, HTTP, and eval-hub client mocks; frontend `http://localhost:9106`. |
| Kubeflow | `make dev-start-kubeflow` | Mocks off; port-forward / live eval-hub service as documented in the local guides. |
| Federated | `make dev-start-federated` + `npm run dev` at repo root | PatternFly theme and `AUTH_METHOD=user_token`; host at `http://localhost:4010`. |

Standalone is the usual local loop. Kubeflow assumes cluster connectivity and real eval-hub wiring. Federated matches how the package runs inside the main dashboard.

## Design Intent

The BFF sits between the React UI and the cluster plus the external **eval-hub service**. It authenticates requests, applies RBAC, and returns typed JSON for collections, jobs, namespaces, and user resolution. Standalone/kubeflow typically serve the SPA from the BFF’s static flow; federated mode keeps the BFF as an API while the main dashboard loads the bundle at runtime.

Data flows: Kubernetes and eval-hub orchestration → BFF → frontend. Kubeflow Pipelines may orchestrate evaluation pipeline execution depending on deployment.

Module Federation remote name is `evalHub`. The host loads `./extensions` (page registrations) and `./extension-points` (types the host consumes). Runtime URL pattern: `evalHub@<remote>/remoteEntry.js`.

## Key Concepts

| Term | Definition |
|------|-----------|
| **EvaluationRun** | One evaluation pipeline execution against a model version, with inputs, outputs, and scores. |
| **EvaluationMetric** | Named, configurable measure (e.g. accuracy, F1) applied during a run. |
| **ModelBenchmark** | Aggregated comparison of runs across versions or endpoints. |
| **eval-hub service** | External orchestration service the BFF proxies for run CRUD and results. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host application | Module Federation host in federated mode. |
| model-registry | Package | Model versions used as evaluation targets. |
| model-serving | Package | Deployed endpoints to evaluate against. |
| Kubeflow Pipelines | External service | Can orchestrate evaluation pipeline execution. |
| eval-hub service | External service | Proxied by the BFF for evaluations API. |
| Kubernetes | Cluster API | CRDs, RBAC, namespace and user context. |

## Known Issues / Gotchas

- Standalone mocks do not validate `EVAL_HUB_URL`; set it before kubeflow/federated or the BFF may fail to start.
- Default `STYLE_THEME` is `mui-theme` in standalone/kubeflow; federated Makefile flow sets PatternFly.
- Port 4002 is shared conventionally with other packages — avoid two BFFs on the same port.
- Contract tests expect `GET /healthcheck` on the BFF.

## Related Docs

- [Install Guide] — installation and cluster prerequisites
- [Local Deployment Guide] — local development and cluster setup
- [Local Deployment Guide (UI)] — UI-focused local deployment
- [Kubeflow Development Guide] — kubeflow-mode environment
- [Guidelines] — documentation style guide
- [Module Federation Docs] — Module Federation in this monorepo
- [Backend Overview] — main dashboard backend
- [Model Registry Package] — model versions consumed by eval-hub
- [Model Serving Package] — endpoints consumed by eval-hub
- [BOOKMARKS] — full doc index
