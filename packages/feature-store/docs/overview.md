[Guidelines]: ../../docs/guidelines.md
[BOOKMARKS]: ../../docs/BOOKMARKS.md
[Backend Overview]: ../../backend/docs/overview.md
[Module Federation Docs]: ../../docs/module-federation.md
[Model Registry]: ../model-registry/docs/overview.md

# Feature Store

**Last Updated**: 2026-03-09 | **Template**: package-template v1

## Overview

The Feature Store package provides the UI for browsing and inspecting ML features managed by a
Feast-compatible feature store backend. It targets data scientists and ML engineers who need to
discover feature groups, understand data lineage, and trace which features feed which models.
This package is frontend-only — all data access is proxied through the main ODH Dashboard backend
to a Feast REST API.

**Package path**: `packages/feature-store/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Federated | `npm run dev` from repo root (after registering extensions) | `http://localhost:4010` |

This package has no standalone or Kubeflow deployment mode. It registers itself into the main
dashboard via the extension system and is only accessible when the host dashboard is running.
The `SupportedArea.FEATURE_STORE` area flag and the `disableFeatureStore` feature flag control
visibility.

## BFF Architecture

Not applicable — this package has no BFF.

All API calls in `src/api/custom.ts` use `proxyGET` from `@odh-dashboard/internal/api/proxyUtils`,
routing every request through the main ODH Dashboard backend to the external Feast REST service.
The backend resolves the feature store host URL from the Kubernetes `FeatureStore` CR discovered
via the label `feature-store-ui=enabled`.

## OpenAPI Specification

Not applicable — this package has no BFF.

The upstream Feast REST API is versioned at `/api/v1/`. Key endpoint groups consumed by this
package:

- `/api/v1/projects` — list feature store projects
- `/api/v1/entities`, `/api/v1/entities/all` — entity listing and detail
- `/api/v1/feature_views`, `/api/v1/feature_views/all` — feature view listing and detail
- `/api/v1/feature_services`, `/api/v1/feature_services/all` — feature service listing
- `/api/v1/features`, `/api/v1/features/all` — individual feature listing
- `/api/v1/saved_datasets`, `/api/v1/data_sources` — dataset and data source access
- `/api/v1/lineage/complete`, `/api/v1/lineage/objects/featureView/:name` — lineage graph
- `/api/v1/metrics/resource_counts`, `/api/v1/metrics/popular_tags` — overview metrics
- `/api/v1/search` — cross-project global search

## Module Federation

This package does not publish a Webpack remote entry. It ships as a TypeScript library consumed
directly by the main dashboard's extension registry.

**Extensions file**: `packages/feature-store/extensions.ts`

**Remote entry name**: none — consumed as an internal package via monorepo `exports`.

**Exposed modules** (via `package.json` exports):

- `./extensions` — extension array loaded by the main dashboard plugin system
- `./routes` — route constants (`src/routes.ts`)
- `./types/*` — shared TypeScript types
- `./components/*` — shared UI components
- `./screens/lineage/*` — lineage graph components

**Main dashboard registration**: the main dashboard imports `./extensions` and registers each
entry via the `plugin-core` extension registry at startup.

## Architecture

```text
packages/feature-store/
├── extensions.ts             # Extension declarations (nav, routes, area flag)
├── src/
│   ├── api/
│   │   ├── custom.ts         # All Feast REST calls via proxyGET
│   │   └── errorUtils.ts     # Error normalisation for Feast responses
│   ├── apiHooks/             # useFetch wrappers (useFeatures, useFeatureViews, …)
│   ├── components/           # Shared UI: toolbar, labels, code block, search
│   ├── screens/
│   │   ├── metrics/          # Overview dashboard (resource counts, popular tags)
│   │   ├── entities/         # Entity list and detail pages
│   │   ├── features/         # Feature list and detail pages
│   │   ├── featureViews/     # FeatureView list, detail, lineage, materialisation
│   │   ├── featureServices/  # FeatureService list and detail pages
│   │   ├── dataSets/         # SavedDataset list and detail pages
│   │   ├── dataSources/      # DataSource list and detail pages
│   │   └── lineage/          # Full-project lineage graph
│   ├── hooks/                # Project-scoped access hooks
│   ├── types/                # TypeScript interfaces mirroring Feast API shapes
│   ├── utils/                # Filter, toolbar, lineage data conversion utilities
│   ├── FeatureStore.tsx      # Root component
│   ├── FeatureStoreRoutes.tsx # React Router route tree
│   ├── FeatureStoreContext.tsx # Project-scoped API state context
│   └── const.ts              # API version, label keys, FeatureStoreObject enum
├── docs/
│   └── overview.md           # This file
└── package.json
```

