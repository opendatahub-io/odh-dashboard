# Observability Dashboards

This document describes how to add new Perses dashboards to the ODH Dashboard UI.

## Overview

The ODH Dashboard uses [Perses](https://perses.dev/) dashboards for observability features. Dashboards are defined as Kubernetes `PersesDashboard` custom resources and are loaded dynamically by the UI.

## Creating a New Dashboard

### Resource Location

Dashboard resources **must** be created in the product namespace (e.g., `opendatahub`).

The UI fetches dashboards via the Perses API provided by the Perses service and automatically loads them.

### File Location

Dashboard manifest files should be placed in:

```
manifests/observability/
```

### Naming Convention

#### Resource Name

Dashboard resource names **must** follow this pattern:

```
dashboard-{order}-{name}[-admin]
```

> **Important:** The `dashboard-` prefix is required. Resources without this prefix will not be loaded by the UI.

| Component | Required | Description | Examples |
|-----------|----------|-------------|----------|
| `order` | Yes | Lexicographic ordering for tab display (sorted alphabetically) | `0`, `1`, `12` |
| `name` | Yes | The dashboard name | `cluster`, `model` |
| `-admin` | **No** | *Optional* suffix to restrict visibility to admin users only | `-admin` |

**Examples:**
- `dashboard-0-cluster-admin` - First tab, cluster dashboard (admin only)
- `dashboard-1-model` - Second tab, model dashboard (all users)

#### Display Name

The `spec.display.name` field in the dashboard definition is used to label the tab in the UI:

```yaml
spec:
  display:
    name: My Dashboard  # This text appears on the tab
```

## Namespace Variable

The ODH Dashboard has **custom handling for the `namespace` variable**. When a dashboard is loaded within ODH, the UI automatically supplies a filtered set of namespaces based on the user's project access permissions.

### How It Works

1. **Within ODH**: The UI transforms the `namespace` variable to use a static list of project names that the user has access to. This provides proper RBAC filtering and consistency with the rest of the UI where project selection is available.

2. **Outside ODH (fallback)**: The Prometheus query defined in the variable is executed to populate the namespace options. This allows the dashboard to work standalone in environments like the Perses UI.

### Adding Namespace Filter Support

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
| `name` | `namespace` | **Required** - The UI looks for this exact name |
| `display.name` | `Project` | User-friendly label |
| `allowMultiple` | `true` | Enables multi-select |
| `allowAllValue` | `true` | Enables "All" option |
| `customAllValue` | `".*"` | Regex pattern for "All" in PromQL queries |
| `defaultValue` | `"$__all"` | Default to all namespaces |
| `matchers` | Your metric | Prometheus query used as fallback |

### Matcher Query

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

## Related Resources

- [Perses Documentation](https://perses.dev/docs/)
- [Perses Dashboard Spec](https://perses.dev/docs/api/dashboard/)
