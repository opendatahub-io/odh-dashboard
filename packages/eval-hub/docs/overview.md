# Eval Hub

## Overview

- Centralized model evaluation UI: create runs, configure metrics, inspect results, and compare model performance.
- Go BFF and React frontend; PatternFly in federated mode, Material UI in standalone/kubeflow by default.

## Design Intent

- **BFF**: Between React UI and the cluster plus external **eval-hub service**; authenticates, applies RBAC, returns typed JSON for collections, jobs, namespaces, and user resolution.
- **Serving by deployment mode**:
  - Standalone/kubeflow: typically serve the SPA from the BFF static flow.
  - Federated: BFF is API-only; main dashboard loads the bundle at runtime.
- **Data flow**: Kubernetes and eval-hub orchestration → BFF → frontend; Kubeflow Pipelines may orchestrate evaluation pipeline execution depending on deployment.
- **Module Federation**: Remote `evalHub`; host loads `./extensions` (page registrations) and `./extension-points` (types the host consumes). Runtime: `evalHub@<remote>/remoteEntry.js`.

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
