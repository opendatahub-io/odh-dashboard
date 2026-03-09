[Guidelines]: ../../docs/guidelines.md
[BOOKMARKS]: ../../docs/BOOKMARKS.md
[Backend Overview]: ../../backend/docs/overview.md
[Module Federation Docs]: ../../docs/module-federation.md
[Model Serving]: ../model-serving/docs/overview.md
[KServe Package]: ../kserve/docs/overview.md

# LLMD Serving

**Last Updated**: 2026-03-09 | **Template**: package-template v1

## Overview

The `llmd-serving` package implements the LLM-d (LLM-dedicated) serving platform for the ODH
Dashboard. It extends `packages/model-serving` with a KServe-backed platform that creates and
manages `LLMInferenceService` Kubernetes resources (`serving.kserve.io/v1alpha1`). Use this
package when deploying generative AI models that require LLM-d's scheduler, gateway routing, and
token-authentication infrastructure rather than the generic KServe or ModelMesh paths.

**Package path**: `packages/llmd-serving/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Federated | `npm run dev` from repo root | `http://localhost:4010` |

This package registers itself into the main dashboard's `model-serving` extension framework. It
has no standalone server or Kubeflow mode. The `SupportedArea.K_SERVE` area guard and the
`disableLLMd` feature flag control whether the platform appears in the deployment wizard.

## BFF Architecture

Not applicable — this package has no BFF.

All Kubernetes operations (`createLLMInferenceService`, `patchLLMInferenceService`,
`updateLLMInferenceService`, `deleteLLMInferenceService`) are performed in
`src/api/LLMInferenceService.ts` and `src/api/LLMdDeployment.ts` using the OpenShift
dynamic plugin SDK (`@openshift/dynamic-plugin-sdk-utils`) directly from the browser via the
main dashboard's in-cluster credentials.

## OpenAPI Specification

Not applicable — this package has no BFF.

The Kubernetes API group consumed is `serving.kserve.io`, resource `llminferenceservices`,
version `v1alpha1`. The model definition is in `src/types.ts` as `LLMInferenceServiceKind`.

## Module Federation

This package does not publish a Webpack remote entry. It ships as a TypeScript library consumed
by the main dashboard's extension registry via monorepo package exports.

**Extensions file**: `packages/llmd-serving/extensions/extensions.ts`

**Remote entry name**: none — consumed as an internal package via monorepo `exports`.

**Exposed modules** (via `package.json` exports):

- `./extensions` — extension array registered by the main dashboard plugin system
- `./types` — `LLMdDeployment`, `LLMInferenceServiceKind`, and related types
- `./__tests__/utils` — shared test utilities

**Main dashboard registration**: the main dashboard imports `./extensions` and registers each
entry via the `plugin-core` / `model-serving` extension registry at startup.

## Architecture

```text
packages/llmd-serving/
├── extensions/
│   └── extensions.ts         # All extension declarations for the llmd-serving platform
├── src/
│   ├── api/
│   │   ├── LLMInferenceService.ts  # CRUD helpers for LLMInferenceService CRs
│   │   └── LLMdDeployment.ts       # deleteDeployment helper
│   ├── components/
│   │   └── servingRuntime.tsx      # Deployed-model details panel (serving runtime view)
│   ├── deployments/
│   │   ├── deploy.ts               # assembleLLMdDeployment / deployLLMdDeployment
│   │   ├── deployUtils.ts          # isLLMdDeployActive, token-auth setup
│   │   ├── endpoints.ts            # Endpoint URL extraction from status.addresses
│   │   ├── hardware.ts             # Hardware profile path mapping, replica extraction
│   │   ├── model.ts                # Model location, env vars, runtime args, annotations
│   │   ├── server.ts               # Model server template extraction
│   │   ├── status.ts               # patchDeploymentStoppedStatus (start/stop action)
│   │   └── useWatchDeployments.ts  # Watch hook for LLMInferenceService list
│   ├── wizardFields/
│   │   ├── advancedOptionsFields.ts  # externalRouteField, tokenAuthField, deploymentStrategyField
│   │   ├── modelAvailability.ts      # MaaS tier annotation field (model-as-service)
│   │   └── modelServerField.ts       # Model server selector wizard field
│   └── types.ts                    # LLMInferenceServiceKind, LLMdDeployment, LLMdContainer
├── docs/
│   └── overview.md             # This file
└── package.json
```

The extension system drives every integration point. `extensions/extensions.ts` registers:
`model-serving.platform/watch-deployments` (list watch), `model-serving.deployment/deploy`
(assemble + persist), `model-serving.deployment/form-data` (field extractors),
`model-serving.deployment/wizard-field` (per-field wizard fragments), and
`model-serving.deployments-table/start-stop-action` (start/stop toggle). The main dashboard's
`model-serving` package orchestrates all these extension points; `llmd-serving` supplies only
the LLM-d-specific implementations.

## Key Concepts

