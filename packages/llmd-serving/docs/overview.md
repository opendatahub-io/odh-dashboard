[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[Model Serving]: ../../model-serving/docs/overview.md
[KServe Package]: ../../kserve/docs/overview.md

# LLMD Serving

**Last Updated**: 2026-04-10 | **Template**: package-template v2

## Overview

The `llmd-serving` package implements the LLM-d (LLM-dedicated) serving platform: a KServe-backed extension to `model-serving` that creates and manages `LLMInferenceService` resources (`serving.kserve.io/v1alpha1`). Use it for generative models that need LLM-d scheduling, gateway routing, and token-auth wiring rather than generic KServe or ModelMesh paths.

**Package path**: `packages/llmd-serving/`

## Deployment Modes

| Mode | How to start | Notes |
|------|-------------|-------|
| Federated | `npm run dev` from repo root | Main dashboard loads `model-serving` and this package’s extensions; `SupportedArea.K_SERVE` and `disableLLMd` gate visibility |

No standalone or Kubeflow mode; registration is through the main dashboard’s model-serving extension framework.

## Design Intent

No BFF: CRUD for `LLMInferenceService` lives in `src/api/` and uses the OpenShift dynamic plugin SDK from the browser against the main dashboard’s in-cluster credentials.

`extensions/extensions.ts` registers `model-serving.platform/watch-deployments`, `model-serving.deployment/deploy`, `model-serving.deployment/form-data`, `model-serving.deployment/wizard-field`, and `model-serving.deployments-table/start-stop-action`. The host `model-serving` package orchestrates those points; this package supplies LLM-d-specific behavior only.

There is no Webpack remote entry. The dashboard loads the package via monorepo exports (e.g. `./extensions`, `./types`, test helpers under `./__tests__/utils`). API group is `serving.kserve.io`, resource `llminferenceservices`, version `v1alpha1`; shapes are defined in `src/types.ts` as `LLMInferenceServiceKind`.

## Key Concepts

| Term | Definition |
|------|-----------|
| **LLMInferenceService** | CR `serving.kserve.io/v1alpha1` / `llminferenceservices`; deployed LLM-d model. |
| **LLMdDeployment** | `Deployment<LLMInferenceServiceKind>` with `modelServingPlatformId = 'llmd-serving'`. |
| **LLMdContainer** | Container in `spec.template.containers`; vLLM args via `VLLM_ADDITIONAL_ARGS`. |
| **Router** | `spec.router` with `gateway`, `route`, `scheduler`; LLM-d routing layer. |
| **Token authentication** | Secrets via `deployUtils.setUpTokenAuth`; wizard `tokenAuthField`. |
| **Deployment strategy** | Rolling vs recreate via `deploymentStrategyField`. |
| **MaaS tier** | `MAAS_TIERS_ANNOTATION` when `model-as-service` area is active. |
| **Hardware profile paths** | `LLMD_INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS` JSONPaths for `applyHardwareProfileConfig`. |
| **External route** | Public route via LLM-d gateway; `externalRouteField`. |
| **isLLMdDeployActive** | `deployUtils.ts`; true only when `disableLLMd` is off and `K_SERVE` area exists. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `@odh-dashboard/model-serving` | Package | Extension-point interfaces this package implements |
| `@odh-dashboard/kserve` | Package | Shared KServe utilities and types |
| `@odh-dashboard/internal` | Package | Hardware profiles, k8s types, flags / areas |
| `LLMInferenceService` CRD | Kubernetes API | Group `serving.kserve.io`, `v1alpha1` |
| `packages/maas` | Package | MaaS tier annotation when model-as-service flag is on |
| Main ODH Dashboard | Host application | Loads extensions; model-serving wizard and table |

## Known Issues / Gotchas

- **CRD required**: If `LLMInferenceService` is missing but the area is enabled, `useWatchDeployments` can hit 404.
- **Token auth RBAC**: `setUpTokenAuth` creates Secrets after the CR may exist; missing `create secrets` leaves a partial deployment.
- **`spec.router`**: Base shape initializes empty `scheduler`, `route`, `gateway`; omitting them can cause operator rejection.
- **`VLLM_ADDITIONAL_ARGS`**: Injected on container named `main`; operator renames break arg injection silently.
- **Patch vs merge**: `patchLLMInferenceService` uses JSON Patch; `updateLLMInferenceService` uses merge patch—use wizard `overwrite: true` on redeploy to avoid stale fields.

## Related Docs

- [Guidelines] — documentation style guide
- [Model Serving] — extension points this package implements
- [KServe Package] — shared KServe utilities
- [Module Federation Docs] — federation in the monorepo
- [Backend Overview] — main dashboard backend
- [BOOKMARKS] — full doc index
