[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[KServe Package]: ../../kserve/docs/overview.md
[Model Registry Package]: ../../model-registry/docs/overview.md

# Model Serving

**Last Updated**: 2026-03-09 | **Template**: package-template v1

## Overview

The `@odh-dashboard/model-serving` package provides the Model Serving UI for ODH Dashboard. It
enables users to manage serving runtimes, deploy models, view inference endpoints, and monitor
serving status across projects. This package is the canonical implementation, replacing the
deprecated `frontend/src/pages/modelServing/` pages.

**Package path**: `packages/model-serving/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Standalone | Not supported — no BFF; run main dashboard instead | N/A |
| Federated | Run main dashboard with this package loaded via Module Federation | `http://localhost:4010` |

This package is a library package — it has no standalone server or BFF. It is always loaded as a
federated module into the main ODH Dashboard. For local development, run the main dashboard with
the `model-serving` package built or linked in the monorepo.

```bash
# From the repo root, build and start the main dashboard (which federates this package):
npm run dev
```

## BFF Architecture

Not applicable — this package has no BFF. All API calls go through the main dashboard backend
proxy or directly to the Kubernetes API.

## OpenAPI Specification

Not applicable.

## Module Federation

This package does not expose a Webpack remote entry directly. Instead, it is consumed as a
workspace package (`@odh-dashboard/model-serving`) by the main ODH Dashboard, which imports its
extensions at build time via the dynamic plugin SDK.

**Extension registration**: `packages/model-serving/extensions/index.ts`

Exported extension groups:
- `extensions/odh.ts` — core area, routes, nav item, and project-details tab registrations
- `extensions/model-registry.ts` — extensions for deploying from the Model Registry
- `extensions/model-catalog.ts` — extensions for deploying from the Model Catalog

**Extension types exposed** (consumed by platform packages like `packages/kserve`):
- `model-serving.platform` — platform identity and UI configuration
- `model-serving.platform/watch-deployments` — hook to watch live deployments
- `model-serving.deployment/form-data` — extract form data from an existing deployment
- `model-serving.deployment/deploy` — assemble and submit a deployment
- `model-serving.deployment/wizard-field` / `wizard-field2` — pluggable wizard fields
- `model-serving.deployment/wizard-field-apply` — apply field data during assembly
- `model-serving.deployment/wizard-field-extractor` — extract field data from a deployment
- `model-serving.deployments-table` — custom columns for the deployments table
- `model-serving.platform/delete-deployment` — platform-specific delete handler
- `model-serving.deployed-model/serving-runtime` — serving runtime detail component
- `model-serving.deployments-table/start-stop-action` — start/stop action for table rows
- `model-serving.platform/fetch-deployment-status` — fetch live status of a single deployment
- `model-serving.auth` — platform-specific auth check hook
- `model-serving.metrics` — platform-specific metrics integration

## Architecture

```text
packages/model-serving/
├── extension-points/
│   └── index.ts              # TypeScript types for all extension points
├── extensions/
│   ├── index.ts              # Aggregates all extension registrations
│   ├── odh.ts                # Core nav, routes, area, project tab extensions
│   ├── model-registry.ts     # Model Registry deploy-from-registry extensions
│   └── model-catalog.ts      # Model Catalog deploy extensions
├── modelRegistry/            # Components/hooks for the Model Registry integration
│   ├── DeploymentsColumn.tsx
│   ├── ModelRegistryDeploymentsTable.tsx
│   ├── PreWizardDeployModal.tsx
│   └── ...
├── src/
│   ├── GlobalModelsRoutes.tsx        # Route: /ai-hub/deployments/:namespace?/*
│   ├── ModelDeploymentWizardRoutes.tsx  # Route: /ai-hub/deployments/deploy
│   ├── ModelsProjectDetailsTab.tsx   # "Deployments" tab in Project Details
│   ├── ServeModelsSection.tsx        # "Serve Models" section on Project Overview
│   ├── components/
│   │   ├── deleteModal/              # Delete model serving confirmation modal
│   │   ├── deploy/                   # DeployButton component
│   │   ├── deploymentWizard/         # Multi-step deployment wizard
│   │   │   ├── ModelDeploymentWizard.tsx
│   │   │   ├── steps/                # Wizard steps (Source, Deployment, Advanced, Review)
│   │   │   ├── fields/               # Pluggable wizard field components
│   │   │   └── yaml/                 # YAML view alongside wizard form
│   │   └── deployments/              # Deployments table and row components
│   └── concepts/
│       ├── auth.ts                   # Auth concept utilities
│       └── utils.ts                  # Shared utilities
├── docs/
│   └── overview.md           # This file
├── jest.config.ts
└── package.json
```

Data flows from Kubernetes (via the main dashboard backend proxy) to the React UI — there is no
intermediate BFF. Platform-specific logic (how to create an `InferenceService`, a `ServingRuntime`,
etc.) lives in platform packages (e.g., `packages/kserve`) and is injected into this package's
shared wizard and table via the extension point system.

## Key Concepts

| Term | Definition |
|------|-----------|
| **ServingRuntime** | A Kubernetes CR (`kind: ServingRuntime`) that defines a template for a model server, including the container image, supported model formats, and resource defaults. |
| **InferenceService** | A Kubernetes CR (`kind: InferenceService`) representing a single deployed model endpoint. The primary resource managed by this package. |
| **KServe** | A single-model serving platform. Each `InferenceService` runs in its own pod. Managed by `packages/kserve`. |
| **ModelMesh** | A multi-model serving platform where multiple models share a pool of server pods for efficiency. |
| **Endpoint URL** | The HTTP(S) URL exposed by an `InferenceService` for inference requests. Displayed in the Deployments table and detail view. |
| **Deployment** | The package's internal abstraction for a deployed model — wraps the model resource, optional server resource, status, and endpoints. Typed as `Deployment<M, S>` in `extension-points/index.ts`. |
| **Platform extension** | A `model-serving.platform` extension registered by a platform package (KServe, ModelMesh) that identifies the platform and configures its UI behaviour. |
| **Extension point** | A TypeScript interface defined in `extension-points/index.ts` that platform packages implement to plug behaviour into the shared wizard, table, and delete flow. |
| **Feature flag** | `disableModelServing` in `OdhDashboardConfig` — when set, the entire Model Serving area is hidden. |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- Access to an OpenShift / Kubernetes cluster with KServe or ModelMesh installed (or a mocked
  main dashboard backend)

### Run locally (federated into main dashboard)

```bash
# From the repo root — builds all packages including model-serving, then starts the dashboard:
npm install
npm run dev
# Dashboard available at http://localhost:4010
```

### Run unit tests

```bash
npx turbo run test-unit --filter=@odh-dashboard/model-serving
```

## Environment Variables

This package has no runtime environment variables of its own — it is a library with no server
process. Configuration is inherited from the main ODH Dashboard environment.

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `DEPLOYMENT_MODE` | Set by the main dashboard host | `federated` | No |

See the main dashboard's `README.md` for the full list of environment variables.

## Testing

### Unit Tests

```bash
# Run all unit tests for this package:
npx turbo run test-unit --filter=@odh-dashboard/model-serving

# With coverage:
npx turbo run test-unit-coverage --filter=@odh-dashboard/model-serving
```

Unit tests use Jest and are co-located with the source files under `__tests__/` or `.test.tsx` /
`.spec.ts` suffixes. See `jest.config.ts` for configuration.

### Cypress Tests

```bash
# From the repo root — run mock Cypress tests covering model serving:
npm run test:cypress-ci -- --spec "**/modelServing/**"
```

Cypress mock tests live in the main dashboard's `frontend/src/__tests__/cypress/` tree and cover
the deployment wizard, deployments table, and project details tab.

### Contract Tests

Not applicable — this package has no BFF.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host application | Provides routing, auth, and the k8s proxy backend; loads this package's extensions at startup |
| `packages/kserve` | Platform package | Registers `model-serving.platform`, `watch-deployments`, `deploy`, and related extensions for KServe single-model serving |
| `packages/model-registry` | Package | Provides the `PreWizardDeployModal` flow; model version data is passed into the deployment wizard via `modelRegistry/` integration hooks |
| Main dashboard backend (BFF proxy) | HTTP proxy | All `InferenceService` and `ServingRuntime` CRUD calls pass through the main dashboard Node.js backend at `/api/k8s/` |
| Kubernetes | API | Reads and writes `InferenceService`, `ServingRuntime`, and related CRDs; watches for status updates |
| `OdhDashboardConfig` | Config CR | `disableModelServing` feature flag controls area visibility |

## Known Issues / Gotchas

- The deprecated `frontend/src/pages/modelServing/` directory may still exist in the codebase.
  Do not add new features there — all changes belong in `packages/model-serving/`. The old path
  redirects to `/ai-hub/deployments/` via the redirect extension registered in `extensions/odh.ts`.
- ModelMesh does not yet have a fully migrated platform package. Some ModelMesh-specific UI still
  lives in `@odh-dashboard/internal`. Track migration progress before implementing new ModelMesh
  features in this package.
- Platform packages must register all required extension points (`model-serving.platform`,
  `model-serving.platform/watch-deployments`, `model-serving.deployment/deploy`) or the wizard
  will silently have no available deploy target. Check browser console for unresolved extension
  warnings.
- The `WizardField2Extension` type (`model-serving.deployment/wizard-field2`) is a successor to
  `DeploymentWizardFieldExtension` (`wizard-field`). A rename to `WizardFieldExtension` is
  tracked in the codebase via a TODO comment — do not rely on the `wizard-field2` name being
  permanent.

## Related Docs

- [Guidelines] — documentation style guide for this monorepo
- [Module Federation Docs] — how Module Federation works across packages
- [Backend Overview] — main dashboard backend proxy reference
- [KServe Package] — KServe platform package that implements model-serving extension points
- [Model Registry Package] — model registry integration consumed by the deploy-from-registry flow
- [BOOKMARKS] — full doc index
