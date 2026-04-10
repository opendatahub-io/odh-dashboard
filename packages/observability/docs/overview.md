[Guidelines]: ../../../docs/guidelines.md
[BOOKMARKS]: ../../../BOOKMARKS.md
[Backend Overview]: ../../../backend/docs/overview.md
[Model Serving]: ../../model-serving/docs/overview.md
[Module Federation Docs]: ../../../docs/module-federation.md

# Observability

**Last Updated**: 2026-04-10 | **Template**: package-template v2

## Overview

`@odh-dashboard/observability` embeds [Perses](https://perses.dev) dashboards into ODH Dashboard for metrics, monitoring, and tracing around AI workloads and infrastructure. It is frontend-only; the main dashboard backend proxies Perses at `/perses/api`. The feature is Tech Preview and aimed at admin users.

**Package path**: `packages/observability/`

## Deployment Modes

| Mode | How to start | Notes |
|------|-------------|-------|
| Federated | `npm run dev` (repo root) | Host loads remote; open `/observe-and-monitor/dashboard`. |

A Perses instance reachable by the proxy (cluster `data-science-perses` or local dev target, commonly port 9005) is required for dashboards and datasources to load during development and in-cluster.

Without Perses, the area may load but panels will fail to resolve datasources or dashboard lists.

## Design Intent

No package BFF: the UI calls Perses through the **host proxy** (`/perses/api` → Perses service, with authorization). **Module Federation** remote name `perses` (see `package.json`); exposed module `./DashboardPage` backs `/observe-and-monitor/dashboard/*`. `extensions.ts` wires `app.area` (`observabilityDashboard` flag), nav under “Observe and monitor” (with admin / plugin flags), and the route.

Perses panels are **MUI-based**; this package aligns Perses theming where possible with ODH (see `src/perses/theme.ts`) but remains on Material UI for compatibility with `@perses-dev/*` components. `perses-client/` holds vendored API client code not exported from upstream npm packages; `OdhDatasourceApi` implements datasource resolution through the ODH proxy. `ClusterDetailsVariablesProvider` injects cluster-level template variables into dashboard context.

Internal Perses navigation links are intercepted (`useRelativeLinkHandler`) so in-app clicks stay inside the ODH shell instead of escaping to raw Perses routes.

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

## Related Docs

- [Guidelines] — documentation style guide
- [Model Serving] — metrics sources for dashboards
- [Module Federation Docs] — federation in the monorepo
- [Backend Overview] — backend proxy context
- [BOOKMARKS] — full doc index
