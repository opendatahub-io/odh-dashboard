# MLflow Embedded

## Overview

- Host-side extension that integrates selected pages from the **external** MLflow frontend into ODH Dashboard.
- Adds the “Experiments” nav entry under “Develop and Train”.
- Loads the upstream MLflow UI through Module Federation with ODH chrome, project selection, and session passthrough.

## Design Intent

- **No BFF** in this package.
- The host registers extensions from `extensions.ts` (`AreaExtension`, `HrefNavItemExtension`, `RouteExtension`).
- **Module Federation:** metadata in this package’s `package.json` (`module-federation`); remote name **`mlflowEmbedded`**.
  - At runtime `MlflowExperimentsPage` calls `loadRemote('mlflowEmbedded/MlflowExperimentWrapper')` via `@module-federation/runtime`.
  - Dashboard proxy routes **`/mlflow`** to the cluster MLflow service (or local tracking port during dev) with auth forwarding (`authorize: true`).
- **Visibility:** controlled by **`OdhDashboardConfig`** feature flags on the cluster (`mlflow`, `ds-pipelines`), not env vars in this package.
- **Troubleshooting:** confirm the remote URL resolves from the browser (CORS, TLS, cluster route) before assuming a bug in host extension code.
- **`LazyCodeRefComponent`** uses **`key={workspace}`** so the remote remounts when the project changes (embedded app uses React Router v6 `BrowserRouter`, which does not follow the host’s React Router v7 history).
- If `loadRemote` fails, the page shows `MLflowUnavailable` instead of crashing.

## Key Concepts

| Term | Definition |
|------|-----------|
| **EmbeddedIframe** | Legacy name; implementation uses `loadRemote()`, not an iframe. |
| **MLflowUI** | Upstream MLflow web app (outside this monorepo) exposing `MlflowExperimentWrapper`. |
| **SessionPassthrough** | Proxy rewrites `/mlflow` and forwards the user session to the MLflow service. |
| **MlflowExperimentWrapper** | Federated module loaded at runtime by the host. |
| **WORKSPACE_QUERY_PARAM** | Query param carrying the selected project namespace into/out of the remote. |

## Interactions

This package does not call the main dashboard’s `/api/k8s/` proxy for MLflow data—the remote UI talks to MLflow through its own networking once loaded.

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host application | Compiles this package; loads extensions via `@odh-dashboard/plugin-core` |
| `packages/mlflow` | Sibling package | ODH-styled MLflow UX vs this package’s embedded native UI—different products |
| External MLflow server | Module Federation remote | Must serve `mlflowEmbedded/MlflowExperimentWrapper` |
| `@odh-dashboard/internal` | Shared library | Page chrome, project selector, routes, analytics |

## Known Issues / Gotchas

- **Router mismatch**: Remote v6 `BrowserRouter` vs host v7—deep links inside MLflow may not sync to the host URL; workspace switching relies on the remount workaround.
- **No retry**: Unavailable remote → `MLflowUnavailable`; user must reload.
- **Feature flags**: Both **`mlflow`** and **`ds-pipelines`** must be enabled for the nav item; `mlflow` alone is insufficient.
- **Do not confuse** with `packages/mlflow` (custom ODH MLflow UI vs embedded upstream UI).