| Term | Definition |
|------|-----------|
| **LLMInferenceService** | Kubernetes CR (`serving.kserve.io/v1alpha1`, plural `llminferenceservices`) that describes a deployed LLM-d model. Defined in `src/types.ts`. |
| **LLMdDeployment** | Dashboard wrapper type: `Deployment<LLMInferenceServiceKind>` with `modelServingPlatformId = 'llmd-serving'`. |
| **LLMdContainer** | Container spec within `spec.template.containers`; carries vLLM runtime args via the `VLLM_ADDITIONAL_ARGS` env var. |
| **Router** | `spec.router` block containing `gateway`, `route`, and `scheduler` sub-objects; controls LLM-d's inference routing layer. |
| **Token authentication** | Per-deployment auth tokens created as Kubernetes Secrets and wired via `deployUtils.setUpTokenAuth`. Controlled by the `tokenAuthField` wizard field. |
| **Deployment strategy** | Wizard field (`deploymentStrategyField`) that selects between rolling and recreate update strategies on the `LLMInferenceService`. |
| **MaaS tier** | Model-as-a-Service availability annotation (`MAAS_TIERS_ANNOTATION`) applied when the `model-as-service` area flag is active. |
| **Hardware profile paths** | `LLMD_INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS` — JSONPath selectors used by `applyHardwareProfileConfig` to inject resource limits into the CR. |
| **External route** | Optional public route exposed via the LLM-d gateway; toggled by `externalRouteField`. |
| **isLLMdDeployActive** | Guard function in `deployUtils.ts`; returns `true` only when `disableLLMd` is off and `SupportedArea.K_SERVE` is available. |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- An OpenShift cluster with the KServe operator installed and `LLMInferenceService` CRD present.
- The `disableLLMd` feature flag must be unset (or `false`) in `OdhDashboardConfig`.

### Start in federated mode

```bash
# From repo root
npm install
npm run dev
# Open http://localhost:4010, navigate to a project's model serving page,
# and select the LLM-d platform in the deployment wizard.
```

### Run unit tests

```bash
npx turbo run test-unit --filter=@odh-dashboard/llmd-serving
```

The test suite uses `--passWithNoTests`; most coverage is provided by the main dashboard's
Cypress suite exercising the `model-serving` extension framework.

## Environment Variables

This package exposes no environment variables of its own. Platform availability is controlled
entirely by dashboard-level flags.

| Flag | Where set | Effect |
|------|-----------|--------|
| `disableLLMd` | `OdhDashboardConfig` CR | Hides the LLM-d platform from the model serving wizard |
| `SupportedArea.K_SERVE` | Cluster capability detection | Required area; `isLLMdDeployActive` returns `false` when absent |

## Testing

### Unit Tests

```bash
npx turbo run test-unit --filter=@odh-dashboard/llmd-serving
```

Unit test files use the `.spec.ts` convention and live in `src/deployments/__tests__/`
(e.g. `endpoints.spec.ts`). The jest config is at `packages/llmd-serving/jest.config.ts`.

### Type Check

```bash
cd packages/llmd-serving
npm run type-check
```

No contract tests or dedicated Cypress spec directory exist for this package. End-to-end
coverage is provided by the main dashboard's Cypress suite when run against a cluster with
the `LLMInferenceService` CRD and `disableLLMd=false`.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| `@odh-dashboard/model-serving` | Package | Provides the extension point interfaces (`ModelServingDeploy`, `DeploymentWizardFieldExtension`, etc.) that `llmd-serving` implements |
| `@odh-dashboard/kserve` | Package | Shared KServe utilities and types consumed during deployment assembly |
| `@odh-dashboard/internal` | Package | Hardware profile config, k8s types, `applyHardwareProfileConfig`, area/flag infrastructure |
| Kubernetes `LLMInferenceService` CRD | Kubernetes API | CRUD via `@openshift/dynamic-plugin-sdk-utils`; group `serving.kserve.io`, version `v1alpha1` |
| `packages/maas` | Package | MaaS tier annotation applied when `model-as-service` area flag is active (`modelAvailabilityField`) |
| Main ODH Dashboard | Host application | Loads extensions at startup; orchestrates the model serving wizard and deployment table |

## Known Issues / Gotchas

- The `LLMInferenceService` CRD must be installed on the cluster before the dashboard starts;
  the watch hook (`useWatchDeployments`) will throw a 404 if the CRD is absent and the area
  flag is incorrectly set to enabled.
- Token auth (`setUpTokenAuth`) creates Kubernetes Secrets in the project namespace. If the
  user lacks `create secrets` RBAC, the deploy call will fail after the `LLMInferenceService`
  CR has already been created, leaving a partially configured deployment.
- The `spec.router` object is always initialised with empty `scheduler`, `route`, and `gateway`
  sub-objects (`BaseLLMInferenceService`). Omitting them causes the LLM-d operator to reject
  the CR.
- `VLLM_ADDITIONAL_ARGS` is injected as an environment variable on the container named `main`
  inside `spec.template.containers`. If the operator renames this container, runtime arg
  injection silently no-ops.
- `patchLLMInferenceService` uses JSON Patch (preferred for overwrites) while
  `updateLLMInferenceService` uses merge patch. Use `overwrite: true` in the wizard when
  re-deploying to avoid stale field conflicts.

## Related Docs

- [Guidelines] — documentation style guide
- [Model Serving] — generic model serving package that defines the extension points this package implements
- [KServe Package] — shared KServe utilities consumed by this package
- [Module Federation Docs] — how Module Federation works in this monorepo
- [Backend Overview] — main dashboard backend reference
- [BOOKMARKS] — full doc index
