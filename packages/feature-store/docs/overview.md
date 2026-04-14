# Feature Store

## Overview

- The Feature Store package is the UI for browsing and inspecting ML features backed by a Feast-compatible REST API.
- Helps users discover feature groups, lineage, and how features relate to models.
- **Frontend-only**: every data call goes through the main ODH Dashboard backend, which proxies to the Feast service.

## Design Intent

- **No BFF**: `src/api/custom.ts` uses `proxyGET` from `@odh-dashboard/internal/api/proxyUtils`; all Feast traffic is **main dashboard backend → Feast REST** (`/api/v1/...`).
- **Discovery**: Backend resolves upstream host from a Kubernetes `FeatureStore` CR (or equivalent) using label `feature-store-ui=enabled` on the target service.
- **Read-only UI**: List and inspect projects, entities, feature views, features, feature services, data sources, saved datasets, lineage, search, and overview metrics — no create/update/delete through this package.
- **No Webpack remote**: Library package; `extensions.ts` registers with the host; `package.json` exports `./extensions`, `./routes`, `./types/*`, `./components/*`, and `./screens/lineage/*` for the plugin system.

## Key Concepts

| Term | Definition |
|------|-----------|
| **FeatureStore CR** | Cluster resource (label `feature-store-ui=enabled`) whose service URL the backend uses as the proxy target. |
| **FeatureStoreProject** | Feast project namespace; scopes other objects; selected via `FeatureStoreProjectSelector`. |
| **Entity** | Domain object features are keyed on (see `src/types/entities.ts`). |
| **FeatureView** | Logical feature group from one or more data sources; ties to materialisation and lineage. |
| **Feature** | Single attribute inside a `FeatureView`; addressed as `featureViewName/featureName`. |
| **FeatureService** | Named collection of features from `FeatureViews`; serving contract for consumers. |
| **DataSource** | Raw origin for a `FeatureView` (file, table, etc.). |
| **SavedDataset** | Historical snapshot of feature values for offline training. |
| **Lineage** | Directed graph (e.g. data source → feature view → service), often from `/api/v1/lineage/complete`. |
| **FeatureStoreAPIState** | Context (`useFeatureStoreAPIState`) holding resolved host path and bound API helpers. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| ODH Dashboard backend | Proxy | All Feast calls via `proxyGET`; resolves host from labelled FeatureStore/service discovery. |
| Feast REST API | External service | `/api/v1/` read-only API; must be reachable from the cluster. |
| `@odh-dashboard/internal` | Package | `proxyGET`, `useFetch`, k8s types, area/flag infrastructure. |
| `@odh-dashboard/plugin-core` | Package | Extension types; nav and route mounting. |
| Kubernetes | Cluster API | Feature store discovery via `feature-store-ui=enabled`. |

## Known Issues / Gotchas

- Filename typo: `useFeatureStoreEnitites.ts` — fix only with a coordinated rename of all imports.
- Detail views rely on `include_relationships=true`; omitting it yields incomplete lineage-related data.
- Lineage graph needs `/api/v1/lineage/complete`; older Feast builds may show an empty graph without a clear error.
- No write path in the UI — manage objects outside the dashboard (Feast SDK, CI, etc.).
- Nav visibility: `disableFeatureStore` on `OdhDashboardConfig` and the `feature-store-ui=enabled` service label.
