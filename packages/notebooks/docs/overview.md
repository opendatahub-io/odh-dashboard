[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[Workbenches Docs]: ../../../frontend/docs/workbenches.md

# Notebooks

**Last Updated**: 2026-03-09 | **Template**: package-template v1

## Overview

The Notebooks package integrates the upstream [Kubeflow Notebooks v2](https://github.com/kubeflow/notebooks)
workspace management UI into the ODH Dashboard via Module Federation. It extends the main
dashboard's workbench capabilities with Workspace and WorkspaceKind management pages sourced from
the upstream Kubeflow Notebooks project, tracked as a git subtree under `upstream/`.

**Package path**: `packages/notebooks/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Federated (ODH dev) | `npm run start:dev` in this package, then `npm run dev:frontend` from repo root | `http://localhost:4010` |
| Mocked (standalone) | `cd upstream/workspaces && make tilt-up` | See upstream docs |

The primary development mode for ODH integration is federated. The upstream project also supports
its own standalone and Kubeflow deployment modes; refer to
`packages/notebooks/upstream/DEVELOPMENT_GUIDE.md` for those workflows.

> **Note**: Do not use `npm run start:dev:ext` for the ODH frontend when testing this
> integration. Use `npm run dev:frontend` from the repo root instead.

## BFF Architecture

Not applicable — this package has no BFF.

## OpenAPI Specification

Not applicable.

## Module Federation

**Config file**: `packages/notebooks/package.json` (`"module-federation"` key)

**Remote entry name**: `notebooks`

**Remote entry location**:
- Cluster: `/remoteEntry.js` served by the `odh-dashboard` service on port 8343
- Local dev: `http://localhost:9105` (started by `npm run start:dev`)

**Proxy path**: `/workspaces/api` → rewritten to `/api` on the upstream backend

**Exposed module consumed**:
- The upstream frontend's Module Federation container exposes routes loaded by `NotebooksWrapper.tsx`

**Main dashboard registration**: `packages/notebooks/upstream/workspaces/frontend/src/odh/extensions.ts`
— declares `AreaExtension`, `NavExtension`, and `RouteExtension` entries.

```bash
# Start the notebooks federated frontend (port 9105)
npm run start:dev
# In another terminal, start the ODH host dashboard
npm run dev:frontend
# Navigate to: AI Hub > Workspaces or AI Hub > Workspace Kinds
```

## Architecture

```text
packages/notebooks/
├── upstream/                        # Git subtree: github.com/kubeflow/notebooks (branch: notebooks-v2)
│   ├── workspaces/
│   │   ├── frontend/
│   │   │   └── src/
│   │   │       ├── app/             # App entry, routes
│   │   │       ├── odh/             # ODH-specific extensions and wrapper
│   │   │       │   ├── extensions.ts      # Registers area, nav, and route extensions
│   │   │       │   └── NotebooksWrapper.tsx
│   │   │       ├── pages/           # Workspace and WorkspaceKind pages
│   │   │       └── shared/          # Shared components and utilities
│   │   └── backend/                 # Upstream Go BFF (not used directly by ODH)
│   └── developing/                  # Tilt and local dev tooling
├── Dockerfile.workspace             # Workspace-aware Docker build (run from repo root)
├── docs/
│   └── overview.md                  # This file
├── package.json                     # Module Federation config and subtree metadata
└── tsconfig.json
```

The package is a thin ODH integration layer around the upstream Kubeflow Notebooks frontend.
The upstream code lives in `upstream/` as a git subtree pinned to commit `8f0495d`. ODH-specific
glue (extensions, wrapper component) lives under `upstream/workspaces/frontend/src/odh/`.

The Docker build (`Dockerfile.workspace`) must be run from the repository root because the
federated frontend depends on workspace packages (`@odh-dashboard/plugin-core`,
`@odh-dashboard/internal`, `@openshift/dynamic-plugin-sdk`) that are not published to npm.

## Key Concepts

| Term | Definition |
|------|-----------|
| **NotebookImage** | A container image registered as a WorkspaceKind that defines the environment available to a notebook workspace. |
| **NotebookServer** | In the upstream Kubeflow model, the running container instance for a Workspace; lifecycle managed via Kubernetes WorkspaceKind and Workspace CRs. |
| **CustomNotebookEnvironment** | A user-defined WorkspaceKind that extends a base image with additional packages or configuration. |
| **Workspace** | The Kubeflow Notebooks v2 CR (`kind: Workspace`) representing a running notebook environment; analogous to a JupyterServer in v1. |
| **WorkspaceKind** | The Kubeflow Notebooks v2 CR (`kind: WorkspaceKind`) defining the image and resource profile available to Workspaces. |
| **notebooks-plugin** | The area ID registered by this package's extensions; controlled by the `Notebooks Plugin` dev flag. |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- ODH backend running: `npm run dev:backend` from repo root
- `Notebooks Plugin` dev flag enabled in your ODH cluster or dev config

### Install upstream frontend dependencies

```bash
npm run install:module
# Equivalent to: npm install --prefix upstream/workspaces/frontend
```

### Start in federated mode

```bash
# Terminal 1 — notebooks federated frontend (port 9105)
npm run start:dev

# Terminal 2 — wait for notebooks to be ready, then start ODH host
npm run start:dev:wait && npm run dev:frontend
# Navigate to: AI Hub > Workspaces
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `PORT` | Dev server port for the notebooks frontend | `9105` | No |
| `DEPLOYMENT_MODE` | Must be `federated` for ODH integration | `federated` | No |
| `MODULE_NAME` | Docker build arg: module name to build | `notebooks` | No |

The `Notebooks Plugin` area flag is controlled by `OdhDashboardConfig` on the cluster (or by
dev flags in local config). The area also declares `reliantAreas: ['workbenches']`, so the
core workbench area must be enabled for the nav items to appear.

## Testing

### Frontend Unit Tests

```bash
npx turbo run test:unit --filter=@odh-dashboard/notebooks
```

### Upstream Tests

```bash
cd packages/notebooks/upstream/workspaces/frontend
npm test
```

### Cypress Tests

```bash
npm run test:cypress-ci -- --spec "**/notebooks/**"
```

This package has no contract tests (no ODH BFF).

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host application | Loads this package's federated remote entry via Module Federation; provides `@odh-dashboard/plugin-core` and `@odh-dashboard/internal` |
| Workbenches (frontend area) | Reliant area | The `notebooks-plugin` area declares `reliantAreas: ['workbenches']`; see [Workbenches Docs] |
| Kubernetes Workspace CR | Kubernetes API | Upstream backend manages `kind: Workspace` CRs for notebook lifecycle |
| Kubernetes WorkspaceKind CR | Kubernetes API | Upstream backend manages `kind: WorkspaceKind` CRs for image and resource profiles |
| JupyterHub | External service | Applicable only if the upstream deployment targets JupyterHub mode; not required for ODH federated integration |
| `upstream/workspaces/backend` | Upstream Go BFF | The upstream project includes its own BFF; in ODH federated mode, API calls are proxied via `/workspaces/api` → `/api` through the ODH proxy |

## Known Issues / Gotchas

- The upstream subtree is pinned to a specific commit (`8f0495d`). To update it, run
  `npm run update-subtree`. Review upstream changelog before updating — breaking changes to the
  extensions API or WorkspaceKind schema require ODH-side adjustments in `src/odh/`.
- `npm run start:dev:ext` starts the upstream frontend in isolation (no ODH host). Use
  `npm run start:dev` for ODH federated integration, not `start:dev:ext`.
- The Docker build (`Dockerfile.workspace`) must be run from the repository root, not from
  `packages/notebooks/`. Running it from the package directory will fail because workspace
  dependencies are not available in that context.
- The `Notebooks Plugin` area uses a dev flag (`devFlags: ['Notebooks Plugin']`). It will not
  appear in production builds until the flag is promoted to a feature flag.

## Related Docs

- [Guidelines] — documentation style guide
- [Module Federation Docs] — how Module Federation works in this monorepo
- [Workbenches Docs] — the main dashboard workbench frontend area
- [Backend Overview] — main dashboard backend reference
- [BOOKMARKS] — full doc index
