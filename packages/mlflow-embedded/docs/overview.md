# MLflow Embedded

## Overview

- Host-side extension that integrates selected pages from the **external** MLflow frontend into ODH Dashboard.
- Adds the “Experiments” nav entry under “Develop and Train” (locked to the **Model training** workflow type).
- Adds the “Agent observability” nav entry under “Observe & monitor” (`/observe-and-monitor/agent-observability`, locked to the **GenAI** workflow type).
- Both pages render the same `MlflowExperimentsPage` with different props; `MlflowAgentObservabilityPage` passes the Agent observability title, base path, redirect path, and workflow type.
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

### Remote wrapper contract

`MlflowExperimentsPage` passes these props to `MlflowExperimentWrapper`:

| Prop                 | Purpose                                                                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `basename`           | Host path the remote router mounts under (`/develop-train/mlflow/experiments` or `/observe-and-monitor/agent-observability`).                                                                   |
| `workflowType`       | `machine_learning` or `genai`. The remote hides its workflow toggle and only shows tabs for this type.                                                                                          |
| `onBreadcrumbChange` | Reports the remote's breadcrumb trail so the host renders it in page chrome.                                                                                                                    |
| `onUnsupportedTab`   | Called when the user lands on a tab the locked workflow type does not support. The remote renders nothing for that tab and does not report the same path again, so the host must navigate away. |

### Unsupported tab redirects

`openUnsupportedTab` in `MlflowExperimentsPage` handles reports in this order:

1. **Prompts** (either page) → Prompt management (`/gen-ai-studio/prompts`, or `/gen-ai-studio/prompts/prompts/<name>` for a detail). Keeps `workspace` (falling back to the page's workspace) and `promptVersion`; drops other params.
2. **Any other tab on Experiments** → the same relative path and search under Agent observability.
3. **Anything else** (only reachable on Agent observability) → the reported experiment, letting the remote open its default tab, or the page root when no experiment is reported. The host updates the URL with `history.replaceState` and dispatches `popstate`, because the page doesn't change so the remote isn't remounted.

## Key Concepts

| Term                        | Definition                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **EmbeddedIframe**          | Legacy name; implementation uses `loadRemote()`, not an iframe.                                                              |
| **MLflowUI**                | Upstream MLflow web app (outside this monorepo) exposing `MlflowExperimentWrapper`.                                          |
| **SessionPassthrough**      | Proxy rewrites `/mlflow` and forwards the user session to the MLflow service.                                                |
| **MlflowExperimentWrapper** | Federated module loaded at runtime by the host.                                                                              |
| **WorkflowType**            | `genai` (Agent observability) or `machine_learning` (Experiments); selects which MLflow tabs the remote shows.               |
| **UnsupportedTabInfo**      | Payload the remote sends to `onUnsupportedTab`: tab name, optional experiment ID and prompt name, relative path, and search. |
| **WORKSPACE_QUERY_PARAM**   | Query param carrying the selected project namespace into/out of the remote.                                                  |

## Interactions

This package does not call the main dashboard’s `/api/k8s/` proxy for MLflow data—the remote UI talks to MLflow through its own networking once loaded.

| Dependency                | Type                     | Details                                                                                                                                                                          |
| ------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main ODH Dashboard        | Host application         | Compiles this package; loads extensions via `@odh-dashboard/plugin-core`                                                                                                         |
| `packages/mlflow`         | Sibling package          | ODH-styled MLflow UX vs this package’s embedded native UI—different products                                                                                                     |
| External MLflow server    | Module Federation remote | Must serve `mlflowEmbedded/MlflowExperimentWrapper`; workflow locking and `onUnsupportedTab` need [opendatahub-io/mlflow#395](https://github.com/opendatahub-io/mlflow/pull/395) |
| `@odh-dashboard/internal` | Shared library           | Page chrome, project selector, routes, analytics                                                                                                                                 |

## Known Issues / Gotchas

- **Router mismatch**: Remote v6 `BrowserRouter` vs host v7—deep links inside MLflow may not sync to the host URL; workspace switching relies on the remount workaround.
- **No retry**: Unavailable remote → `MLflowUnavailable`; user must reload.
- **Feature flags**: Both **`mlflow`** and **`ds-pipelines`** must be enabled for the nav item; `mlflow` alone is insufficient.
- **Do not confuse** with `packages/mlflow` (custom ODH MLflow UI vs embedded upstream UI).
- **Older MLflow images**: without mlflow#395 the remote ignores `workflowType` and `onUnsupportedTab`, so Agent observability shows the unlocked Experiments view and Experiments never redirects.
- **Agent version links**: the remote's link interceptor blocks same-origin `/models/` URLs that do not contain `/experiments/`, so model version links under the Agent observability base path need a remote fix.
