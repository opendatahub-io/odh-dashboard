# Model Serving

## Overview

- `@odh-dashboard/model-serving` is the Model Serving UI for ODH Dashboard: serving runtimes, deploy wizard, inference endpoints, and deployment status across projects.
- Replaces deprecated `frontend/src/pages/modelServing/`.

## Design Intent

- **No package-local BFF:** all API traffic goes through the main dashboard backend (e.g. `/api/k8s/`) or equivalent cluster proxy; the UI never talks to a dedicated model-serving Go/Node service.
- **Module Federation remote (hybrid):** model-serving operates in two modes. The `src/` subtree is consumed directly as a library via package `exports`. The `frontend/` subtree builds as a standalone MF remote (`modelServing`) producing `remoteEntry.js` on port 9109, exposing `./extensions` and `./extension-points`. Shared dependencies (React, PatternFly, all `@odh-dashboard/*` packages) are managed automatically by `OdhFederationPlugin` as singletons.
- **Hub-and-spoke architecture:** model-serving is the hub. Platform packages (`packages/kserve`, `packages/nim-serving`, `packages/llmd-serving`) are spokes that implement extension points such as `model-serving.platform`, `watch-deployments`, and `deployment/deploy`. These platform packages form a **cohort** with model-serving — they are added and removed together.
- **Data flow:** Kubernetes → main backend → React; platform-specific behaviour is injected through extension points instead of branching inside every component.

## Key Concepts

| Term | Definition |
|------|-----------|
| **ServingRuntime** | CRD template for a model server (image, formats, defaults). |
| **InferenceService** | CRD for one deployed model endpoint; primary resource managed here. |
| **KServe** | Single-model serving; each `InferenceService` in its own pod (`packages/kserve`). |
| **ModelMesh** | Multi-model serving sharing server pods. |
| **Endpoint URL** | HTTP(S) URL for inference; shown in table and detail views. |
| **Deployment** | Package abstraction `Deployment<M, S>` wrapping model + server + status + endpoints. |
| **Platform extension** | `model-serving.platform` (and related) registered by a platform package. |
| **Extension point** | Interfaces in `extension-points/index.ts` for wizard, table, delete, auth, metrics. |
| **Feature flag** | `disableModelServing` in `OdhDashboardConfig` hides the entire area. |

## Extension Points Defined

model-serving defines extension points that platform packages implement.

### Platform Registration & Status

| Type String | Purpose |
|---|---|
| `model-serving.platform` | Registers a serving platform with ID, project requirements, enable card text, and deployed models view |
| `model-serving.platform/watch-deployments` | Watch hook returning `[deployments, loaded, errors]` for a platform |
| `model-serving.platform/fetch-deployment-status` | Fetch a single deployment by name and namespace |
| `model-serving.platform/exclude-deployment` | Filter resources from another platform's listing to prevent duplicates |
| `model-serving.platform/delete-deployment` | Delete deployment action and modal per platform |
| `model-serving.auth` | Platform-specific authentication check |
| `model-serving.metrics` | Declares that a platform supports metrics |

### UI Customization

| Type String | Purpose |
|---|---|
| `model-serving.deployments-table` | Platform-specific table columns |
| `model-serving.deployments-table/start-stop-action` | Start/stop toggle per platform |
| `model-serving.deployed-model/serving-runtime` | Serving runtime details component per platform |
| `model-serving.platform/project-details-tab` | Override project details tab per platform |
| `model-serving.platform/overview-section` | Override overview section per platform |
| `model-serving.platform/global-models-page` | Override global models page per platform |

### Deployment Wizard

| Type String | Purpose |
|---|---|
| `model-serving.deployment/form-data` | Extract form data from existing deployments |
| `model-serving.deployment/deploy` | Execute deployment with full wizard state |
| `model-serving.deployment/assemble-model-resource` | Assemble the K8s model resource from wizard data |
| `model-serving.deployment/wizard-field` | Add a standalone dynamic wizard field |
| `model-serving.deployment/wizard-field-override` | Override specific wizard fields per platform |
| `model-serving.deployment/wizard-field-apply` | Apply wizard field data to deployment during assembly |
| `model-serving.deployment/wizard-field-extractor` | Extract initial data from deployment for wizard fields |
| `model-serving.deployment/wizard-field-deployment-functions` | Pre/post-deploy hooks per wizard field |
| `model-serving.deployment/transform` | Transform deployment after assembly |
| `model-serving.deployment/tracking-properties` | Platform-specific analytics tracking properties |

## Extension Points Consumed

model-serving registers extensions consuming these extension points:

| Extension Type | Purpose |
|---|---|
| `app.area` | `SupportedArea.MODEL_SERVING` gated by `disableModelServing` |
| `app.project-details/tab` | "Deployments" tab in project details |
| `app.project-details/overview-section` | "Serve Models" section in project details |
| `app.tab-route/tab` | "Deployments" tab in Models tabbed page; "General settings" tab in admin settings |
| `app.tab-route/page` | "Model deployment settings" admin page |
| `app.route` | Deployment wizard route, old URL redirects |
| `model-registry.model-version/deploy-modal` | Deploy modal integration in model registry |
| `model-registry.model-version/deployments-context` | Deployments context provider for model registry |
| `core.detail/tab` | "Deployments" tab in model registry version/model details |
| `core.detail-card` | Deployment card in model registry model details |
| `core.table-column` | Deployments column in registered models table |
| `core.action` | "Deploy model" action for model catalog items |

