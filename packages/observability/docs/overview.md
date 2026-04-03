[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Model Serving]: ../../model-serving/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md

# Observability

**Last Updated**: 2026-03-09 | **Template**: package-template v1

## Overview

`@odh-dashboard/observability` embeds [Perses](https://perses.dev) dashboards into the ODH
Dashboard to provide metrics, monitoring, and tracing for AI workloads and infrastructure.
It is frontend-only (no BFF); the main dashboard backend proxies requests to the Perses
server at `/perses/api`. The feature is currently Tech Preview and visible to admin users only.

**Package path**: `packages/observability/`

## Deployment Modes

| Mode | How to start | Access URL |
|------|-------------|-----------|
| Federated | `npm run dev` from repo root (loads this package via Module Federation) | `http://localhost:4010` |

This package ships no standalone server. It is always loaded as a federated extension by the
main ODH Dashboard. A local Perses server (default port `9005`) is required for the proxy to
resolve dashboard and datasource configurations during development.

## BFF Architecture

Not applicable.

## OpenAPI Specification

Not applicable.

## Module Federation

**Config file**: `packages/observability/package.json` (`module-federation` section)

**Remote entry name**: `perses` (declared in `package.json` `module-federation.name`)

**Exposed modules**:
- `./DashboardPage` — top-level page component; loaded by the main dashboard when the user
  navigates to `/observe-and-monitor/dashboard/*`

**Proxy service** (declared in `package.json` `module-federation.proxyService`):
- Path `/perses/api` forwarded to `data-science-perses:8080`; locally to `localhost:9005`
- Requests are authorized before forwarding

**Main dashboard registration**: `packages/observability/extensions.ts`

The extension declares three entries:

- `app.area` — gated by the `observabilityDashboard` feature flag
- `app.navigation/href` — adds "Dashboard" under "Observe and monitor"; requires both
  `plugin-observability` and `ADMIN_USER` flags (Tech Preview label applied)
- `app.route` — maps `/observe-and-monitor/dashboard/*` to `DashboardPage`

```bash
# From repo root — start the main dashboard which loads observability via Module Federation
npm run dev
# Navigate to http://localhost:4010/observe-and-monitor/dashboard
```

## Architecture

```text
packages/observability/
├── extensions.ts                   # Extension point declarations (area, nav, route)
├── src/
│   ├── api/
│   │   ├── models.ts               # TypeScript types for Perses API responses
│   │   ├── useClusterDetails.ts    # Fetches cluster details for variable injection
│   │   └── usePersesDashboards.ts  # Fetches dashboard list from Perses via proxy
│   ├── hooks/
│   │   └── useRelativeLinkHandler.ts  # Intercepts Perses-internal link clicks
│   ├── pages/
│   │   ├── DashboardPage.tsx                  # Route root; selects dashboard from URL
│   │   ├── DashboardContent.tsx               # Renders PersesBoard for selected dashboard
│   │   ├── ClusterDetailsVariablesProvider.tsx # Injects cluster variables into Perses context
│   │   ├── HeaderTimeRangeControls.tsx         # Time range picker in the page header
│   │   ├── NamespaceUrlSync.tsx                # Syncs selected namespace to URL query params
│   │   └── const.ts                            # Route and query-param constants
│   ├── perses/
│   │   ├── PersesBoard.tsx             # Wraps Perses <Dashboard> component
│   │   ├── PersesWrapper.tsx           # Provides Perses plugin registry and theme
│   │   ├── persesPluginsLoader.tsx     # Registers all @perses-dev/* chart/panel plugins
│   │   ├── theme.ts                    # PatternFly-aligned Perses theme overrides
│   │   └── perses-client/             # Vendored Perses API client (see README inside)
│   └── utils/                          # Dashboard variable transforms and URL helpers
├── cypress/                            # Cypress mocked tests
├── docs/
│   └── overview.md                     # This file
└── package.json
```

Perses dashboards and datasource configurations are fetched through the ODH backend proxy at
`/perses/api`. The vendored `perses-client/` directory provides API client code that the
Perses npm packages do not export publicly; it will be removed once Perses exposes these
methods upstream. The package uses Material UI (via `@mui/material`) rather than PatternFly
because Perses components are MUI-based.

## Key Concepts

| Term | Definition |
|------|-----------|
| **Perses** | Open-source dashboard framework (`perses.dev`) used to render metric panels; replaces embedded Grafana |
| **PersesBoard** | ODH wrapper component around the Perses `<Dashboard>` that applies theming and variable injection |
| **MetricDashboard** | A Perses dashboard resource fetched from the Perses server and rendered in the UI |
| **PrometheusQuery** | A PromQL expression embedded in a Perses panel, executed via the Perses Prometheus plugin |
| **ThanosSidecar** | Thanos component aggregating long-term Prometheus data; the Perses server datasource may point to a Thanos Query endpoint |
| **DatasourceApi** | Interface from `@perses-dev/dashboards` implemented by `OdhDatasourceApi` to resolve datasource configs through the ODH proxy |
| **AlertRule** | Prometheus alerting rule; may be visualised via a Perses stat or timeseries panel |
| **ClusterDetailsVariablesProvider** | React component that injects cluster-level template variables (e.g., cluster name) into every Perses dashboard |

## Quick Start

### Prerequisites

- Node.js >= 22.0.0
- Access to an OpenShift / Kubernetes cluster with the Perses operator installed
  (`data-science-perses` service on port `8080`)
- `observabilityDashboard` feature flag enabled in `OdhDashboardConfig`
- Admin-level ODH user (the nav entry is gated to `ADMIN_USER`)

### Start in federated mode

```bash
# From the repo root:
npm run dev
# Navigate to http://localhost:4010/observe-and-monitor/dashboard
```

A local Perses server on port `9005` must be running for the proxy to resolve dashboards.

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|---------|
| `DEPLOYMENT_MODE` | Must be `federated` for this package | `federated` | No |
| `DEV_MODE` | Enable development-only UI features | `false` | No |
| `PERSES_LOCAL_PORT` | Local port for the Perses proxy target during development | `9005` | No |

## Testing

### Frontend unit tests

```bash
npx turbo run test-unit --filter=@odh-dashboard/observability
```

Unit tests live alongside source files in `__tests__/` directories. Key coverage areas:
- `hooks/__tests__/` — relative link handler behaviour
- `pages/__tests__/` — `NamespaceUrlSync` query-param sync
- `utils/__tests__/` — dashboard variable transforms, URL helpers

### Cypress tests

```bash
npm run test:cypress-ci -- --spec "**/observability/**"
```

Mocked Cypress tests are located in `packages/observability/cypress/tests/mocked/`.

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host application | Loads this package via Module Federation; provides auth, routing, and `OdhDashboardConfig` feature flags |
| Dashboard backend | Proxy endpoint | Forwards `/perses/api` requests to the `data-science-perses` Kubernetes service with authorization |
| Perses server | External service | Source of dashboard and datasource configurations; queried through the backend proxy |
| Prometheus / Thanos | Metrics source | Perses panels execute PromQL queries via configured datasources pointing to Prometheus or Thanos Query |
| `packages/model-serving` | Package | Model serving performance metrics (request latency, throughput, error rates) are visualised as Perses panels |

## Known Issues / Gotchas

- The `observabilityDashboard` feature flag AND the `ADMIN_USER` guard must both be satisfied;
  non-admin users will not see the nav entry even if the flag is enabled.
- The `perses-client/` directory is vendored from the OpenShift `monitoring-plugin` because
  Perses does not export its API client publicly. Track the upstream Perses issue and remove
  this directory once the methods are exposed via npm packages.
- Perses uses Material UI internally; this package bundles `@mui/material` separately from the
  PatternFly used elsewhere in ODH. Avoid importing PatternFly layout components inside Perses
  panel wrappers to prevent CSS conflicts.
- Time range state is managed by Perses internally; do not attempt to synchronise it with
  ODH's own URL query params — use `HeaderTimeRangeControls` as the sole control surface.

## Related Docs

- [Guidelines] — documentation style guide
- [Model Serving] — source of model performance metrics visualised in observability dashboards
- [Module Federation Docs] — how Module Federation works in this monorepo
- [Backend Overview] — main dashboard backend reference (Prometheus proxy endpoint context)
- [BOOKMARKS] — full doc index
