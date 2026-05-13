# MLflow

## Overview

- Integrates experiment tracking into ODH Dashboard: browse experiments, runs, metrics, and artifacts.
- Small Go BFF covers auth (`/api/v1/user`), namespaces (`/api/v1/namespaces`), static assets, and health.
- **MLflow domain data** is fetched by the frontend through the **main dashboard backend proxy** to an external MLflow server.
- The UI ships as a Module Federation remote.

## Design Intent

- The BFF intentionally avoids implementing the full MLflow REST API.
  - Handles identity, namespace listing for dev/standalone flows, asset serving, and `GET /healthcheck`.
  - Experiment and run data: **browser → ODH Dashboard Node proxy → external MLflow** (auth aligned with the rest of the dashboard).
- `cmd/main.go` supports `--mock-k8s-client` and `--mock-http-client` for local iteration.
- **Federated mode:** remote named **`mlflow`** with **`./extensions`** (routes, nav) and **`./extension-points`** for the host; theme follows `STYLE_THEME` (MUI standalone, PatternFly when federated). Package `Makefile` and `.env.local.example` document ports and flags.
- Contract tests exercise the BFF scaffold with mocks; Cypress coverage lives under the main repo’s `**/mlflow/**` specs.

## Key Concepts

| Term | Definition |
|------|-----------|
| **MLflowExperiment** | Named collection of runs |
| **MLflowRun** | Single execution with params, metrics, artifacts |
| **Metric** | Scalar logged per step |
| **Artifact** | File or directory logged by a run |
| **Tag** | Key/value label for filtering |
| **Dashboard backend proxy** | Main ODH backend forwarding authenticated requests to the external MLflow API |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| External MLflow server | HTTP (via proxy) | Experiments, runs, metrics, artifacts |
| `packages/model-registry` | Package | Register best run as a versioned model |
| Main ODH Dashboard | Host application | Federated remote `mlflow`; provides MLflow API proxy |

## Known Issues / Gotchas

- **Two modes only**: `dev-start` vs `dev-start-federated`; no kubeflow target for this package.
- **BFF vs data plane**: Domain MLflow calls bypass the Go BFF; OpenAPI under `api/openapi/` covers scaffold endpoints only—upstream MLflow docs define the tracking API.
- **`STYLE_THEME`**: Default `mui-theme` even in standalone; set `patternfly-theme` explicitly if you need PF outside federated mode.
