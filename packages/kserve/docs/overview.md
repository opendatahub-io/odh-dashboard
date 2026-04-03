[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Model Serving Overview]: ../../model-serving/docs/overview.md
[Model Registry Overview]: ../../model-registry/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md

# KServe

**Last Updated**: 2026-03-09 | **Template**: package-template v1

## Overview

The `@odh-dashboard/kserve` package implements the KServe single-model serving platform as a
pluggable extension of `@odh-dashboard/model-serving`. It provides the UI logic and Kubernetes
API calls needed to deploy, configure, monitor, and delete models using KServe `InferenceService`
resources — one dedicated model server per deployed model.

**Package path**: `packages/kserve/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Federated | Run main dashboard + model-serving package | `http://localhost:4010` |

KServe has no standalone or Kubeflow mode of its own. It ships exclusively as a federated
extension loaded by the `model-serving` package, which is itself loaded by the main ODH Dashboard
via Module Federation. To develop locally, run the main dashboard with model-serving federated
mode enabled and the `K_SERVE` feature area active.

## BFF Architecture

Not applicable — this package has no BFF.

All Kubernetes API calls (`InferenceService`, `ServingRuntime`, `Pod`, `Secret`,
`ServiceAccount`, `Role`, `RoleBinding`) go through the main dashboard backend proxy at
`/api/k8s/`. No Go BFF or separate server process exists for this package.

## OpenAPI Specification

Not applicable — this package has no BFF.

## Module Federation

KServe does not expose its own Module Federation remote entry. It is consumed as a TypeScript
dependency by `@odh-dashboard/model-serving`, which registers it at build time.

**Integration point**: `packages/kserve/extensions.ts` — exports a default array of extension
objects that `model-serving` imports and registers with the plugin system.

**Package exports** (declared in `package.json`):
- `@odh-dashboard/kserve/extensions` — the extension manifest (`extensions.ts`)
- `@odh-dashboard/kserve/deployUtils` — shared deployment utility functions used by other
  packages (e.g., `model-serving-backport`)

## Architecture

```text
packages/kserve/
├── extensions.ts              # Extension manifest; registers all KServe extension points
├── src/
│   ├── api/
│   │   ├── inferenceService.ts  # create / update / patch InferenceService via k8s API
│   │   └── watch.ts             # useWatch* hooks: InferenceServices, ServingRuntimes, Pods
│   ├── components/
│   │   └── deploymentServingDetails.tsx  # Serving runtime detail panel for deployed models
│   ├── __tests__/
│   │   └── deployments.spec.ts  # Unit tests for useWatchDeployments hook
│   ├── aiAssets.ts              # Extract AI asset / GenAI availability annotations
│   ├── deploy.ts                # Top-level deployKServeDeployment orchestration function
│   ├── deployModel.ts           # Assemble and create/update the InferenceService resource
│   ├── deployServer.ts          # Create the per-deployment ServingRuntime resource
│   ├── deploymentEndpoints.ts   # Derive inference URL endpoints from InferenceService status
│   ├── deploymentStatus.ts      # Map InferenceService + Pod state to DeploymentStatus
│   ├── deployments.ts           # useWatchDeployments hook; fetchDeploymentStatus; deleteDeployment
│   ├── deployUtils.ts           # apply* helpers (auth, labels, annotations, strategy); token auth setup
│   ├── hardware.ts              # Extract hardware profile / replicas / runtime args
│   ├── modelFormat.ts           # Extract model format from an existing KServeDeployment
│   └── modelLocationData.ts     # Extract storage URI / connection data from form state
├── docs/
│   └── overview.md              # This file
├── package.json
└── tsconfig.json
```

Data flow for a model deployment:

1. The `model-serving` deployment wizard collects form data and calls
   `deployKServeDeployment` (registered via the `model-serving.deployment/deploy` extension).
2. `deploy.ts` orchestrates three sequential steps: create `ServingRuntime` (if new server),
   create or patch `InferenceService`, then set up token auth (ServiceAccount, Role,
   RoleBinding, Secrets).
3. All k8s writes go through `@openshift/dynamic-plugin-sdk-utils` helpers (`k8sCreateResource`,
   `k8sPatchResource`, etc.), which route through the main dashboard backend proxy.
4. After deployment, `useWatchDeployments` keeps the UI up to date by watching `InferenceService`,
   `ServingRuntime`, and `Pod` resources and combining them into `KServeDeployment` objects.

## Key Concepts

| Term | Definition |
|------|-----------|
| **InferenceService** | Core KServe CRD (`serving.kserve.io/v1beta1`). Defines the model, runtime, storage location, replica count, and scaling configuration for a single deployed model. |
| **ServingRuntime** | Namespace-scoped KServe CRD that acts as a template for the model server container. Each KServe deployment creates its own `ServingRuntime` alongside the `InferenceService`. |
| **KServeDeployment** | TypeScript type (`Deployment<InferenceServiceKind, ServingRuntimeKind>`) combining an `InferenceService` (`.model`), its optional `ServingRuntime` (`.server`), computed status, and endpoints. |
| **Predictor** | The `spec.predictor` block in an `InferenceService`; specifies the model URI, runtime reference, resource requests/limits, replicas, and deployment strategy. |
| **Token auth** | Optional bearer-token protection for the inference endpoint. Implemented via a `ServiceAccount`, `Role`, `RoleBinding`, and one or more `Secret` resources owned by the `InferenceService`. Controlled by the `security.opendatahub.io/enable-auth` annotation. |
| **External route** | Exposes the inference endpoint outside the cluster. Enabled by setting the `networking.kserve.io/visibility: exposed` label on the `InferenceService`. |
| **Deployment strategy** | `RollingUpdate` (zero-downtime) or `Recreate` (terminate then start). Stored in `spec.predictor.deploymentStrategy`. |
| **AI asset** | An `InferenceService` tagged with `opendatahub.io/genai-asset: true` for use in Gen AI flows. Carries an optional `opendatahub.io/genai-use-case` annotation. |
| **KSERVE_ID** | String constant `'kserve'` used as the platform identifier in all extension registrations and `modelServingPlatformId` fields. |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- Access to an ODH/OpenShift cluster with the KServe operator installed, or mock data enabled
  in the main dashboard

