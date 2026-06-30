---
description: ODH Dashboard monorepo architecture, package boundaries, BFF structure, operator controller, and distributions
globs: "packages/**,frontend/**,backend/**,dashboard-operator/**,distributions/**"
alwaysApply: false
paths:
  - "packages/**"
  - "frontend/**"
  - "backend/**"
  - "dashboard-operator/**"
  - "distributions/**"
---

# ODH Dashboard Architecture

## Monorepo Structure

ODH Dashboard is a monorepo managed with npm workspaces and Turbo. It provides the web UI for Red Hat OpenShift AI (RHOAI) and Open Data Hub (ODH).

### Main Applications

- `frontend/` — Main React 18 dashboard application (PatternFly v6, Webpack, Module Federation host)
- `backend/` — Fastify server with Kubernetes client integration, proxying requests to OpenShift APIs

### Feature Plugin Packages (`packages/`)

Feature packages provide extensions and are discovered by `discoverPluginPackages.js`. They fall into two categories based on how they are built and loaded:

#### Module Federation Remotes

These packages have a `module-federation` config in `package.json`, their own webpack build under `frontend/config/`, and produce a `remoteEntry.js` that is loaded dynamically at runtime:

- `automl` — AutoML features (has Go BFF)
- `autorag` — AutoRAG features (has Go BFF)
- `eval-hub` — Evaluation Hub (has Go BFF)
- `gen-ai` — Gen AI / LLM features (has Go BFF)
- `maas` — Model-as-a-Service (has Go BFF)
- `mlflow` — MLflow integration (has Go BFF)
- `mlflow-embedded` — Embedded MLflow integration
- `model-registry` — Model Registry UI (has Go BFF)
- `notebooks` — Notebooks management
- `observability` — Observability features

#### Bundled Plugin Packages

These packages export extensions but have **no** `module-federation` config. They are compiled directly into the host bundle at build time — no separate webpack build, no `remoteEntry.js`, no standalone dev server:

- `feature-store` — Feature Store (read-only Feast UI; no BFF, proxies through main dashboard backend)
- `kserve` — KServe integration
- `llmd-serving` — LLM serving
- `model-serving` — Model Serving UI
- `model-serving-backport` — Model serving backport compatibility
- `model-training` — Model training UI
- `nim-serving` — NIM serving

#### Plugin Infrastructure

- `plugin-core` — Core plugin utilities shared across plugins
- `plugin-template` — Scaffold for new plugins

### Infrastructure Packages

- `eslint-config` — Centralized ESLint configuration (base, typescript, react, node, markdown, yaml, prettier)
- `eslint-plugin` — Custom ESLint rules for the project
- `jest-config` — Shared Jest test configuration and custom matchers
- `tsconfig` — Shared TypeScript configuration
- `app-config` — Shared application configuration and utilities
- `contract-tests` — Central contract testing framework for BFF validation

### Testing Package

- `cypress` — Shared Cypress E2E and mock test framework, page objects, and utilities

## Package Boundaries (Critical)

- Feature packages MUST NOT import directly from other feature packages' internal modules.
- Feature packages MUST use exported APIs from `plugin-core` or `app-config` for shared functionality.
- Changes to infrastructure packages (`eslint-config`, `jest-config`, `tsconfig`) affect ALL packages — review with extra care.

## Dashboard Module Controller (`dashboard-operator/`)

A standalone Kubernetes operator that manages the full lifecycle of the Dashboard application. Co-located in the monorepo (not a separate repository) because the controller is tightly coupled to Dashboard frontend/backend versions and manifest layouts.

- **Language**: Go 1.25+ with controller-runtime v0.23
- **CRD**: `Dashboard` (cluster-scoped, singleton `default-dashboard`) in group `dashboard.opendatahub.io`
- **Key dependencies**: `odh-platform-utilities` (Tier 1 packages for manifest rendering, SSA deployment, platform detection, status conditions)
- **CI**: `.github/workflows/dashboard-operator-tests.yml` — lint, build, test on `dashboard-operator/**` changes
- **Container**: `quay.io/opendatahub/dashboard-operator:latest` built from `dashboard-operator/Dockerfile`

The controller is **not** part of the npm workspace or Turbo pipeline. It has its own `go.mod`, `Makefile`, and CI workflow. See `dashboard-operator/AGENTS.md` and `.claude/rules/operator-controller.md` for detailed conventions.

## Distributions (`distributions/`)

Independently-deployable dashboard variants. These are NOT part of the npm workspace or Turbo pipeline — monorepo-wide `npm run` commands do not apply. Each sub-distribution is self-contained.

| Directory | Description | Has BFF? | Build System |
|-----------|-------------|----------|--------------|
| `base/` | Shared app shell library (PatternFly chrome, error boundary, extensibility hooks) — **not deployed on its own** | Stub only | Webpack |
| `core-bff/` | Full Go BFF + React frontend for sidecar/xKC deployments | Yes (Go 1.25+) | Make + Webpack |
| `rhaii/` | RHAII-specific distribution | No | Webpack |

- `base/` is a shared library/framework (not independently deployed) — it provides the app shell (masthead, sidebar, error boundary, theme context) that `core-bff/` and `rhaii/` extend
- `rhaii/` is frontend-only — React + Webpack + Module Federation host configuration
- `core-bff/` has both a Go BFF (`bff/`) and React frontend (`frontend/`) with its own contract tests (`contract-tests/`)
- Each distribution has its own `package.json`, `tsconfig.json`, and webpack config
- `core-bff/` follows contract-first development (OpenAPI → BFF stub → Frontend → Production BFF)

See `distributions/core-bff/AGENTS.md` for the most detailed reference. See `.claude/rules/distributions.md` for distribution-specific conventions and `.claude/rules/bff-go.md` for Go BFF conventions (applies to core-bff BFF code).

## BFF (Backend-for-Frontend) Architecture

Several packages have a Go-based BFF service: `automl`, `autorag`, `eval-hub`, `gen-ai`, `maas`, `mlflow`, `model-registry`. The `distributions/core-bff` module also has a Go BFF.
- Located in `bff/` within the package
- Check each package's `bff/go.mod` for its required Go toolchain version
- Exposes REST APIs consumed by the package's frontend
- Must expose a `/healthcheck` endpoint
- Has its own OpenAPI specification in `api/` or `bff/openapi/`
