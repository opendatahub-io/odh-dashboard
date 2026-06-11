# Feature Store (`@odh-dashboard/feature-store`)

Read-only UI for browsing and inspecting ML features backed by a [Feast](https://feast.dev/)-compatible REST API. Users can discover feature groups, explore lineage, and understand how features relate to models.

## Architecture

Feature Store is a **bundled library package** -- not a Module Federation remote. It compiles directly into the main dashboard bundle at build time. There is no separate webpack config, dev server, or `remoteEntry.js`.

- **No BFF**: All API calls use `proxyGET` from `@odh-dashboard/internal/api/proxyUtils`. Traffic flows: browser -> main dashboard backend -> Feast REST API (`/api/v1/...`).
- **Read-only**: List and inspect projects, entities, feature views, features, feature services, data sources, saved datasets, lineage, and metrics. No create/update/delete.
- **Discovery**: The backend resolves the upstream Feast host from a Kubernetes `FeatureStore` CR with label `feature-store-ui=enabled`.

### Data Flow

```text
Browser
  -> GET /api/featurestores                           (discovery)
  -> Dashboard Backend
     -> Reads feast-configs-registry ConfigMap
     -> Lists FeatureStore CRDs (label: feature-store-ui=enabled)
     -> Returns available Feast instances with registry URLs

Browser
  -> GET /api/featurestores/:namespace/:project/api/v1/entities  (proxy)
  -> Dashboard Backend
     -> Proxies to Feast REST service (in-cluster DNS)
     -> Forwards response to browser
```

## Pages

Registers under **Develop & Train > Feature Store** in the sidebar:

| Page | Path |
|------|------|
| Overview | `/develop-train/feature-store/overview` |
| Entities | `/develop-train/feature-store/entities` |
| Features | `/develop-train/feature-store/features` |
| Feature Views | `/develop-train/feature-store/feature-views` |
| Feature Services | `/develop-train/feature-store/feature-services` |
| Data Sources | `/develop-train/feature-store/data-sources` |
| Datasets | `/develop-train/feature-store/datasets` |

## Development

No separate dev server is needed. Feature Store code is compiled into the host dashboard.

### Prerequisites

- Node.js >= 22, npm >= 10
- A cluster with a Feast service deployed (`FeatureStore` CR with label `feature-store-ui=enabled`)

### Running locally

```bash
# From repo root -- starts both backend and frontend
npm run dev
```

For local development, the backend needs to reach the Feast service. Since Feast runs inside the cluster, use the port-forward script to discover and wire up all active Feature Stores automatically:

```bash
# Discover all enabled FeatureStores, port-forward them, and update .env.local
./packages/feature-store/scripts/feast-dev-portforward.sh

# Check status of active forwards (from a second terminal)
./packages/feature-store/scripts/feast-dev-portforward.sh status

# Stop all forwards (or press Ctrl+C in the running terminal)
./packages/feature-store/scripts/feast-dev-portforward.sh stop
```

If setting up `.env.local` manually, each FeatureStore needs a port variable named after its registry service — e.g. `FEAST_FEAST_<NAME>_REGISTRY_REST_PORT=6570`. Otherwise the script handles this automatically.

See [`scripts/feast-dev-portforward.md`](scripts/feast-dev-portforward.md) for full usage, options, env var naming details, and the two-terminal workflow.

### Scripts

```bash
npm run lint          # Lint
npm run lint:fix      # Lint and auto-fix
npm run test-unit     # Run unit tests
npm run type-check    # TypeScript type checking
```

## Package Exports

| Export | Path |
|--------|------|
| `./extensions` | `extensions.ts` |
| `./routes` | `src/routes.ts` |
| `./types/*` | `src/types/` |
| `./components/*` | `src/components/` |
| `./screens/components/*` | `src/screens/components/` |
| `./screens/lineage/*` | `src/screens/lineage/` |
| `./icons/header-icons/*` | `src/icons/header-icons/` |
| `./mocks/*` | `src/__mocks__/` |

## Related Code

| Area | Location |
|------|----------|
| Detailed architecture docs | [`docs/overview.md`](docs/overview.md) |
| Backend proxy routes | [`backend/src/routes/api/featurestores/`](../../backend/src/routes/api/featurestores/) |
| Workbench integration | [`frontend/src/pages/projects/screens/spawner/featureStore/`](../../frontend/src/pages/projects/screens/spawner/featureStore/) |
| Workbench API | [`frontend/src/api/featureStore/`](../../frontend/src/api/featureStore/) |

## Dependencies

- `@odh-dashboard/internal` -- `proxyGET`, `useFetch`, K8s types, area/flag infrastructure
- `@odh-dashboard/plugin-core` -- Extension types, nav and route mounting
