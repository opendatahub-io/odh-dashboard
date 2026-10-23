# MLflow Embedded

## Overview

- Host-side extension that integrates selected pages from the **external** MLflow frontend into ODH Dashboard.
- Adds the “Experiments” nav entry under “Develop and Train” (locked to the **Model training** workflow type).
- Adds the “Agent traces” nav entry under “Observe & monitor” (`/observe-and-monitor/agent-traces`, locked to the **GenAI** workflow type).
- Both pages render the same `MlflowExperimentsPage` with different props; `MlflowAgentObservabilityPage` passes the Agent traces title, base path, redirect path, and workflow type.
- Adds the “Skills” nav entry under “AI hub” (`/ai-hub/skills`, Tech Preview, behind the `skillRegistry` flag). `MlflowSkillRegistryPage` loads a separate remote component, `MlflowSkillRegistryWrapper`.
- Loads the upstream MLflow UI through Module Federation with ODH chrome, project selection, and session passthrough.

## Design Intent

- **No BFF** in this package.
- The host registers extensions from `extensions.ts` (`AreaExtension`, `HrefNavItemExtension`, `RouteExtension`).
- **Module Federation:** metadata in this package’s `package.json` (`module-federation`); remote name **`mlflowEmbedded`**.
  - At runtime `MlflowExperimentsPage` calls `loadRemote('mlflowEmbedded/MlflowExperimentWrapper')` via `@module-federation/runtime`.
  - Dashboard proxy routes **`/mlflow`** to the cluster MLflow service (or local tracking port during dev) with auth forwarding (`authorize: true`).
- **Visibility:** Experiments and Agent traces remain in navigation when the MLflow Operator is disabled, so users can reach setup guidance. The Experiments Home task requires the MLflow component. Prompts navigation and its task shortcut require both the Gen AI Studio plugin and the MLflow component; its route remains available for direct links from Experiments and Agent traces even when those flags are disabled. Skills requires the MLflow component and `skillRegistry` flag; the MCP registry tab requires the MLflow component, `mcpCatalog`, and `mcpRegistry`.
- **Availability:** The host checks whether the MLflow Operator component is enabled before querying the MLflow BFF. A disabled operator or missing MLflow custom resource shows administrator guidance only to dashboard administrators with cluster-scoped `create` and either `update` or `patch` permission on MLflow CRs; other users see user guidance. A status request that fails before any successful response shows the service-unavailable state; later transient failures retain the last known availability state. When no project exists, the workspace loader shows this MLflow state before the create-project state. The Launch MLflow action is hidden until MLflow is available.
- **Troubleshooting:** confirm the remote URL resolves from the browser (CORS, TLS, cluster route) before assuming a bug in host extension code.
- **`LazyCodeRefComponent`** uses **`key={workspace}`** so the remote remounts when the project changes (embedded app uses React Router v6 `BrowserRouter`, which does not follow the host’s React Router v7 history).
- If `loadRemote` fails, the page shows `MLflowUnavailable` instead of crashing.

### Remote wrapper contract

`MlflowExperimentsPage` passes these props to `MlflowExperimentWrapper`:

| Prop                 | Purpose                                                                                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `basename`           | Host path the remote router mounts under (`/develop-train/mlflow/experiments` or `/observe-and-monitor/agent-traces`).                                                                          |
| `workflowType`       | `machine_learning` or `genai`. The remote hides its workflow toggle and only shows tabs for this type.                                                                                          |
| `onBreadcrumbChange` | Reports the remote's breadcrumb trail so the host renders it in page chrome.                                                                                                                    |
| `onUnsupportedTab`   | Called when the user lands on a tab the locked workflow type does not support. The remote renders nothing for that tab and does not report the same path again, so the host must navigate away. |

### Unsupported tab redirects

`openUnsupportedTab` in `MlflowExperimentsPage` handles reports in this order:

