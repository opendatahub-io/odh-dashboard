# Observability

## Overview

- `@odh-dashboard/observability` embeds [Perses](https://perses.dev) dashboards into ODH Dashboard for metrics, monitoring, and tracing around AI workloads and infrastructure.
- Frontend-only; main dashboard backend proxies Perses at `/perses/api`.
- Visible when the DSCI monitoring stack reports ready (`MonitoringReady` + `PersesAvailable` conditions).

## Design Intent

- **No package BFF**: UI calls Perses through the **host proxy** (`/perses/api` → Perses service, with authorization).
- **Module Federation**: Remote `perses` (see `package.json`); route `/observe-and-monitor/dashboard/*`.
- **DSCI condition gating**: `extensions.ts` wires `app.area` with `observabilityDashboard` feature flag **and** a `customCondition` that calls `isMonitoringStackAvailable(dsciStatus)`. The nav entry only appears when both the flag is enabled and the DSCI conditions (`MonitoringReady`, `PersesAvailable`) report `True`.
- **RBAC — SAR-based dashboard filtering**: `usePersesDashboards` performs a `SelfSubjectAccessReview` against Thanos querier (`prometheuses/api` in `openshift-monitoring`). Users with cluster metrics access see `-admin` dashboard variants; others see the base dashboards only. See `filterDashboards()` in `dashboardUtils.ts`.
- **Embeddable Perses API**: `src/perses/embeddable/` exports composable building blocks (`PersesProvider`, `PersesDashboard`, `PersesVariables`, `PersesTimeControls`, `usePersesDashboard`) so other packages can embed Perses dashboards without duplicating provider wiring.
- **Theming**: Perses panels are **MUI-based**; aligns Perses theming with ODH where possible (`src/perses/theme.ts`) but stays on Material UI for `@perses-dev/*` compatibility.
- **Client and datasource**: `perses-client/` holds vendored API client code not on npm; `OdhDatasourceApi` resolves datasources through the ODH proxy.
- **Variables**: `ClusterDetailsVariablesProvider` injects cluster-level template variables (API server URL, operator channel, OpenShift version, infrastructure provider) into dashboards that declare those variables. `transformNamespaceVariable` replaces the Prometheus-backed namespace variable with a `StaticListVariable` populated from project names, avoiding a PromQL round-trip.
- **Multi-dashboard tabs**: `DashboardContent` renders multiple Perses dashboards as PF `Tabs`, selected via `?dashboard=<name>` query param.
- **Navigation**: Internal Perses links intercepted (`useRelativeLinkHandler`) so in-app clicks stay in the ODH shell instead of raw Perses routes.

## Key Concepts

| Term | Definition |
|------|-----------|
| **Perses** | Dashboard framework used instead of embedded Grafana for this feature. |
| **PersesProvider** | Composable wrapper that sets up MUI theming, plugin registry, time range, variables, datasource, and dashboard contexts for an embedded Perses dashboard. Supports URL-synced and in-memory modes via `syncToUrl`. |
| **PersesDashboard** | Thin wrapper around `@perses-dev/dashboards` `<Dashboard>` rendered inside a `PersesProvider`. |
| **PersesVariables** | Renders the Perses variable selector toolbar (`DashboardStickyToolbar`). |
| **PersesTimeControls** | Renders time range picker and refresh controls. |
| **MonitoringStatus** | Result of `getMonitoringStatus()` — checks DSCI `MonitoringReady` and `PersesAvailable` conditions to decide package visibility. |
| **filterDashboards** | Utility that selects dashboards by name prefix (`dashboard-*`) and swaps base/admin variants based on SAR result. |
| **PrometheusQuery** | PromQL in a panel, executed via Perses Prometheus plugin. |
| **ThanosSidecar** | Long-term metrics path; datasources may target Thanos Query. |
| **DatasourceApi** | Perses interface implemented by `OdhDatasourceApi` for proxy-backed config. |
| **ClusterDetailsVariablesProvider** | Injects cluster template variables (API_SERVER, CHANNEL, OPENSHIFT_VERSION, INFRASTRUCTURE_PROVIDER) into dashboards that declare them. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host | Federation, auth, `OdhDashboardConfig` flags, project list for namespace variable. |
| Dashboard backend | Proxy | `/perses/api` → `data-science-perses:8080` (or local equivalent). |
| DSCI status | Condition | `MonitoringReady` + `PersesAvailable` conditions gate package visibility. |
| Perses server | External | Dashboard and datasource definitions. |
| Prometheus / Thanos | Metrics | Datasource endpoints for PromQL execution; SAR check against Thanos querier determines admin dashboard access. |
| `packages/model-serving` | Package | Model serving metrics often visualized in Perses panels. |

## Known Issues / Gotchas

- **DSCI condition dependency**: The nav entry requires `observabilityDashboard` feature flag **and** `MonitoringReady` + `PersesAvailable` DSCI conditions to be `True`. If the monitoring stack is partially deployed, the entry silently disappears.
- **`perses-client/`**: Vendored (related to OpenShift monitoring-plugin patterns) until Perses publishes equivalent client APIs on npm — remove when upstream exposes them.
- **MUI vs PatternFly**: This package's `src/` tree stays on MUI for Perses compatibility. Do not add PatternFly imports inside this package — the host shell (nav, page chrome) is already PF via the federation host. Mixing frameworks causes CSS conflicts.
- **Time range**: Owned by Perses; do not duplicate sync with arbitrary ODH query params — use `HeaderTimeRangeControls` as the control surface.
