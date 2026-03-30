[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md
[MLflow Package]: ../../mlflow/docs/overview.md

# MLflow Embedded

**Last Updated**: 2026-03-09 | **Template**: package-template v1

## Overview

MLflow Embedded is a host-side extension package that integrates selected pages from the external
MLflow frontend into the ODH Dashboard via Module Federation. It registers the "Experiments
(MLflow)" navigation entry under "Develop and Train" and wraps the remotely loaded MLflow UI with
ODH page chrome, project selection, and authentication session passthrough.

**Package path**: `packages/mlflow-embedded/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Federated | Start external MLflow dev server on port 9300, then `npm run dev` from repo root | `http://localhost:4010` |

This package has no standalone or Kubeflow mode. It is a host-side extension only — it has no
build step of its own and its TSX files are compiled by the host dashboard's Webpack. The external
MLflow frontend must be running separately and exposing a Module Federation remote entry on port
9300 (local) or port 8443 (cluster, TLS).

## BFF Architecture

Not applicable — this package has no BFF.

## OpenAPI Specification

Not applicable.

## Module Federation

**Config file**: `packages/mlflow-embedded/package.json` (`"module-federation"` key — no separate
Webpack config; the host dashboard reads this config to register the remote)

**Remote entry name**: `mlflowEmbedded`

**Remote entry location**:
- Cluster: `/mlflow/static-files/federated/remoteEntry.js` (served by the `mlflow` service on
  port 8443, TLS)
- Local dev: `http://localhost:9300` (external MLflow dev server)

**Proxy path**: `/mlflow` → external MLflow service port 8443 (cluster) or `localhost:5001` (local)

**Exposed module consumed**:
- `mlflowEmbedded/MlflowExperimentWrapper` — the remote React component loaded inside
  `MlflowExperimentsPage.tsx` via `loadRemote()` from `@module-federation/runtime`

**Main dashboard registration**: `packages/mlflow-embedded/extensions.ts` — declares
`AreaExtension`, `HrefNavItemExtension`, and `RouteExtension` using `@odh-dashboard/plugin-core`.

```bash
# Start external MLflow frontend (external repo, separate process)
# Then start the ODH Dashboard host:
npm run dev
# Navigate to: Develop and Train > Experiments (MLflow)
```

## Architecture

```text
packages/mlflow-embedded/
├── extensions.ts                    # Registers area, nav item, and route extensions
├── GlobalMLflowExperimentsRoutes.tsx # Route handler with project/workspace selection
├── MlflowExperimentsPage.tsx        # Loads federated MlflowExperimentWrapper via loadRemote()
├── docs/
│   └── overview.md                  # This file
├── package.json                     # Module Federation config (no separate webpack.config.js)
└── tsconfig.json
```

The package has no build output. The host dashboard's Webpack picks up `extensions.ts` (declared
in `"exports"`) and compiles all TSX at host build time. At runtime, `MlflowExperimentsPage`
calls `loadRemote('mlflowEmbedded/MlflowExperimentWrapper')`, which fetches the remote entry from
the external MLflow server. If the remote cannot be reached, the page renders the
`MLflowUnavailable` empty state instead of failing.

The `key={workspace}` prop on `LazyCodeRefComponent` forces a remount whenever the selected
project changes. This is required because the remote MLflow app uses React Router v6
`BrowserRouter`, which does not detect the host's React Router v7 `pushState` navigation.

## Key Concepts

| Term | Definition |
|------|-----------|
| **EmbeddedIframe** | Historical term from the iframe-based predecessor; the current implementation uses Module Federation `loadRemote()`, not an iframe. |
| **MLflowUI** | The externally hosted React application (not in this monorepo) that exposes `MlflowExperimentWrapper` as a federated module. |
| **SessionPassthrough** | The ODH Dashboard proxy rewrites `/mlflow` requests to the cluster MLflow service, forwarding the user's auth session via TLS and the `authorize: true` proxy config. |
| **MlflowExperimentWrapper** | The federated module exposed by the external MLflow frontend; resolved at runtime via `loadRemote()`. |
| **WORKSPACE_QUERY_PARAM** | URL query parameter used to carry the selected project namespace into and out of the federated MLflow component. |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- External MLflow frontend dev server running on `localhost:9300`
- `mlflow` and `ds-pipelines` feature flags enabled in your ODH cluster or dev config

### Start in federated mode

```bash
# From the repo root — starts the host dashboard, which picks up this extension
npm run dev
# Navigate to Develop and Train > Experiments (MLflow)
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `DEPLOYMENT_MODE` | Must be `federated` for this package | `federated` | No |

Feature flags are controlled by `OdhDashboardConfig` on the cluster, not by environment
variables. The `mlflow` and `ds-pipelines` flags must both be enabled for the nav item and route
to appear.

## Testing

### Frontend Unit Tests

```bash
npx turbo run test:unit --filter=@odh-dashboard/mlflow-embedded
```

### Cypress Tests

```bash
npm run test:cypress-ci -- --spec "**/mlflow/**"
```

This package has no contract tests (no BFF).

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host application | Compiles this package's TSX; loads extensions via `@odh-dashboard/plugin-core` |
| `packages/mlflow` | Sibling package | Shares route utilities from `@odh-dashboard/internal/routes/pipelines/mlflow`; distinct from this package — `mlflow` provides a custom ODH-styled view, this package embeds the native MLflow UI |
| External MLflow server | Module Federation remote | Exposes `mlflowEmbedded/MlflowExperimentWrapper`; must be reachable at `/mlflow/static-files/federated/remoteEntry.js` on the cluster |
| `@odh-dashboard/internal` | Shared library | Provides `ApplicationsPage`, `PipelineCoreProjectSelector`, route constants, and analytics utilities |

## Known Issues / Gotchas

- The remote MLflow app uses React Router v6 `BrowserRouter`. The host uses React Router v7.
  Navigation changes in the host do not propagate into the remote. The `key={workspace}` remount
  workaround handles project switching, but deep-link navigation within MLflow may not sync back
  to the host URL bar.
- If the external MLflow service is unavailable, `loadRemote()` rejects and the page renders
  `MLflowUnavailable`. No retry logic exists; the user must reload the page.
- Both the `mlflow` and `ds-pipelines` feature flags must be enabled. Enabling only `mlflow` will
  not show the nav item.
- Do not confuse this package with `packages/mlflow`. That package provides a custom
  ODH-styled MLflow experience; this package embeds the upstream MLflow web UI directly.

## Related Docs

- [Guidelines] — documentation style guide
- [Module Federation Docs] — how Module Federation works in this monorepo
- [MLflow Package] — the ODH-styled MLflow package (sibling)
- [Backend Overview] — main dashboard backend reference
- [BOOKMARKS] — full doc index
