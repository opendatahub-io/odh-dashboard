# AutoML

## Overview

- Automates ML pipeline optimization for OpenShift AI using Kubeflow Pipelines and AutoGluon; evaluates configurations toward deployable model artifacts.
- Early-stage package: functional BFF infrastructure; frontend UI is largely placeholder.

## Design Intent

- **BFF (single ingress)**: Cluster auth chain; proxies experiment orchestration to Kubeflow Pipelines; uses the Kubernetes API for resources.
- **Serving by deployment mode**:
  - Standalone and kubeflow: BFF serves compiled frontend assets.
  - Federated: BFF exposes API routes only; main ODH Dashboard hosts the UI.
- **Data flow**: React → BFF (`/api/v1/...`) → Kubeflow Pipelines and/or Kubernetes → JSON to the UI.
- **Local dev**: Without live endpoints, `cmd/main.go` can use in-memory mocks for Kubernetes and HTTP (KFP) clients.
- **Module Federation**: Remote name `automl`; host loads `./AutoMLApp`. Main-dashboard extension wiring is still evolving as the feature matures.

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
