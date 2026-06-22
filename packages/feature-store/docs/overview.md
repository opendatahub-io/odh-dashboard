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

## Related Code (Outside This Package)

### Workbench Integration

Located in [`frontend/src/pages/projects/screens/spawner/featureStore/`](../../../frontend/src/pages/projects/screens/spawner/featureStore/), this code integrates Feature Store into the workbench (notebook) spawner form:

| File | Purpose |
|------|---------|
| `FeatureStoreSelector.tsx` | Multi-select dropdown for choosing Feature Store instances |
| `useWorkbenchFeatureStores.ts` | Hook that calls `GET /api/featurestores/workbench-integration` |
| `FeatureStoreCodeBlock.tsx` | Displays example Feast SDK Python code |
| `utils.ts` | Generates notebook metadata: label `opendatahub.io/feast-integration=true`, annotation `opendatahub.io/feast-config=<project-names>` |
| `FeatureStoreFormSection.tsx` | Wraps selector and code block in the spawner form |

The workbench API endpoint is defined in [`frontend/src/api/featureStore/custom.ts`](../../../frontend/src/api/featureStore/custom.ts).

### Backend Proxy Architecture

Located in [`backend/src/routes/api/featurestores/`](../../../backend/src/routes/api/featurestores/), the backend provides four endpoints:

| Endpoint | File | Purpose |
|----------|------|---------|
| `GET /api/featurestores/` | `featureStores.ts` | Discovery -- lists all available Feast instances |
| `GET /api/featurestores/:namespace/:projectName/*` | `featureStores.ts` | Proxy -- forwards requests to the Feast REST API |
| `GET /api/featurestores/workbench-integration` | `fsworkbenchIntegration.ts` | Returns accessible Feature Stores for the workbench spawner (filtered by user RBAC) |
| `GET /api/featurestores/projects-with-workbenches` | `connectedWorkbenches.ts` | Merged view of accessible Feast projects, user permissions, and connected workbenches |

**Discovery flow:**
1. Reads `feast-configs-registry` ConfigMap from the dashboard namespace
2. Parses JSON to get `{ namespace -> [configmap-names] }` mapping
3. Fetches each named ConfigMap, parses the `feature_store.yaml` key to extract `registryUrl` and `projectName`
4. Lists `feast.dev/v1 FeatureStore` CRDs filtered by label `feature-store-ui=enabled`
5. Cross-references CRDs with configs and returns available Feature Stores

**Proxy flow:**
1. Receives a request like `GET /api/featurestores/feast-ns/my-project/api/v1/entities`
2. Looks up the registry URL for that namespace/project
3. Extracts service info (service name, namespace, port) from the registry URL
4. Constructs a target URL using Kubernetes internal DNS (`<service>.<namespace>.svc.cluster.local`)
5. Makes an authenticated HTTP request with the user's bearer token
6. Forwards the Feast response back to the browser

**Local development:** The backend detects local dev mode (`NODE_ENV=development` or missing `KUBERNETES_SERVICE_HOST`) and routes to `localhost` instead of cluster DNS. Set `FEAST_REGISTRY_SERVICE_PORT` to match your `oc port-forward` target.

Shared utilities are in `featureStoreUtils.ts`: ConfigMap parsing, service info extraction, proxy URL construction, and authenticated HTTP requests.

## Developer notes

- Detail views rely on `include_relationships=true`; omitting it yields incomplete lineage-related data.
- Lineage graph needs `/api/v1/lineage/complete`; older Feast builds may show an empty graph without a clear error.
- No write path in the UI — manage objects outside the dashboard (Feast SDK, CI, etc.).
- Nav visibility: `disableFeatureStore` on `OdhDashboardConfig` and the `feature-store-ui=enabled` service label.
