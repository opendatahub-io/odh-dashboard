# Admin Settings

## Overview

- Six admin-only configuration sections under the Settings left-nav: PVC defaults, notebook culling, user/group access, storage classes, GPU hardware profiles, custom workbench images, and connection type schemas.
- Non-admins never see Settings; direct URLs return 403.

## UI Entry Points

| Nav Item | Route | Feature Flag(s) Required |
|----------|-------|--------------------------|
| Settings > Cluster settings | `/settings/cluster-settings` | None (admin role only) |
| Settings > User management | `/settings/user-management` | None (admin role only) |
| Settings > Storage classes | `/settings/storage-classes` | None (admin role only) |
| Settings > Hardware profiles | `/settings/hardware-profiles` | None (admin role only) |
| Settings > Workbench images | `/settings/environment-setup/workbench-images` | None (admin role only) |
| Settings > Connection types | `/settings/connection-types` | None (admin role only) |

- Settings group appears only after an SSAR check on the dashboard auth resource.
- Direct access to these routes redirects non-admins to 403.

## Design Intent

- **Cluster settings:** intentionally one heavy page—`fetchClusterSettings()` / `updateClusterSettings()` against `/api/config`; a single component owns draft state for every sub-form and commits the whole payload on one save.
  - Model-serving sub-sections only when `SupportedArea.MODEL_SERVING` is available.
  - `useAppContext().dashboardConfig` supplies values such as `disableTracking` and deployment strategy for conditional UI.
- **Storage classes:** dedicated provider pattern; raw `StorageClassKind` enriched with ODH config from `opendatahub.io/storage-class-config` so list, toggles, and edit modal share one source of truth.
- **Hardware profiles:** second gate beyond admin—`accessAllowedRouteHoC` with SSAR on `create` for `HardwareProfileModel`.
- **Connection types:** list/create/duplicate/edit lazy-loaded to keep the initial route bundle small.
- **Cross-page flow:** fetch (REST or k8s hooks) → local `useState` or context → sub-forms via props → one primary save → notification toast.
- Shared section chrome: `SettingSection`, a custom wrapper around PatternFly `Card` with a consistent title/footer pattern—not a PF primitive.

## Key Concepts

| Term | Definition |
|------|-----------|
| **OdhDashboardConfig** | `kind: OdhDashboardConfig` in `odh-dashboard-config`. Feature flags, PVC default, culler timeout, telemetry, model-serving platform flags. Cluster settings reads/writes via `/api/config`. |
| **ClusterSettingsType** | TS shape mirroring config fields the UI edits: `pvcSize`, `cullerTimeout`, `userTrackingEnabled`, model-serving toggles, `defaultDeploymentStrategy`, etc. |
| **Notebook culling** | Idle notebook pods evicted after `cullerTimeout` seconds (default ~1 year; minimum 600 s). |
| **BYONImage** | `kind: BYONNotebookImage` CR for admin-registered workbench images. |
| **HardwareProfile** | `kind: HardwareProfile` CR: CPU/memory, accelerators, node selectors, tolerations; exposed in workbench and model-serving flows. |
| **ConnectionType** | `kind: ConnectionType` CR: schema template for standardized connections (S3, DB, URI, etc.). |
| **StorageClassConfig** | JSON in `metadata.annotations["opendatahub.io/storage-class-config"]`: display name, description, enabled, default. |
| **groupsConfig** | `OdhDashboardConfig.spec` field: `adminGroups` / `allowedGroups` (OpenShift Group names). |
| **accessAllowedRouteHoC** | HOC in `frontend/src/concepts/userSSAR` that SSAR-gates a route and redirects to 403 on failure. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `/api/config` | Backend Route | `GET`/`PATCH` for `OdhDashboardConfig`-backed cluster settings (`backend/src/routes/api/config/`). |
| OpenShift Group API | Backend / k8s proxy | User management watches/patches `Group` objects. |
| `StorageClass` API | Backend k8s proxy | List + annotation patches for ODH storage-class config. |
| `HardwareProfile`, `BYONNotebookImage`, `ConnectionType` CRDs | Backend k8s proxy | CRUD from respective pages; hardware profiles SSAR-gated on create. |
| Workbenches | Frontend Area | Hardware profiles and BYON images surface in workbench creation. |
| Model Serving | Frontend Area | Cluster settings toggles affect available serving paths; sections gated on `SupportedArea.MODEL_SERVING`. |
| Projects / Connections | Frontend Area | Connection types used when defining connections in projects. |

Data generally flows from backend or k8s proxy into page-local or context state, then back through
the same service layer on save, with notifications on success or failure.

## Known Issues / Gotchas

- **Save delay**: UI warns that config can take up to ~2 minutes to apply as operators reconcile
  from `OdhDashboardConfig`.
- **Telemetry row**: `TelemetrySettings` renders only when `dashboardConfig.spec.dashboardConfig.disableTracking`
  is false—no in-UI explanation when hidden.
- **Storage class JSON annotation**: Corruption triggers `CorruptedMetadataAlert` /
  `ResetCorruptConfigValueAlert`; fix via reset or manual annotation patch.
- **Group settings**: Both `adminGroups` and `allowedGroups` need at least one selection or Save
  stays disabled (`selectionRequired` on `MultiSelection`).
- **HardwareProfile double gate**: Top-level admin SSAR plus `create` SSAR on the CRD; missing CRD
  yields 403 even for admins (RHOAIENG-21129).
- **BYON path**: Legacy `/settings/notebook-images` redirects via `v2Redirects.ts`; prefer documented
  routes.
- **Connection types**: Sub-pages are lazy imports—parent router must keep Suspense boundaries if
  nesting grows.