All API calls flow: React component → `apiHook` → `src/api/custom.ts` (`proxyGET`) → ODH
Dashboard backend proxy → Feast REST server. No write operations are performed; this package
is read-only against the feature store backend.

## Key Concepts

| Term | Definition |
|------|-----------|
| **FeatureStore CR** | Kubernetes custom resource discovered by the label `feature-store-ui=enabled`; its service URL is the proxy target. |
| **FeatureStoreProject** | A Feast project namespace; scopes all other objects. Selected via `FeatureStoreProjectSelector`. |
| **Entity** | A domain object (e.g. user, driver) that features are keyed on. Represented by `Entity` type in `src/types/entities.ts`. |
| **FeatureView** | A logical group of features computed from one or more data sources. Has materialisation config and lineage links. |
| **Feature** | An individual attribute within a `FeatureView`. Addressed as `featureViewName/featureName`. |
| **FeatureService** | A named collection of features from one or more `FeatureViews`; the serving contract for training/inference consumers. |
| **DataSource** | The raw data origin for a `FeatureView` (e.g. file, BigQuery table, request source). |
| **SavedDataset** | A historical snapshot of feature values used for offline training. |
| **Lineage** | A directed graph linking `DataSource → FeatureView → FeatureService`. Fetched from `/api/v1/lineage/complete`. |
| **FeatureStoreAPIState** | React context object (`useFeatureStoreAPIState`) that holds the resolved host path and bound API functions. |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- A running ODH Dashboard (main dashboard) connected to a cluster with a Feast-compatible
  feature store service labelled `feature-store-ui=enabled`.

### Start in federated mode

```bash
# From repo root
npm install
npm run dev
# Navigate to http://localhost:4010/develop-train/feature-store/overview
```

### Run with a mock feature store backend

Point the dashboard backend's proxy at a local Feast server or use recorded fixtures.
No package-level mock flag exists; mock data lives in `src/__mocks__/` for unit tests only.

## Environment Variables

This package exposes no environment variables of its own. Feature store visibility is controlled
by the `OdhDashboardConfig` feature flag `disableFeatureStore` and by the presence of a
Kubernetes service with the label `feature-store-ui=enabled` in the target namespace.

| Flag | Where set | Effect |
|------|-----------|--------|
| `disableFeatureStore` | `OdhDashboardConfig` CR | Hides the entire Feature Store nav section |
| `feature-store-ui=enabled` | Kubernetes Service label | Marks the Feast service the proxy routes to |

## Testing

### Unit Tests

```bash
npx turbo run test-unit --filter=@odh-dashboard/feature-store
```

Test files live alongside source files in `__tests__/` subdirectories and use the `.spec.ts` /
`.test.tsx` naming convention. Mocks are in `src/__mocks__/` (e.g. `mockFeatures.ts`,
`mockFeatureViews.ts`).

### Type Check

```bash
cd packages/feature-store
npm run type-check
```

No contract tests or Cypress tests exist for this package. Integration testing relies on the
main dashboard's end-to-end suite against a live Feast backend.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| ODH Dashboard backend | Proxy | All Feast REST calls flow through `proxyGET`; the backend resolves the host URL from the FeatureStore CR |
| Feast REST API | External service | Upstream API at `/api/v1/`; read-only; must be reachable from the cluster |
| `@odh-dashboard/internal` | Package | Provides `proxyGET`, `useFetch`, k8s types, and area/flag infrastructure |
| `@odh-dashboard/plugin-core` | Package | Extension point type definitions; drives nav registration and route mounting |
| Kubernetes FeatureStore CR | Kubernetes API | CR with label `feature-store-ui=enabled` supplies the proxy host path |

## Known Issues / Gotchas

- The `useFeatureStoreEnitites.ts` filename contains a typo (`Enities`) — do not rename without
  updating all import sites.
- All API calls include `include_relationships=true` for detail views; omitting it in new calls
  will produce incomplete lineage data.
- The lineage graph (`FeatureStoreLineageComponent`) depends on the `/api/v1/lineage/complete`
  endpoint being available. Older Feast versions may not expose this endpoint; the UI will show
  an empty graph without an error message.
- There is no write path — create, update, and delete operations are not supported. Feature store
  objects must be managed outside the dashboard (e.g. via the Feast SDK or CI pipelines).

## Related Docs

- [Guidelines] — documentation style guide
- [Module Federation Docs] — how Module Federation works in this monorepo
- [Backend Overview] — main dashboard backend reference
- [Model Registry] — sibling package; features can be linked to model versions via the registry
- [BOOKMARKS] — full doc index