1. **Prompts** (either page) → Prompt management (`/gen-ai-studio/prompts`, or `/gen-ai-studio/prompts/prompts/<name>` for a detail). Keeps `workspace` (falling back to the page's workspace) and `promptVersion`; drops other params.
2. **Any other tab on Experiments** → the same relative path and search under Agent traces.
3. **Anything else** (only reachable on Agent traces) → the reported experiment, letting the remote open its default tab, or the page root when no experiment is reported. The host updates the URL with `history.replaceState` and dispatches `popstate`, because the page doesn't change so the remote isn't remounted.

### Skill Registry wrapper contract

`MlflowSkillRegistryPage` passes these props to `MlflowSkillRegistryWrapper`:

| Prop                 | Purpose                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| `basename`           | Host path the remote router mounts under (`/ai-hub/skills`).                                          |
| `onBreadcrumbChange` | Reports the remote's breadcrumb trail: `[]` on the catalog, and the skill's trail on its detail page. |

The remote must resolve both upstream detail routes under the basename: `/:organization/:skillName` (`/ai-hub/skills/@acme/code-review`) and `/:skillKey` (default-organization skills and the older encoded form `%40acme%2Fcode-review`). The host registers one `/ai-hub/skills/*` route for the catalog and both detail shapes, so it needs no `useHostRouteSync`. When a skill URL has no `?workspace=`, or names a project the user can't see, the host only sets `workspace`, so the skill and its other params (such as `version`) are kept. Creating a project from the no-projects state opens the catalog, since a new project has no skills. "Launch MLflow" on this page opens `/mlflow/#/skills`.

## Key Concepts

| Term                        | Definition                                                                                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **EmbeddedIframe**          | Legacy name; implementation uses `loadRemote()`, not an iframe.                                                              |
| **MLflowUI**                | Upstream MLflow web app (outside this monorepo) exposing `MlflowExperimentWrapper`.                                          |
| **SessionPassthrough**      | Proxy rewrites `/mlflow` and forwards the user session to the MLflow service.                                                |
| **MlflowExperimentWrapper** | Federated module loaded at runtime by the host.                                                                              |
| **WorkflowType**            | `genai` (Agent traces) or `machine_learning` (Experiments); selects which MLflow tabs the remote shows.                      |
| **UnsupportedTabInfo**      | Payload the remote sends to `onUnsupportedTab`: tab name, optional experiment ID and prompt name, relative path, and search. |
| **WORKSPACE_QUERY_PARAM**   | Query param carrying the selected project namespace into/out of the remote.                                                  |

## Interactions

This package does not call the main dashboard’s `/api/k8s/` proxy for MLflow data—the remote UI talks to MLflow through its own networking once loaded.

| Dependency                | Type                     | Details                                                                                                                                                                          |
| ------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main ODH Dashboard        | Host application         | Compiles this package; loads extensions via `@odh-dashboard/plugin-core`                                                                                                         |
| `packages/mlflow`         | Sibling package          | ODH-styled MLflow UX vs this package’s embedded native UI—different products                                                                                                     |
| External MLflow server    | Module Federation remote | Must serve `mlflowEmbedded/MlflowExperimentWrapper`; workflow locking and `onUnsupportedTab` need [opendatahub-io/mlflow#395](https://github.com/opendatahub-io/mlflow/pull/395) |
| External MLflow server    | Module Federation remote | Must serve `mlflowEmbedded/MlflowSkillRegistryWrapper` for the Skills page; see [opendatahub-io/mlflow#411](https://github.com/opendatahub-io/mlflow/pull/411)                   |
| `@odh-dashboard/internal` | Shared library           | Page chrome, project selector, routes, analytics                                                                                                                                 |

## Known Issues / Gotchas

- **Router mismatch**: Remote v6 `BrowserRouter` vs host v7—deep links inside MLflow may not sync to the host URL; workspace switching relies on the remount workaround.
- **No retry**: Unavailable remote → `MLflowUnavailable`; user must reload.
- **Feature flags**: Skills and the MCP registry tab still need the MLflow DSC component and the `OdhDashboardConfig` flags listed under Visibility.
- **Do not confuse** with `packages/mlflow` (custom ODH MLflow UI vs embedded upstream UI).
- **Older MLflow images**: without mlflow#395 the remote ignores `workflowType` and `onUnsupportedTab`, so Agent traces shows the unlocked Experiments view and Experiments never redirects.
- **Skills without the remote component**: until the MLflow image exposes `MlflowSkillRegistryWrapper`, the Skills page shows `MLflowUnavailable` even when MLflow is running.
- **Skill uploads**: folder upload goes through the `/mlflow` proxy, which rejects requests over the backend's 32 MiB body limit, and needs MLflow to run with `--serve-artifacts`.
- **Agent version links**: the remote's link interceptor blocks same-origin `/models/` URLs that do not contain `/experiments/`, so model version links under the Agent traces base path need a remote fix.
