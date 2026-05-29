# Model Serving

## Overview

- `@odh-dashboard/model-serving` is the Model Serving UI for ODH Dashboard: serving runtimes, deploy wizard, inference endpoints, and deployment status across projects.
- Replaces deprecated `frontend/src/pages/modelServing/`.

## Design Intent

- **No package-local BFF:** all API traffic goes through the main dashboard backend (e.g. `/api/k8s/`) or equivalent cluster proxy; the UI never talks to a dedicated model-serving Go/Node service.
- **Not a separate Webpack remote:** imported as `@odh-dashboard/model-serving`; registers extensions via the dynamic plugin SDK (`extensions/index.ts` aggregates `extensions/odh.ts`, `model-registry.ts`, `model-catalog.ts`).
- Platform packages (notably `packages/kserve`) implement extension points such as `model-serving.platform`, `watch-deployments`, and `deployment/deploy` so the shared wizard and deployments table create `InferenceService` / `ServingRuntime` resources correctly for KServe vs other platforms.
- **Data flow:** Kubernetes → main backend → React; platform-specific behaviour is injected through those extension points instead of branching inside every component.

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

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host | Routing, auth, k8s proxy; loads extensions at startup. |
| `packages/kserve` | Platform | KServe: platform, watch-deployments, deploy, wizard hooks, etc. |
| `packages/model-registry` | Package | Deploy-from-registry flow; `PreWizardDeployModal` and `modelRegistry/` integration. |
| Main dashboard backend | HTTP proxy | `InferenceService` / `ServingRuntime` CRUD via `/api/k8s/`. |
| Kubernetes | API | CRUD + watches on serving CRDs and related resources. |
| `OdhDashboardConfig` | Config | `disableModelServing` gates the area. |

## Known Issues / Gotchas

- Deprecated `frontend/src/pages/modelServing/` may still exist; redirect to `/ai-hub/deployments/` lives in `extensions/odh.ts` — extend `packages/model-serving/` only.
- ModelMesh migration is incomplete; some ModelMesh UI may still live in `@odh-dashboard/internal` — confirm before large ModelMesh work.
- Platforms must register required extension points or the wizard has no deploy target; watch console for unresolved-extension warnings.
- `model-serving.deployment/wizard-field2` supersedes `wizard-field`; a rename is tracked in code (TODO) — treat `wizard-field2` as transitional naming.
