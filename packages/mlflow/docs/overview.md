[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[MaaS Overview]: ../../maas/docs/overview.md
[Model Registry Overview]: ../../model-registry/docs/overview.md
[MLflow README]: ../README.md

# MLflow

**Last Updated**: 2026-04-10 | **Template**: package-template v2

## Overview

The MLflow package integrates experiment tracking into ODH Dashboard: browse experiments, runs, metrics, and artifacts. A small Go BFF covers auth (`/api/v1/user`), namespaces (`/api/v1/namespaces`), static assets, and health; **MLflow domain data** is fetched by the frontend through the **main dashboard backend proxy** to an external MLflow server. The UI ships as a Module Federation remote.

**Package path**: `packages/mlflow/`

## Deployment Modes

| Mode | How to start | Notes |
|------|-------------|-------|
| Standalone | `make dev-start` | BFF ~4000, mocks; Material UI |
| Federated | `make dev-start-federated` + main `npm run dev` | BFF ~4020 (`AUTH_METHOD=user_token`), frontend ~9110; PatternFly |

There is **no** Kubeflow deployment mode for this package—only standalone and federated. Use the package `Makefile` for exact ports and concurrent processes when debugging federation.

## Design Intent

The BFF intentionally avoids implementing the full MLflow REST API. It handles identity, namespace listing for dev/standalone flows, asset serving, and `GET /healthcheck`. Experiment and run data flows **browser → ODH Dashboard Node proxy → external MLflow**, keeping auth consistent with the rest of the dashboard.

`cmd/main.go` supports `--mock-k8s-client` and `--mock-http-client` for local iteration.

Federated mode exposes a remote named **`mlflow`** with **`./extensions`** (routes, nav) and **`./extension-points`** for the host. Theme follows `STYLE_THEME` (MUI standalone, PatternFly when federated). See package `Makefile` and `.env.local.example` for ports and flags.

Contract tests exercise the BFF scaffold with mocks; Cypress coverage lives under the main repo’s `**/mlflow/**` specs.

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

## Related Docs

- [MLflow README] — package overview and Makefile entry points
- [Guidelines] — documentation style guide
- [Module Federation Docs] — federation in this monorepo
- [Backend Overview] — MLflow proxy behavior
- [MaaS Overview] — sibling Mod Arch–style package
- [Model Registry Overview] — registering runs as models
- [BOOKMARKS] — full doc index
