# Notebooks

## Overview

- Integrates [Kubeflow Notebooks v2](https://github.com/kubeflow/notebooks) workspace UI into ODH Dashboard via Module Federation.
- Adds a **Workspaces** project-details tab and **Workspace Kinds** under Settings.
- Upstream sources live in a git subtree under `upstream/`.

## Design Intent

- **No ODH-authored BFF**; federated **remote name** is `notebooks`.
- **Host proxy**: Proxies `/workspaces/api` to the upstream API (path rewritten to `/api`).
- **ODH registration**: Under `upstream/workspaces/frontend/src/odh/` — `extensions.ts` for area/nav/route; `NotebooksWrapper.tsx` loads the federated shell.
- **Upstream vs ODH**: Upstream repo includes its own Go backend for non-ODH deployments; in ODH federated mode, browser traffic to workspace APIs goes through the dashboard proxy to that API surface, not a separate dashboard BFF layer.
- **`Dockerfile.workspace`**: Federated build depends on unpublished workspace packages (`@odh-dashboard/plugin-core`, `@odh-dashboard/internal`, dynamic plugin SDK) and needs monorepo context.
- **Development**: Treat the **host** as source of truth for auth and navigation; the notebooks dev server is the federated asset origin only.

## Feature flag

| Flag | Default | Purpose |
|------|---------|---------|
| `workspaces` | `false` | Enables the Workspaces project tab and Workspace Kinds (Settings). |

### Migration from `workbenchesV2`

`workbenchesV2` was renamed to `workspaces`. The CRD still accepts `workbenchesV2` so existing `OdhDashboardConfig` objects are not pruned. On load, the dashboard backend copies `workbenchesV2` into `workspaces` when `workspaces` is absent from the raw CR. Prefer setting `workspaces` going forward; do not rely on the deprecated alias long term.

Legacy project-details links (`/projects/<ns>?section=workbenches-v2`) open the **Workspaces** tab (`section=workspaces`).

## Key Concepts

| Term | Definition |
|------|-----------|
| **NotebookImage** | Image registered as a WorkspaceKind defining a notebook environment. |
| **NotebookServer** | Upstream name for the running workspace instance (Workspace CR lifecycle). |
| **CustomNotebookEnvironment** | User-defined WorkspaceKind extending a base image. |
| **Workspace** | Notebooks v2 CR (`kind: Workspace`) for a running notebook environment. |
| **WorkspaceKind** | CR defining image and resource profile for Workspaces. |
| **plugin-notebooks** | Area ID from this package’s extensions; gated by the `workspaces` feature flag. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host | Loads `notebooks` remote; shares plugin-core and internal packages. |
| Workbenches (frontend) | Reliant area | `reliantAreas: ['workbenches']` — workbenches must be enabled; see [Workbenches Docs](../../../frontend/docs/workbenches.md). |
| Kubernetes | API | Workspace / WorkspaceKind CRs (upstream backend in non-ODH layouts). |
| `upstream/workspaces/backend` | Upstream BFF | Upstream’s Go server; ODH uses `/workspaces/api` proxy to reach its API shape. |
| JupyterHub | External | Only for some upstream deployment modes; not required for ODH federated dev. |

## Known Issues / Gotchas

- **Subtree updates**: Refresh with `pnpm run update-subtree`; review upstream breaking changes to extensions or WorkspaceKind schema before merging — adjust `src/odh/` as needed.
- **`pnpm run start:dev:ext`**: Isolates upstream UI without the ODH host — use `pnpm run start:dev` + root `pnpm run dev:frontend` for real integration (same class of issue as `start:dev:ext` on the main app for other federated packages).
- **Docker**: Build `Dockerfile.workspace` from **repo root**, not `packages/notebooks/`, or workspace deps are missing.
- **Visibility**: Gated by `OdhDashboardConfig.spec.dashboardConfig.workspaces` (default `false`).
- **Navigation**: Workspaces project-details tab; Workspace Kinds under Settings (`/notebooks/workspacekinds`), with existing WorkspaceKind create permission checks.
