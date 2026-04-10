# KServe

## Overview

- Implements the KServe single-model serving platform as a pluggable extension of `@odh-dashboard/model-serving`.
- Provides UI logic and Kubernetes API usage to deploy, configure, monitor, and delete models using KServe `InferenceService` resources (one dedicated model server per deployment).

## Design Intent

- **No Go BFF:** all Kubernetes work (`InferenceService`, `ServingRuntime`, `Pod`, `Secret`, `ServiceAccount`, `Role`, `RoleBinding`) goes through the main dashboard backend proxy at `/api/k8s/` using `@openshift/dynamic-plugin-sdk-utils` from the browser.
- **Deployment flow:**
  - `model-serving` collects wizard data and calls `deployKServeDeployment` (via the `model-serving.deployment/deploy` extension).
  - Orchestration creates or patches `ServingRuntime` and `InferenceService`, then optional token-auth resources.
  - After deploy, `useWatchDeployments` watches `InferenceService`, `ServingRuntime`, and labeled `Pod` resources and merges them into `KServeDeployment` objects.
- **No package Module Federation remote:** `model-serving` consumes this package as a TypeScript dependency; `extensions.ts` exports the extension manifest registered by the parent.
  - Notable exports: `@odh-dashboard/kserve/extensions`, `@odh-dashboard/kserve/deployUtils` (shared helpers for other packages).
- **Feature gating:** `OdhDashboardConfig` (`disableKServe`, `disableKServeMetrics`) and `SupportedArea` values (`K_SERVE`, `K_SERVE_METRICS`) in `extensions.ts` via `flags.required`.

## Key Concepts

| Term | Definition |
|------|-----------|
| **InferenceService** | Core KServe CRD (`serving.kserve.io/v1beta1`): model, runtime, storage, replicas, scaling for one deployment. |
| **ServingRuntime** | Namespace-scoped KServe CRD; template for the model server container. Each KServe deployment creates its own alongside the `InferenceService`. |
| **KServeDeployment** | TypeScript type combining `InferenceService`, optional `ServingRuntime`, status, and endpoints. |
| **Predictor** | `spec.predictor` on `InferenceService`: model URI, runtime ref, resources, replicas, deployment strategy. |
| **Token auth** | Optional bearer protection via `ServiceAccount`, `Role`, `RoleBinding`, `Secret`; `security.opendatahub.io/enable-auth` annotation. |
| **External route** | Inference exposed outside cluster via `networking.kserve.io/visibility: exposed` on `InferenceService`. |
| **Deployment strategy** | `RollingUpdate` or `Recreate` in `spec.predictor.deploymentStrategy`. |
| **AI asset** | `InferenceService` tagged `opendatahub.io/genai-asset: true` for Gen AI; optional `opendatahub.io/genai-use-case`. |
| **KSERVE_ID** | Platform id `'kserve'` in extension registrations and `modelServingPlatformId`. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `@odh-dashboard/model-serving` | Parent package | Registers KServe extensions; wizard, types, auth utilities |
| `@odh-dashboard/internal` | Shared library | K8s types, API helpers, feature flags, RBAC |
| Main dashboard backend (`/api/k8s/`) | HTTP proxy | All cluster API traffic from the browser |
| `@odh-dashboard/model-registry` | Sibling package | Pre-filled deploy wizard data for registered model versions |
| `InferenceService`, `ServingRuntime`, `Pod`, `Secret`, `ServiceAccount`, `Role`, `RoleBinding` | Kubernetes API | CRUD / watch as described in Design Intent |

## Known Issues / Gotchas

- **ServingRuntime coupling**: Deleting a deployment removes both CRs; if `ServingRuntime` delete fails, an orphan may remain and be reused on redeploy with the same name.
- **Dry-run RoleBinding 404**: With `dryRun` and non-admin users, `RoleBinding` creation can 404 when the `Role` is absent in dry-run; `createRoleBindingIfMissing` in `deployUtils.ts` swallows that so validation can proceed.
- **No standalone mode**: Must run main dashboard + `model-serving`.
- **`modelmesh-enabled: false`**: Project needs this label for KServe to be active; otherwise ModelMesh is default (set when choosing single-model serving in project settings).
- **`patchInferenceService` no-op**: Zero JSON patches skips the network call and returns the new object.
