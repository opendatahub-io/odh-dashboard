[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[Model Registry]: ../../model-registry/docs/overview.md

# Feature Store

**Last Updated**: 2026-04-10 | **Template**: package-template v2

## Overview

The Feature Store package is the UI for browsing and inspecting ML features backed by a Feast-compatible REST API. It helps users discover feature groups, lineage, and how features relate to models. The package is **frontend-only**: every data call goes through the main ODH Dashboard backend, which proxies to the Feast service.

**Package path**: `packages/feature-store/`

## Deployment Modes

| Mode | How to start | Notes |
|------|-------------|-------|
| Federated | `npm run dev` from repo root (with extensions registered) | Only supported mode. UI at `http://localhost:4010` (e.g. develop-train feature store routes). |

There is no standalone or Kubeflow package entrypoint. Visibility depends on `SupportedArea.FEATURE_STORE` and the `disableFeatureStore` flag on `OdhDashboardConfig`.

## Design Intent

There is no BFF in this package. `src/api/custom.ts` uses `proxyGET` from `@odh-dashboard/internal/api/proxyUtils` so all Feast traffic goes **main dashboard backend → Feast REST** (`/api/v1/...`). The backend resolves the upstream host from a Kubernetes `FeatureStore` CR (or equivalent discovery) using the label `feature-store-ui=enabled` on the target service.

The UI is **read-only**: list and inspect projects, entities, feature views, features, feature services, data sources, saved datasets, lineage, search, and overview metrics — no create/update/delete through this package.

This package does **not** publish a Webpack remote. It is a library: `extensions.ts` registers with the host, and `package.json` exports `./extensions`, `./routes`, `./types/*`, `./components/*`, and `./screens/lineage/*` for the plugin system.

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

## Related Docs

- [Guidelines] — documentation style guide
- [Module Federation Docs] — extension patterns in this monorepo (this package is not a remote)
- [Backend Overview] — main dashboard backend and proxy behavior
- [Model Registry] — sibling area; features may link to registered models
- [BOOKMARKS] — full doc index
