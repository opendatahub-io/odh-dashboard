[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[Workbenches Docs]: ../../../frontend/docs/workbenches.md

# Notebooks

**Last Updated**: 2026-04-10 | **Template**: package-template v2

## Overview

The Notebooks package integrates [Kubeflow Notebooks v2](https://github.com/kubeflow/notebooks) workspace UI into ODH Dashboard via Module Federation. It adds Workspace and WorkspaceKind management under the AI Hub area; upstream sources live in a git subtree under `upstream/`.

**Package path**: `packages/notebooks/`

## Deployment Modes

| Mode | How to start | Notes |
|------|-------------|-------|
| Federated (ODH) | `npm run start:dev` in package, then `npm run dev:frontend` from repo root | Remote dev server (default port 9105); open dashboard at `http://localhost:4010`. |
| Upstream standalone | See `upstream/DEVELOPMENT_GUIDE.md` | e.g. `cd upstream/workspaces && make tilt-up` for upstream’s own workflows. |

Primary ODH integration is federated. Upstream also documents standalone/Kubeflow modes separately; use its guide when changing upstream-only behaviour.

The ODH backend must be running for realistic API behaviour during federated dev (`npm run dev:backend` from repo root when using split terminals).

## Design Intent

There is **no ODH-authored BFF** for this package. The federated **remote name** is `notebooks`. The host proxies `/workspaces/api` to the upstream API (path rewritten to `/api`). ODH-specific registration lives under `upstream/workspaces/frontend/src/odh/` (`extensions.ts` for area/nav/route; `NotebooksWrapper.tsx` loads the federated shell). The upstream repo includes its own Go backend for non-ODH deployments; in ODH federated mode, browser traffic to workspace APIs goes through the dashboard proxy to that API surface, not through a separate dashboard BFF layer.

`Dockerfile.workspace` exists because the federated build depends on unpublished workspace packages (`@odh-dashboard/plugin-core`, `@odh-dashboard/internal`, dynamic plugin SDK) and must see the monorepo context.

For day-to-day ODH development, treat the **host** as the source of truth for auth and navigation; the notebooks dev server is the federated asset origin only.

## Key Concepts

| Term | Definition |
|------|-----------|
| **NotebookImage** | Image registered as a WorkspaceKind defining a notebook environment. |
| **NotebookServer** | Upstream name for the running workspace instance (Workspace CR lifecycle). |
| **CustomNotebookEnvironment** | User-defined WorkspaceKind extending a base image. |
| **Workspace** | Notebooks v2 CR (`kind: Workspace`) for a running notebook environment. |
| **WorkspaceKind** | CR defining image and resource profile for Workspaces. |
| **notebooks-plugin** | Area ID from this package’s extensions; gated by dev/feature flags. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host | Loads `notebooks` remote; shares plugin-core and internal packages. |
| Workbenches (frontend) | Reliant area | `reliantAreas: ['workbenches']` — workbenches must be enabled; see [Workbenches Docs]. |
| Kubernetes | API | Workspace / WorkspaceKind CRs (upstream backend in non-ODH layouts). |
| `upstream/workspaces/backend` | Upstream BFF | Upstream’s Go server; ODH uses `/workspaces/api` proxy to reach its API shape. |
| JupyterHub | External | Only for some upstream deployment modes; not required for ODH federated dev. |

## Known Issues / Gotchas

- **Subtree updates**: Refresh with `npm run update-subtree`; review upstream breaking changes to extensions or WorkspaceKind schema before merging — adjust `src/odh/` as needed.
- **`npm run start:dev:ext`**: Isolates upstream UI without the ODH host — use `npm run start:dev` + root `npm run dev:frontend` for real integration (same class of issue as `start:dev:ext` on the main app for other federated packages).
- **Docker**: Build `Dockerfile.workspace` from **repo root**, not `packages/notebooks/`, or workspace deps are missing.
- **Visibility**: Area uses a dev flag (`Notebooks Plugin`); production exposure depends on promoting to a proper feature flag in `OdhDashboardConfig`.
- **`OdhDashboardConfig`**: `reliantAreas: ['workbenches']` — core workbench area must be on for nav items.

## Related Docs

- [Guidelines] — documentation style guide
- [Module Federation Docs] — federation in the monorepo
- [Workbenches Docs] — main workbench area
- [Backend Overview] — main backend and proxy behaviour
- [BOOKMARKS] — full doc index