### Run in federated mode

```bash
# From repo root — start the main dashboard which loads model-serving (and kserve) via Module Federation
npm run dev
```

The main dashboard at `http://localhost:4010` will load the model-serving federated module,
which includes the KServe extensions. Enable the `K_SERVE` area in your cluster's
`OdhDashboardConfig` or via the Admin Settings feature flag UI.

### Verify extensions are loaded

Open the browser console and confirm that the `model-serving.platform` extension with
`id: 'kserve'` appears in the registered extensions list.

## Environment Variables

KServe has no BFF and therefore no server-side environment variables of its own. Feature
availability is controlled by the following `OdhDashboardConfig` flags consumed by the main
dashboard:

| Flag | Effect | Default |
|------|--------|---------|
| `disableKServe` | Disables the entire KServe area when `true` | `false` |
| `disableKServeMetrics` | Hides the metrics tab on KServe deployments | `false` |

The `K_SERVE` and `K_SERVE_METRICS` `SupportedArea` values gate individual extensions in
`extensions.ts` via the `flags.required` field.

## Testing

### Unit Tests

Unit tests cover the `useWatchDeployments` hook and supporting utilities. Test files live
in `packages/kserve/src/__tests__/`. This package has `lint` and `type-check` scripts but
no `test-unit` script wired via npm. The `watch` module is mocked via
`jest.mock('../api/watch')` so tests run without a real cluster.

```bash
npx turbo run type-check lint --filter=@odh-dashboard/kserve
```

### Cypress Tests

KServe model-serving flows are covered by Cypress mock tests in the main dashboard's
Cypress suite under the model-serving area.

```bash
# From repo root
npm run test:cypress-ci -- --spec "**/modelServing/**"
```

No separate Cypress directory exists inside `packages/kserve/`; coverage lives in the
main `cypress/` package.

### Type-checking and lint

```bash
npx turbo run type-check lint --filter=@odh-dashboard/kserve
```

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `@odh-dashboard/model-serving` | Parent package | Imports and registers KServe extensions; provides extension-point types, form-data types, auth utilities, and the deployment wizard UI |
| `@odh-dashboard/internal` | Internal shared library | Provides k8s resource types (`InferenceServiceKind`, `ServingRuntimeKind`), API helpers, `OdhDashboardConfig` feature flag checks, and RBAC utilities |
| Main dashboard backend proxy (`/api/k8s/`) | HTTP proxy | All k8s API calls pass through this proxy; no direct cluster access from the browser |
| `@odh-dashboard/model-registry` | Sibling package | When deploying a registered model version, model-registry passes pre-filled form data (model URI, name) into the deployment wizard handled by this package |
| `InferenceService` CRD | Kubernetes API | Full CRUD: create on deploy, patch on update (JSON Patch via diff), delete on removal, watch for live status |
| `ServingRuntime` CRD | Kubernetes API | Create on new deployment; delete alongside InferenceService on removal |
| `Pod` (with `serving.kserve.io/inferenceservice` label) | Kubernetes API | Watch-only; used to compute pod-level deployment status |
| `Secret`, `ServiceAccount`, `Role`, `RoleBinding` | Kubernetes API | Created and owned by InferenceService when token auth is enabled |

## Known Issues / Gotchas

- **ServingRuntime coupling**: each KServe deployment creates a dedicated `ServingRuntime` in
  the same namespace. Deleting a deployment deletes both resources in parallel; if the
  `InferenceService` deletion succeeds but `ServingRuntime` deletion fails, the runtime becomes
  orphaned. Re-deploying with the same name will reuse the orphan.
- **Dry-run RoleBinding 404**: when `dryRun` is enabled and the user is not a cluster admin,
  k8s returns a 404 on `RoleBinding` creation because the referenced `Role` does not exist in
  the dry-run context. `createRoleBindingIfMissing` in `deployUtils.ts` swallows this specific
  error to allow the wizard's validation step to proceed.
- **No standalone mode**: this package cannot be developed in isolation. You must run it
  alongside the main dashboard and the `model-serving` package.
- **`modelmesh-enabled: false` label required**: a project must carry the label
  `modelmesh-enabled: false` for KServe to be the active platform. Projects without this label
  default to ModelMesh. The label is set automatically when a user selects single-model serving
  in the project settings UI.
- **`patchInferenceService` skips no-op updates**: if the diff between the existing and new
  `InferenceService` produces zero patches, the function resolves immediately with the new
  object without making a network call.

## Related Docs

- [Guidelines] — documentation style guide for this repo
- [Model Serving Overview] — parent package; extension-point contracts and deployment wizard
- [Model Registry Overview] — how registered model versions flow into KServe deployments
- [Backend Overview] — main dashboard backend proxy and authentication
- [Module Federation Docs] — how packages are loaded as micro-frontends
- [BOOKMARKS] — full documentation index
