# Observability Dashboards

This document describes how component teams contribute Perses dashboards to the ODH Dashboard UI.

## Overview

The ODH Dashboard uses [Perses](https://perses.dev/) dashboards for observability features. Dashboards are defined as Kubernetes `PersesDashboard` custom resources and are loaded dynamically by the UI. The UI fetches all dashboards and filters them by name prefix and admin status regardless of which project they belong to.

## Dashboard Ownership

Component teams should own their `PersesDashboard` CRDs alongside their component deployments. This is the **default and recommended** approach.

Contributing a dashboard directly into the `odh-dashboard` repository is the **exception** — reserved for dashboards that have no owning component or no better location (e.g. cluster-wide infrastructure metrics with no single owning operator).

### Why component-owned is preferred

A `PersesDashboard` CR deployed alongside its component is present **only when that component is installed**. This ties the dashboard's lifecycle directly to the resource it monitors.

By contrast, dashboards contributed into `odh-dashboard` are governed by the dashboard's own enablement and the monitoring stack availability. They appear regardless of whether the dependent component is actually installed, which can lead to empty or broken panels when the component is absent.

## Component-Owned Dashboards (Recommended)

If your team manages a component with its own deployment manifests, your Perses dashboard belongs there.

### Workflow

1. **Author** your dashboard spec locally. Use the [Perses UI](https://perses.dev/perses/docs/overview/), the Cluster Observability Operator (v1.4+) built-in UI editor, or write YAML/JSON directly.
2. **Validate** the dashboard renders correctly in a local or dev Perses instance.
3. **Add** the `PersesDashboard` CR to your component's manifest directory so it deploys alongside your component.
4. **Follow the naming convention** below — the ODH Dashboard UI only loads resources with the `dashboard-` prefix.
5. **Deploy** — the dashboard appears in the ODH UI automatically when your component is installed in a cluster with the Perses operator and monitoring stack active.

### Requirements for ODH Dashboard pickup

- The resource name must follow the `dashboard-{order}-{name}[-admin]` naming convention (see [Naming Convention](#naming-convention) below).
- The `PersesDashboard` CR must reference valid Perses datasources (Prometheus, Loki, etc.) that are accessible from the cluster.
- The monitoring stack must be configured and enabled in the DSCI.
- No coordination with the dashboard team is required for deployment — the UI discovers the resource automatically.

---

## Contributing to odh-dashboard (Exception)

Use this path only when there is no owning component for the dashboard or when the dashboard team has approved this as the appropriate location. Examples include cluster-wide infrastructure metrics or cross-cutting observability that doesn't belong to a single operator.

### Workflow

1. **Author and validate** your dashboard spec locally (same as above).
2. **Submit a PR** adding your dashboard YAML to `manifests/observability/` in this repository.
3. **Review**: The PR must be reviewed by `@openshift/odh-dashboard-maintainers`. Net-new tabs (new UX surface area) require PM approval.
4. **Merge and deploy**: Merged dashboards are applied by the dashboard operator as part of the standard reconciliation loop.

### File location

Dashboard manifest files in this repo are placed in:

```
manifests/observability/
```

### Naming Convention

#### Resource name

Dashboard resource names **must** follow this pattern:

```
dashboard-{order}-{name}[-admin]
```

> **Important:** The `dashboard-` prefix is required. Resources without this prefix will not be loaded by the UI.

| Component | Required | Description | Examples |
|-----------|----------|-------------|----------|
| `order` | Yes | Lexicographic ordering for tab display (sorted alphabetically) | `0`, `1`, `12` |
| `name` | Yes | The dashboard name | `cluster`, `model` |
| `-admin` | No | Optional suffix to restrict visibility to admin users only | `-admin` |

**Examples:**
- `dashboard-0-cluster-admin` — first tab, cluster dashboard (admin only)
- `dashboard-1-model` — second tab, model dashboard (all users)

#### Display name

The `spec.display.name` field in the dashboard definition is used to label the tab in the UI:

```yaml
spec:
  display:
    name: My Dashboard  # This text appears on the tab
```

## Namespace Variable

The ODH Dashboard has **custom handling for the `namespace` variable**. When a dashboard is loaded within ODH, the UI automatically supplies a filtered set of namespaces based on the user's project access permissions.

### How it works

1. **Within ODH**: The UI transforms the `namespace` variable to use a static list of project names that the user has access to. This provides proper RBAC filtering and consistency with the rest of the UI where project selection is available.

2. **Outside ODH (fallback)**: The Prometheus query defined in the variable is executed to populate the namespace options. This allows the dashboard to work standalone in environments like the Perses UI.

### Adding namespace filter support

If your dashboard should support namespace filtering, include the following variable definition:

```yaml
variables:
  - kind: ListVariable
    spec:
      name: namespace
      display:
        name: Project
        description: Filter by project
      allowMultiple: true
      allowAllValue: true
      customAllValue: ".*"
      defaultValue: "$__all"
      plugin:
        kind: PrometheusLabelValuesVariable
        spec:
          datasource:
            kind: PrometheusDatasource
          labelName: namespace
          matchers:
            - <your_metric_name>
```

**Important fields:**

| Field | Value | Purpose |
|-------|-------|---------|
| `name` | `namespace` | Required — the UI looks for this exact name |
| `display.name` | `Project` | User-friendly label |
| `allowMultiple` | `true` | Enables multi-select |
| `allowAllValue` | `true` | Enables "All" option |
| `customAllValue` | `".*"` | Regex pattern for "All" in PromQL queries |
| `defaultValue` | `"$__all"` | Default to all namespaces |
| `matchers` | Your metric | Prometheus query used as fallback |

### Matcher query

The `matchers` field should contain a Prometheus metric query that returns namespaces relevant to your dashboard. This query is **only used as a fallback** when the dashboard is loaded outside of ODH (e.g., directly in the Perses UI).

## Complete Example

Here's a minimal dashboard definition:

```yaml
apiVersion: perses.dev/v1alpha1
kind: PersesDashboard
metadata:
  name: dashboard-2-my-dashboard
spec:
  display:
    name: My Dashboard
  duration: 1h
  variables:
    - kind: ListVariable
      spec:
        name: namespace
        display:
          name: Project
          description: Filter by project
        allowMultiple: true
        allowAllValue: true
        customAllValue: ".*"
        defaultValue: "$__all"
        plugin:
          kind: PrometheusLabelValuesVariable
          spec:
            datasource:
              kind: PrometheusDatasource
            labelName: namespace
            matchers:
              - my_custom_metric
  panels:
    myPanel:
      kind: Panel
      spec:
        display:
          name: My Panel
        plugin:
          kind: TimeSeriesChart
          spec:
            legend:
              position: bottom
        queries:
          - kind: TimeSeriesQuery
            spec:
              plugin:
                kind: PrometheusTimeSeriesQuery
                spec:
                  datasource:
                    kind: PrometheusDatasource
                  query: my_custom_metric{namespace=~"$namespace"}
  layouts:
    - kind: Grid
      spec:
        display:
          title: My Section
          collapse:
            open: true
        items:
          - x: 0
            y: 0
            width: 24
            height: 8
            content:
              $ref: "#/spec/panels/myPanel"
```

## Adding to Kustomization

After creating your dashboard manifest, add it to the kustomization file:

```yaml
# manifests/observability/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - perses-dashboard-cluster.yaml
  - perses-dashboard-model.yaml
  - perses-dashboard-my-dashboard.yaml  # Add your new dashboard
```

---

## When to Use Perses vs Custom Visualizations

| Use Perses when | Use custom code when |
|---|---|
| Standard time-series metrics (CPU, memory, request rates, latencies) | Non-time-series data (tables, topology maps, status matrices) |
| Data comes from Prometheus, Loki, or another supported Perses datasource | Data comes from sources for which no Perses datasource exists |
| Dashboard can be expressed as panels + variables | Heavy user interaction needed (drill-down, selection-driven views, inline actions) |
| No custom interactivity beyond time range and variable filtering | Tight integration with PatternFly components or existing page state |
| Historical trends and aggregated views over time windows | Real-time streaming or event-driven updates |

---

## Embedding Perses Dashboards in Other Packages

The `@odh-dashboard/observability` package provides a composable embeddable API that any package can use to render Perses dashboards within its own feature pages. This is useful when you want to show metrics inline (e.g. in a detail tab) rather than directing users to the central observability page.

### Rendering a static dashboard

Use when you have a `DashboardResource` object defined inline or received from a parent component:

```tsx
import { PersesProvider, PersesDashboard } from '@odh-dashboard/observability/embeddable';
import type { DashboardResource } from '@odh-dashboard/observability/embeddable';

const myDashboard: DashboardResource = {
  kind: 'Dashboard',
  metadata: {
    name: 'cpu-utilization',
    project: 'opendatahub',  // must be a valid cluster namespace
    createdAt: '',
    updatedAt: '',
    version: 0,
  },
  spec: {
    display: { name: 'CPU Utilization' },
    datasources: {},
    variables: [],
    panels: {
      cpuPanel: {
        kind: 'Panel',
        spec: {
          display: { name: 'CPU usage' },
          plugin: { kind: 'TimeSeriesChart', spec: {} },
          queries: [
            {
              kind: 'TimeSeriesQuery',
              spec: {
                plugin: {
                  kind: 'PrometheusTimeSeriesQuery',
                  spec: {
                    datasource: { kind: 'PrometheusDatasource' },
                    query: 'sum(rate(container_cpu_usage_seconds_total[5m]))',
                  },
                },
              },
            },
          ],
        },
      },
    },
    layouts: [
      {
        kind: 'Grid',
        spec: {
          display: { title: 'CPU' },
          items: [
            { x: 0, y: 0, width: 24, height: 10, content: { $ref: '#/spec/panels/cpuPanel' } },
          ],
        },
      },
    ],
    duration: '30m',
  },
};

const MyFeaturePage: React.FC = () => (
  <PersesProvider dashboardResource={myDashboard}>
    <PersesDashboard />
  </PersesProvider>
);
```

### Fetching a dashboard from the Perses API

Use `usePersesDashboard(project, name)` when the dashboard exists as a `PersesDashboard` CR in the cluster:

```tsx
import { Spinner, Alert } from '@patternfly/react-core';
import {
  PersesProvider,
  PersesDashboard,
  PersesTimeControls,
  usePersesDashboard,
} from '@odh-dashboard/observability/embeddable';

const MyFeaturePage: React.FC = () => {
  const { dashboard, loaded, error } = usePersesDashboard('opendatahub', 'my-dashboard');

  if (!loaded) {
    return <Spinner />;
  }
  if (error || !dashboard) {
    return <Alert variant="danger" title="Failed to load dashboard" />;
  }

  return (
    <PersesProvider dashboardResource={dashboard}>
      <PersesTimeControls />
      <PersesDashboard />
    </PersesProvider>
  );
};
```

### Project and namespace requirements

The `metadata.project` field on a `DashboardResource` **must be a valid Kubernetes namespace** in the cluster. The Perses operator maps projects 1:1 to namespaces, so any project name you reference must correspond to a namespace that exists.

When fetching a dashboard via `usePersesDashboard(project, name)`, pass the namespace where the dashboard's datasources are provisioned as the `project` argument.

### Variables and time controls

`PersesVariables` renders the variable selector dropdowns defined in the dashboard spec. `PersesTimeControls` renders the time range picker and refresh controls. Both are optional — omit them for a minimal panel-only embed.

```tsx
import {
  PersesProvider,
  PersesDashboard,
  PersesVariables,
  PersesTimeControls,
} from '@odh-dashboard/observability/embeddable';

const FullDashboardPage: React.FC<{ dashboard: DashboardResource }> = ({ dashboard }) => (
  <PersesProvider dashboardResource={dashboard} syncToUrl>
    <PersesTimeControls showRefreshInterval />
    <PersesVariables initialVariableIsSticky />
    <PersesDashboard />
  </PersesProvider>
);
```

`PersesVariables` props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialVariableIsSticky` | `boolean` | `false` | Whether the toolbar sticks to the top on scroll |

`PersesTimeControls` props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showTimeRangeSelector` | `boolean` | `true` | Show time range dropdown |
| `showRefreshButton` | `boolean` | `true` | Show refresh button |
| `showRefreshInterval` | `boolean` | `false` | Show refresh interval dropdown |
| `showCustomTimeRange` | `boolean` | `true` | Show custom time range picker |
| `showZoomButtons` | `boolean` | `false` | Show zoom in/out buttons |

### Multiple dashboards on one page

When rendering multiple dashboards, use the default `syncToUrl={false}` so each has independent in-memory state:

```tsx
<Stack hasGutter>
  <StackItem>
    <PersesProvider dashboardResource={overviewDashboard}>
      <PersesDashboard />
    </PersesProvider>
  </StackItem>
  <StackItem>
    <PersesProvider dashboardResource={detailDashboard}>
      <PersesDashboard />
    </PersesProvider>
  </StackItem>
</Stack>
```

### Theming

Theming is handled automatically by `PersesProvider`. It reads the current PatternFly light/dark mode and maps it to MUI theme overrides and ECharts chart colors.

### Component reference

| Component | Description |
|-----------|-------------|
| `PersesProvider` | Wraps all Perses context. All other components must render inside it. |
| `PersesDashboard` | Renders the panel grid from the dashboard definition. |
| `PersesVariables` | Renders variable selector controls. |
| `PersesTimeControls` | Renders the time range picker and refresh controls. |
| `usePersesDashboard` | Hook to fetch a dashboard by project and name. |

`PersesProvider` props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dashboardResource` | `DashboardResource` | required | The dashboard definition to render |
| `defaultDuration` | `string` | `'30m'` | Initial time range duration |
| `defaultRefreshInterval` | `string` | `'60s'` | Initial refresh interval |
| `syncToUrl` | `boolean` | `false` | Sync time range and variables to URL query params |

### Webpack and Module Federation changes

When embedding Perses in a federated package, additional webpack configuration is required. The Perses libraries and their transitive dependencies (MUI, ECharts, React Query, `use-query-params`) must be shared as singletons to avoid duplicate React contexts and CSS conflicts.

> **Note:** These workarounds are likely necessary due to issues with how Module Federation resolves deep transitive dependencies across package boundaries. This is being actively investigated and may be simplified in the future.

#### Module Federation shared config

Add `@odh-dashboard/observability` and its peer dependencies to the `shared` section of your package's `moduleFederation.js`:

```js
// packages/<your-package>/frontend/config/moduleFederation.js
shared: {
  // ...existing shared deps (react, react-dom, react-router, @patternfly/react-core, etc.)...
  '@odh-dashboard/observability': {
    singleton: true,
    requiredVersion: '*',
    import: false,
  },
}
```

#### CSS loader includes

The observability package ships CSS from Perses component libraries. Your webpack CSS rules must include the observability package path so its styles are processed correctly.

In both `webpack.dev.js` and `webpack.prod.js`, add the observability path to the CSS rule's `include` array:

```js
// webpack.dev.js
{
  test: /\.css$/,
  include: [
    SRC_DIR,
    COMMON_DIR,
    path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly'),
    path.resolve(ROOT_NODE_MODULES, '@patternfly'),
    path.resolve(ROOT_NODE_MODULES, '@fontsource'),
    path.resolve(ROOT_NODE_MODULES, '@odh-dashboard/observability'),  // required for Perses
  ],
  use: ['style-loader', 'css-loader'],
}
```

```js
// webpack.prod.js
{
  test: /\.css$/,
  include: [
    SRC_DIR,
    COMMON_DIR,
    path.resolve(RELATIVE_DIRNAME, 'node_modules/@patternfly'),
    path.resolve(ROOT_NODE_MODULES, '@patternfly'),
    path.resolve(ROOT_NODE_MODULES, '@fontsource'),
    path.resolve(ROOT_NODE_MODULES, '@odh-dashboard/observability'),  // required for Perses
  ],
  use: [MiniCssExtractPlugin.loader, 'css-loader'],
}
```

Where `ROOT_NODE_MODULES` is `path.resolve(RELATIVE_DIRNAME, '../../../node_modules')` (the monorepo root `node_modules`).

#### Proxy

The embeddable API fetches data via the `/perses/api` proxy path. This proxy is registered by the observability package's module-federation config and is available to all federated packages automatically. No additional proxy configuration is needed in consuming packages.

## Related Resources

- [Perses Documentation](https://perses.dev/perses/docs/overview/)
- [Perses Dashboard Spec](https://perses.dev/perses/docs/api/dashboard/)
