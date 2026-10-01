# LLMD Serving

## Overview

- The `llmd-serving` package implements LLM-d (LLM-dedicated) serving: KServe-backed extension to `model-serving` that creates and manages `LLMInferenceService` resources (`serving.kserve.io/v1alpha2`).
- For generative models that need LLM-d scheduling, gateway routing, and token-auth wiring rather than generic KServe or ModelMesh paths.

## Design Intent

- **No package-local BFF**: CRUD uses the Kubernetes SDK through the host's authenticated caller proxy. Gateway discovery uses the domain service owned by `model-serving`.
- **Extension points**: `extensions/extensions.ts` registers `model-serving.platform/watch-deployments`, `model-serving.deployment/deploy`, `model-serving.deployment/form-data`, `model-serving.deployment/wizard-field`, and `model-serving.deployments-table/start-stop-action`; host `model-serving` orchestrates; this package supplies LLM-d-specific behavior only.
- **No Module Federation remote**: Dashboard loads via monorepo exports (e.g. `./extensions`, `./types`, test helpers under `./__tests__/utils`).
- **API**: Group `serving.kserve.io`, resource `llminferenceservices`, version `v1alpha2`; shapes in `src/types.ts` as `LLMInferenceServiceKind`.

## Modular Dependency Boundaries

- Follow the repository [package topology](../../../docs/package-topology.md): `llmd-serving` is a
  spoke of the `model-serving` hub, and feature packages may depend on core shared libraries.
- Activation depends on the `model-serving` hub plus this package's own resource capability,
  not the sibling `kserve` UI package or its area flag. The Kubernetes API group remains
  `serving.kserve.io`; API ownership is independent of frontend package ownership.
- Remaining `@odh-dashboard/internal` imports are transitional; do not introduce new uses.

| Legacy import                                               | Modular import                                         | Symbols                                     |
| ----------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------- |
| `@odh-dashboard/internal/api/k8sUtils`                      | `@odh-dashboard/k8s-core/api/k8sUtils`                 | `createPatchesFromDiff`, `groupVersionKind` |
| `@odh-dashboard/internal/api/models`                        | `@odh-dashboard/k8s-core/api/models`                   | `PodModel`                                  |
| `@odh-dashboard/internal/utilities/useK8sWatchResourceList` | `@odh-dashboard/ui-core/hooks/useK8sWatchResourceList` | `useK8sWatchResourceList`                   |
| `@odh-dashboard/internal/redux/selectors/project` | `@odh-dashboard/plugin-core/host-api` | `useDashboardNamespace` |
| `@odh-dashboard/internal/concepts/userSSAR` | `@odh-dashboard/plugin-core/host-api`, `@odh-dashboard/k8s-core/api/accessReview` | `useAccessReviewState`, `verbModelAccess` |
| `@odh-dashboard/internal/api/proxyUtils` | `@odh-dashboard/model-serving/api/gatewayDiscovery` | Fixed gateway discovery contract |

## Host Capabilities And Authorization

- RHOAI supplies the operator namespace from its existing project selector. RHAII obtains it from authenticated `/api/status`; its fallback namespace is configuration only, never an authorization result. Deployment/project namespaces remain owned by model-serving.
- The llmd extension declares its required API (`serving.kserve.io/v1alpha2/llminferenceservices`) through the generic `app.resource-capability` extension point. Both hosts run discovery and caller-scoped SSARs; plugin-core contains no llmd resource names.
- Capability states are `loading`, `available`, `missing`, `forbidden`, and `error`. Only `available` enables the plugin's functional extensions. The declaration requires `list` and `watch`, either cluster-wide or in an accessible project, matching the project-scoped deployment watches. Hosts supply candidate namespaces from their existing project lists; every candidate still requires SSAR. This check does not grant access to other namespaces or mutation permissions.
- `ADMIN_USER` and area flags control presentation only. Configuration routes and row actions use strict SSAR states (`loading`, `allowed`, `denied`, `error`), preserving group, resource, subresource, verb, namespace, and name. Rejections settle as errors; neither denial nor errors grant access. Namespace changes immediately revoke stale results and cancel pending checks.
- Configuration row actions check named `get` plus the mutation verb; create/duplicate checks namespace-scoped `create` without a name. Accelerator edits use `update`; topology/routing edits and enable toggles use `patch`. Unauthorized actions are omitted and toggles disabled.
- All settings routes require `list` and `watch` because their contexts watch configurations.
  Viewing requires no write permission. Add requires `create`; duplicate additionally requires
  named `get`; edit requires named `get` and the applicable `patch` or `update`, but not
  `create`. Toolbar and empty-state add controls independently check `create`.
- Candidate namespace sets are stabilized across project metadata refreshes, avoiding plugin
  deactivation and form remounts when the actual namespace set has not changed. Capability
  declarations respect required/disallowed flags; inactive declarations do not block a plugin.