## Public Export Surface

The `package.json` `exports` field defines the public API. Key categories:

| Export Path | Category | Purpose |
|---|---|---|
| `./extensions` | Extensions | Extension manifest (aggregates `odh.ts`, `model-registry.ts`, `model-catalog.ts`) |
| `./extension-points`, `./extension-points/deployment-wizard` | Extension contracts | Type definitions and type guards for all `model-serving.*` extension points |
| `./shared`, `./shared/types`, `./shared/types/form-data` | Shared types | K8s resource types, wizard form data types, enums, utilities |
| `./shared/types/deploy-prefill` | Types | `ModelDeployPrefillInfo` for deploy-from-registry/catalog flow |
| `./shared/components` | Components | `ModelServingPlatformSelectErrorAlert`, `ModelStatusIcon`, `TokensDescriptionItem` |
| `./shared/wizard-fields` | Types | `ModelTypeFieldData`, `ModelServerSelectFieldData` for wizard field extensions |
| `./concepts/auth`, `./concepts/versions` | Utilities | Token auth setup, serving runtime version extraction |
| `./hooks/useServingPlatformStatuses`, `./hooks/useIsNIMAvailable` | Hooks | Platform status and NIM availability |
| `./utils` | Utilities | Deployment status helpers |
| `./components/metrics/*` | Components | Performance, bias, and NIM metrics charts, tabs, and configuration |
| `./components/connectionTypes/*` | Components | OCI and S3 connection UI fields |
| `./__mocks__/*` | Test mocks | Mock factories for InferenceService, ServingRuntime, Prometheus responses |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host | Routing, auth, k8s proxy; loads extensions at startup. |
| `packages/kserve` | Platform (cohort) | KServe: platform, watch-deployments, deploy, wizard hooks, metrics, auth, delete. |
| `packages/nim-serving` | Platform (cohort) | NIM: platform, wizard-field-override, wizard-field, tracking-properties. |
| `packages/llmd-serving` | Platform (cohort) | LLM-d: platform, wizard-field-override, wizard-field, tracking-properties. |
| `packages/model-registry` | Package | Deploy-from-registry flow; `PreWizardDeployModal` and `modelRegistry/` integration. |
| `@odh-dashboard/plugin-core` | Shared | Extension system: `useExtensions`, `useResolvedExtensions`, `SupportedArea`. |
| `@odh-dashboard/k8s-core` | Shared | K8s resource base types, API utilities, kueue types. |
| `@odh-dashboard/ui-core` | Shared | Shared UI components, table utilities, design tokens. |
| `@odh-dashboard/foundation` | Shared | Base utilities. |
| `@odh-dashboard/hardware-profiles` | Shared | Hardware profile types and hooks used in wizard extension-point definitions. |
| `@odh-dashboard/trustyai` | Shared | TrustyAI context and hooks for bias metrics. |
| Main dashboard backend | HTTP proxy | `InferenceService` / `ServingRuntime` CRUD via `/api/k8s/`. |
| Kubernetes | API | CRUD + watches on serving CRDs and related resources. |
| `OdhDashboardConfig` | Config | `disableModelServing` gates the area. |

## Module Federation

| Property | Value |
|---|---|
| MF name | `modelServing` |
| Local dev port | 9109 |
| Remote entry | `remoteEntry.js` |
| Exposed modules | `./extensions`, `./extension-points` |
| Build | `make build` (standalone MF remote) |
| Dev server | `make dev-start-federated` |

### Dependency Boundary Status

| Criterion | Status |
|---|---|
| Zero imports from `@odh-dashboard/internal` in `src/` | Clean (3 imports in `cypress/` only — test mocks) |
| Zero imports from `@odh-dashboard/model-registry` | Clean |
| Standalone MF build | Working (`remoteEntry.js` + `mf-manifest.json` produced) |
| Host removal without breaking other packages | Not yet achieved — `frontend/src/` has legacy imports (hybrid mode) |

## Known Issues / Gotchas

- Deprecated `frontend/src/pages/modelServing/` may still exist; redirect to `/ai-hub/deployments/` lives in `extensions/odh.ts` — extend `packages/model-serving/` only.
- ModelMesh migration is incomplete; some ModelMesh UI may still live in `@odh-dashboard/internal` — confirm before large ModelMesh work.
- Platforms must register required extension points or the wizard has no deploy target; watch console for unresolved-extension warnings.
- `model-serving.deployment/wizard-field2` supersedes `wizard-field`; a rename is tracked in code (TODO) — treat `wizard-field2` as transitional naming.
- **Hybrid architecture:** The `src/` library exports and `frontend/` MF remote coexist. Platform packages consume `src/` exports at build time. Full MF remote isolation requires eliminating legacy `frontend/src/pages/modelServing/` imports from the host.
- **K8s types coupling:** `InferenceServiceKind` and `ServingRuntimeKind` are defined in `shared/types.ts` and imported by many packages. Moving these to `@odh-dashboard/k8s-core` would reduce cross-package coupling.
