[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[KServe Package]: ../../kserve/docs/overview.md
[Model Registry Package]: ../../model-registry/docs/overview.md

# Model Serving

**Last Updated**: 2026-04-10 | **Template**: package-template v2

## Overview

`@odh-dashboard/model-serving` is the Model Serving UI for ODH Dashboard: serving runtimes, deploy wizard, inference endpoints, and deployment status across projects. It replaces deprecated `frontend/src/pages/modelServing/`.

**Package path**: `packages/model-serving/`

## Deployment Modes

| Mode | How to start | Notes |
|------|-------------|-------|
| Federated | `npm run dev` (repo root) | Only supported mode; package is a library consumed by the main dashboard. |
| Standalone | — | Not supported — no BFF or dev server in this package. |

Always develop against the main dashboard so routing, auth, and the Kubernetes proxy match production. The host builds or links this workspace package at compile time.

## Design Intent

There is **no package-local BFF**. All API traffic goes through the main dashboard backend (e.g. `/api/k8s/`) or equivalent cluster proxy; the UI never talks to a dedicated model-serving Go/Node service.

This package is **not** exposed as a separate Webpack remote entry. It is imported as `@odh-dashboard/model-serving` and registers extensions via the dynamic plugin SDK (`extensions/index.ts` aggregates `extensions/odh.ts`, `model-registry.ts`, `model-catalog.ts`). Platform packages (notably `packages/kserve`) implement extension points such as `model-serving.platform`, `watch-deployments`, and `deployment/deploy` so the shared wizard and deployments table can create `InferenceService` / `ServingRuntime` resources the right way for KServe vs other platforms. Data flows: Kubernetes → main backend → React; platform-specific behaviour is injected through those extension points rather than branching inside every component.

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

## Related Docs

- [Guidelines] — documentation style guide
- [Module Federation Docs] — federation patterns in the monorepo
- [Backend Overview] — main backend / k8s proxy
- [KServe Package] — KServe platform extensions
- [Model Registry Package] — registry → deploy integration
- [BOOKMARKS] — full doc index
