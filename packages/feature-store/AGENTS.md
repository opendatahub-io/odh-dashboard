# AGENTS.md -- Feature Store

Package-specific guidance for AI agents working on `@odh-dashboard/feature-store`.

## Key Constraints

- **Bundled library, not a Module Federation remote.** Do not create webpack configs, `moduleFederation.js`, dev servers, or `remoteEntry.js`. The package compiles directly into the host dashboard bundle.
- **No BFF.** There is no Go backend in this package. All API calls use `proxyGET` from `@odh-dashboard/internal/api/proxyUtils` and route through the main dashboard backend.
- **Read-only UI.** Never add create, update, or delete operations. The package only lists and inspects Feast objects.
- **Backend proxy code lives elsewhere.** Proxy routes are in `backend/src/routes/api/featurestores/`, not in this package. Changes to how Feast requests are proxied require modifying the main backend.
- **Workbench integration code lives elsewhere.** The spawner form integration is in `frontend/src/pages/projects/screens/spawner/featureStore/`. Changes to how workbenches connect to Feature Store require modifying the main frontend.

## Project Structure

```text
packages/feature-store/
├── extensions.ts                  # Plugin registration (area, nav, routes, task)
├── docs/overview.md               # Detailed architecture documentation
├── src/
│   ├── FeatureStore.tsx           # Main overview component (Metrics + Lineage tabs)
│   ├── FeatureStoreContext.tsx    # Context provider with state management
│   ├── FeatureStoreCoreLoader.tsx # RBAC checks, CR discovery, loading states
│   ├── FeatureStoreRoutes.tsx     # All route definitions
│   ├── EnsureAPIAvailability.tsx  # Loading wrapper for API readiness
│   ├── const.ts                   # Enums (FeatureStoreObject, FeatureStoreTabs)
│   ├── routes.ts                  # Route builder functions
│   ├── api/
│   │   ├── custom.ts             # All Feast API calls (20+ methods via proxyGET)
│   │   └── errorUtils.ts         # Error handling utilities
│   ├── apiHooks/
│   │   ├── useFeatureStoreAPIState.tsx  # Binds API methods with resolved hostPath
│   │   ├── useFeatureStoreCR.ts         # FeatureStore CR discovery
│   │   └── ...                          # Per-object hooks
│   ├── hooks/
│   │   └── useRegistryFeatureStores.ts  # Service discovery via backend
│   ├── components/                # Shared UI components
│   ├── screens/                   # Feature pages (entities, features, lineage, etc.)
│   ├── types/                     # TypeScript type definitions per object type
│   ├── utils/                     # Display helpers, filtering, context utilities
│   ├── icons/header-icons/        # Icon components
│   └── __mocks__/                 # Test mock data
```

## Extension System

Extensions are defined in `extensions.ts` and register:
- **Area**: `plugin-feature-store` (reliant on `SupportedArea.FEATURE_STORE`, disabled by `disableFeatureStore` flag)
- **Navigation section**: Under `develop-and-train`
- **7 navigation items**: Overview, Entities, Features, Feature Views, Feature Services, Data Sources, Datasets
- **1 route**: `/develop-train/feature-store/*` -> `FeatureStoreRoutes`
- **1 task item**: "Build reusable ML features"

## API Pattern

All API calls in `src/api/custom.ts` follow this pattern:

```text
getEntities(hostPath)(opts, project?) -> proxyGET(`${hostPath}/api/v1/entities?include_relationships=true&project=...`)
```

Curried helpers in `src/api/custom.ts`; see `getEntities` for full `K8sAPIOptions` / return types.

- `hostPath` is resolved at runtime to `/api/featurestores/{namespace}/{projectName}`
- The main dashboard backend proxies this to the Feast REST service
- Always include `include_relationships=true` for detail views (lineage data depends on it)
- Lineage graph requires `/api/v1/lineage/complete`

## Development

```bash
# From repo root
npm run dev              # Starts backend + frontend (feature-store compiles into host)
npm run lint             # Lint all packages
npm run type-check       # Type check all packages

# From this package directory
npm run lint             # Lint feature-store only
npm run test-unit        # Run unit tests
npm run type-check       # Type check feature-store only
```

## Notes for agents

- Filename typo: `useFeatureStoreEnitites.ts` -- fix only with a coordinated rename of all imports across the package.
- See [Developer notes](docs/overview.md#developer-notes) in `docs/overview.md`.

## Related Code (Outside This Package)

| Area | Location | Purpose |
|------|----------|---------|
| Backend proxy | `backend/src/routes/api/featurestores/` | Discovery + proxy to Feast REST API |
| Workbench integration | `frontend/src/pages/projects/screens/spawner/featureStore/` | Feature Store selector in workbench spawner form |
| Workbench API | `frontend/src/api/featureStore/custom.ts` | `getWorkbenchFeatureStores()` endpoint |
| Area/flag config | `frontend/src/concepts/areas/` | `SupportedArea.FEATURE_STORE` definition |
