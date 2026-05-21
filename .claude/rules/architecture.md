---
description: ODH Dashboard monorepo architecture, package boundaries, and BFF structure
globs: "packages/**,frontend/**,backend/**"
alwaysApply: false
paths:
  - "packages/**"
  - "frontend/**"
  - "backend/**"
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

## BFF (Backend-for-Frontend) Architecture

Several packages have a Go-based BFF service: `automl`, `autorag`, `eval-hub`, `gen-ai`, `maas`, `mlflow`, `model-registry`.
- Located in `bff/` within the package
- Check each package's `bff/go.mod` for its required Go toolchain version
- Exposes REST APIs consumed by the package's frontend
- Must expose a `/healthcheck` endpoint
- Has its own OpenAPI specification in `api/` or `bff/openapi/`
