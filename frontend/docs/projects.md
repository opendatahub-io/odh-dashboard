# Data Science Projects

## Overview

- Main hub for ODH Dashboard users: each project maps to an OpenShift/Kubernetes namespace.
- Create and manage workbenches, pipelines, deployed models, cluster storage, connections, and permissions from one place.

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| Data Science Projects | `/projects` | `DS_PROJECTS_VIEW` (`SupportedArea.DS_PROJECTS_VIEW`) |
| Project detail | `/projects/:namespace` | `DS_PROJECTS_VIEW` |
| Create workbench | `/projects/:namespace/spawner` | `WORKBENCHES` |
| Edit workbench | `/projects/:namespace/spawner/:notebookName` | `WORKBENCHES` |
| Assign permissions | `/projects/:namespace/permissions/assign` | `DS_PROJECTS_PERMISSIONS` |
| Model metrics | `/projects/:namespace/metrics/model/:inferenceService` | Model metrics feature flag |

- Users open **Data Science Projects** in the left nav, then a project name for detail.
- Detail view switches tabs via `?section=<id>` (not nested routes) so URLs stay shareable without remounting the layout.

## Design Intent

- `ProjectViewRoutes` defines the router; `/:namespace/*` wraps children in `ProjectDetailsContext`, which resolves the namespace to a `ProjectKind`, starts resource polling, and renders an `<Outlet>`.
- Index route is project detail: **horizontal tab host** (`GenericHorizontalBar`); visible tabs from `SupportedArea` and SSAR results.
- Tab changes only update the query string; provider and polls keep running—avoids refetch storms when switching tabs.
- `ProjectsContext` at app root: full project list, preferred project, helpers (e.g. waiting after create).
- **Project detail** is centralized on `/:namespace`: `ProjectDetailsContext` aggregates notebooks, PVCs, connections, serving resources, secrets, role bindings, hardware/Kueue data, etc.
- Tab components read that context instead of duplicate fetches for resources the provider already loads.
- Spawner and permissions flows live under `pages/projects/` alongside detail screens and follow the same routing boundaries.

## Key Concepts

| Term | Definition |
|------|-----------|
| **DataScienceProject** | OpenShift `Project` (namespace) with ODH annotations; dashboard creation sets labels and a service account. |
| **Connection** | `Secret` tagged as a connection (`opendatahub.io/connection-type`); credentials for external systems, attachable to workbenches or model servers. |
| **PVC (cluster storage)** | Claim in the namespace; dashboard uses `getDashboardPvcs` and shows ODH-created PVCs on the Cluster Storage tab. |
| **RoleBinding (permission)** | Grants `edit` or `admin` on the namespace; Permissions tab manages these. |
| **NotebookState** | `NotebookKind` plus derived runtime status (running, stopped, starting, error) from pod phase and annotations. |
| **GenericHorizontalBar** | Shared tab host: `sections` → PatternFly `Tabs`; active tab = `?section=` query param. |
| **SSAR** | SelfSubjectAccessReview — checks whether the current user can perform a verb on a resource; gates Permissions tab and “Create project”. |
| **ProjectSectionID** | Tab IDs in `screens/detail/types.ts`: overview, workbenches, cluster-storages, connections, model-server, pipelines-projects, permissions, settings, feature-store-integration, etc. |
| **LocalQueue / Kueue** | When the project uses Kueue, hooks load `LocalQueue` data; cluster-disabled Kueue shows an inline admin-contact alert. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `ProjectsContext` | Frontend | Project list and preferred project; namespace resolution for detail |
| `concepts/pipelines/context` | Frontend | `PipelineContextProvider` on detail route when `DS_PIPELINES` enabled; Pipelines tab consumes it |
| Workbenches / notebook controller | Frontend | Spawner and notebook hooks in `projects/`; image/hardware data from model-serving and notebook-controller concepts |
| `pages/modelServing` / kserve | Frontend | Serving runtimes, inference services, secrets; deployments tab via project detail hooks |
| model-registry | Package | Overview cards may link to registry entries (navigation, not tight coupling) |
| k8s API via dashboard | Backend | CRUD through `/api/k8s/...`; project creation uses service account / `/api/namespaces` |
| `SupportedArea` | Frontend | `useIsAreaAvailable` gates optional tabs from `OdhDashboardConfig` |
| `concepts/hardwareProfiles/kueueUtils` | Frontend | Kueue-disabled detection for the inline alert |

**Data flow:** Root loads projects once (with refresh paths). Entering `/:namespace` starts detail polling; tabs consume context. Optional areas (pipelines, permissions variants) layer providers or SSAR-gated UI without forking the core layout.

## Known Issues / Gotchas

- **`?section=`:** Deep links must include the query string. Internal links to a tab must use e.g. `?section=workbenches` or users land on Overview.
- **Permissions implementations:** Legacy `ProjectSharing` vs RBAC `ProjectPermissions` behind `PROJECT_RBAC_SETTINGS` both use `ProjectSectionID.PERMISSIONS`—only one shows. Do not remove legacy until RBAC exits tech preview.
- **Polling vs permissions:** `ProjectDetailsContext` starts hooks for the loaded project; if the user lacks access to a resource type (e.g. `InferenceService`), hooks may error and return empty—check `FetchStateObject.error` before treating empty as “none exist”.
- **Non-OpenShift:** Project creation uses OpenShift `projectrequests`; on plain K8s, create is unavailable by design (`allowCreate` false, button hidden).
- **Workbench URLs (v3.0):** Prefer same-origin `/notebook/{namespace}/{name}` via `NotebookRouteLink`; reading `route.spec.host` for notebooks is deprecated.
- **Tables:** Resource tables on Workbenches, Storage, and Connections use the standard `Table` override from `src/components/pf-overrides/Table.tsx`. `GenericHorizontalBar` itself uses stock PatternFly `Tabs` (no tab override).