- Hosts wait for initial capability checks to settle before rendering routes, preserving direct
  links to asynchronously enabled tabs. Missing, denied, or errored capabilities disable only
  their owning plugin and release the rest of the application.
- The legacy RHOAI `checkAccess` has tested fail-open behavior. It remains unchanged for unrelated callers; llmd uses the new strict `reviewAccess` contract instead.
- Gateway discovery accepts a project namespace and cancellation signal, validates all returned options (including listener, readiness, display name, and description), and rejects malformed responses. Hosts expose only `GET /api/service/model-serving/api/v1/gateways?namespace=...`, not arbitrary service paths. Missing/failed discovery disables this optional field without blocking wizard validation.
- Federated deployment depends on the package-owned `module-federation-shared` contract
  introduced by [RHAI-1895 / PR #9863](https://github.com/opendatahub-io/odh-dashboard/pull/9863).
  That change shares the plugin-core contexts; model-serving declares its own
  `./api/gatewayDiscovery` export through the same metadata. No package-specific sharing
  registry is added to app-config. Hosts and remotes must ship with this prerequisite:
  sharing only package roots duplicates context subpaths and disconnects their providers.

### Kubernetes API and verb inventory

| API / resource | Verbs used | Scope and purpose |
| --- | --- | --- |
| `serving.kserve.io/v1alpha2/llminferenceservices` | `list`, `watch`, `create`, `update`, `patch`, `delete` | All-project or project deployment watches; selected-project deployment CRUD and start/stop |
| `serving.kserve.io/v1alpha2/llminferenceserviceconfigs` | `get`, `list`, `watch`, `create`, `update`, `patch`, `delete` | Operator-namespace settings/templates; selected-project copies referenced by deployments |
| Core `v1/secrets` | `get`, `list`, `create`, `update`, `patch`, `delete` | Selected-project connections and token authentication through model-serving/host services |
| Core `v1/serviceaccounts` | `get`, `create`, `update` | Selected-project Hugging Face token references through model-serving helpers |
| Core `v1/pods` | `list`, `watch` | Selected-project deployment status |
| `authorization.k8s.io/v1/selfsubjectaccessreviews` | `create` | Exact caller permission checks; omitted namespace means cluster-wide, not the operator namespace |
| API discovery | HTTP `GET` | `/apis/serving.kserve.io/v1alpha2`; missing API, forbidden discovery, and transport errors remain distinct |

Kubernetes remains the final enforcement point for every operation. No service-account-wide discovery or SSAR fallback is used in production; Core BFF forwards the authenticated caller token.

## Key Concepts

| Term                       | Definition                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| **LLMInferenceService**    | CR `serving.kserve.io/v1alpha2` / `llminferenceservices`; deployed LLM-d model.             |
| **LLMdDeployment**         | `Deployment<LLMInferenceServiceKind>` with `modelServingPlatformId = 'llmd-serving'`.       |
| **LLMdContainer**          | Container in `spec.template.containers`; vLLM args via `VLLM_ADDITIONAL_ARGS`.              |
| **Router**                 | `spec.router` with `gateway`, `route`, `scheduler`; LLM-d routing layer.                    |
| **Token authentication**   | Secrets via `deployUtils.setUpTokenAuth`; wizard `tokenAuthField`.                          |
| **Deployment strategy**    | Rolling vs recreate via `deploymentStrategyField`.                                          |
| **Hardware profile paths** | `LLMD_INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS` JSONPaths for `applyHardwareProfileConfig`. |
| **External route**         | Public route via LLM-d gateway; `externalRouteField`.                                       |
| **Resource capability** | Discovery plus caller access gates plugin extensions independently of area flags. |

## Interactions

| Dependency                     | Type                       | Details                                                                                          |
| ------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------ |
| `@odh-dashboard/model-serving` | Package                    | Extension-point interfaces this package implements                                               |
| `@odh-dashboard/internal`      | Transitional monolith edge | Use the modular destinations listed in Modular Dependency Boundaries; do not add new imports     |
| `LLMInferenceService` CRD      | Kubernetes API             | Group `serving.kserve.io`, `v1alpha2`                                                            |
| Main ODH Dashboard             | Host application           | Loads extensions; model-serving wizard and table                                                 |

## Known Issues / Gotchas

- **CRD required**: Missing or inaccessible `LLMInferenceService` APIs disable llmd extensions even if area flags are enabled.
- **Token auth RBAC**: `setUpTokenAuth` creates Secrets after the CR may exist; missing `create secrets` leaves a partial deployment.
- **`spec.router`**: Base shape initializes empty `scheduler`, `route`, `gateway`; omitting them can cause operator rejection.
- **`VLLM_ADDITIONAL_ARGS`**: Injected on container named `main`; operator renames break arg injection silently.
- **Patch vs update**: `patchLLMInferenceService` uses JSON Patch; `updateLLMInferenceService` uses full-resource update (`PUT`). Review `patch` and `update` separately.
