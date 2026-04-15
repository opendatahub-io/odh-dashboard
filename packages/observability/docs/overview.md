# Observability

## Overview

- `@odh-dashboard/observability` embeds [Perses](https://perses.dev) dashboards into ODH Dashboard for metrics, monitoring, and tracing around AI workloads and infrastructure.
- Frontend-only; main dashboard backend proxies Perses at `/perses/api`.
- Tech Preview; aimed at admin users.

## Design Intent

- **No package BFF**: UI calls Perses through the **host proxy** (`/perses/api` → Perses service, with authorization).
- **Module Federation**: Remote `perses` (see `package.json`); `./DashboardPage` backs `/observe-and-monitor/dashboard/*`.
- **extensions.ts**: Wires `app.area` (`observabilityDashboard` flag), nav under “Observe and monitor” (with admin / plugin flags), and the route.
- **Theming**: Perses panels are **MUI-based**; aligns Perses theming with ODH where possible (`src/perses/theme.ts`) but stays on Material UI for `@perses-dev/*` compatibility.
- **Client and datasource**: `perses-client/` holds vendored API client code not on npm; `OdhDatasourceApi` resolves datasources through the ODH proxy.
- **Variables**: `ClusterDetailsVariablesProvider` injects cluster-level template variables into dashboard context.
- **Navigation**: Internal Perses links intercepted (`useRelativeLinkHandler`) so in-app clicks stay in the ODH shell instead of raw Perses routes.

## Key Concepts

| Term | Definition |
|------|-----------|
| **Perses** | Dashboard framework used instead of embedded Grafana for this feature. |
| **PersesBoard** | Wrapper around Perses `<Dashboard>` with theming and variables. |
| **MetricDashboard** | Perses dashboard resource from the server, rendered in the UI. |
| **PrometheusQuery** | PromQL in a panel, executed via Perses Prometheus plugin. |
| **ThanosSidecar** | Long-term metrics path; datasources may target Thanos Query. |
| **DatasourceApi** | Perses interface implemented by `OdhDatasourceApi` for proxy-backed config. |
| **AlertRule** | Prometheus alerting rules; may appear in Perses panels. |
| **ClusterDetailsVariablesProvider** | Injects cluster template variables into every dashboard. |

## Interactions

| Dependency | Type | Details |
|-----------|------|---------|
| Main ODH Dashboard | Host | Federation, auth, `OdhDashboardConfig` flags. |
| Dashboard backend | Proxy | `/perses/api` → `data-science-perses:8080` (or local equivalent). |
| Perses server | External | Dashboard and datasource definitions. |
| Prometheus / Thanos | Metrics | Datasource endpoints for PromQL execution. |
| `packages/model-serving` | Package | Model serving metrics often visualized in Perses panels. |

## Known Issues / Gotchas

- Nav needs **both** `observabilityDashboard` and admin gating (`ADMIN_USER`); non-admins may not see the entry even if the flag is on.
- **`perses-client/`**: Vendored (related to OpenShift monitoring-plugin patterns) until Perses publishes equivalent client APIs on npm — remove when upstream exposes them.
- **MUI vs PatternFly**: This package's `src/` tree stays on MUI for Perses compatibility. Do not add PatternFly imports inside this package — the host shell (nav, page chrome) is already PF via the federation host. Mixing frameworks causes CSS conflicts.
- **Time range**: Owned by Perses; do not duplicate sync with arbitrary ODH query params — use `HeaderTimeRangeControls` as the control surface.
