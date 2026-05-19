# Observability Setup

This guide covers setting up the Perses observability dashboards for development, both on a RHOAI/ODH cluster and for local development (`start:dev` and `start:dev:ext`).

> **Namespace note:** This guide uses `redhat-ods-applications` (RHOAI). Replace with `opendatahub` if running Open Data Hub, and use manifests from `manifests/observability/odh/` instead of `manifests/observability/rhoai/`.

## Prerequisites

- OpenShift cluster with `oc` CLI configured and logged in
- Red Hat OpenShift AI or Open Data Hub installed

## 1. Install Required Operators

The **Cluster Observability Operator** is required and may already be installed.

### Cluster Observability Operator

```bash
oc apply -f - <<EOF
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: cluster-observability-operator
  namespace: openshift-operators
spec:
  channel: stable
  name: cluster-observability-operator
  source: redhat-operators
  sourceNamespace: openshift-marketplace
EOF
```

Verify it is installed:

```bash
oc get csv -n openshift-operators | grep observability
```

It should show `Succeeded`.

## 2. Enable the Observability Stack in DSCI

Patch the `DataScienceClusterInitialization` to enable monitoring with metrics and alerting. Apply via the OpenShift Console YAML editor or `oc edit dsci default-dsci`:

```yaml
spec:
  monitoring:
    managementState: Managed
    alerting: {}
    metrics:
      replicas: 1
      storage:
        size: 5Gi
        retention: 90d
      exporters: {}
```

Wait for the observability stack pods to come up:

```bash
oc get pods -n redhat-ods-monitoring -w
```

Expected pods (all Running):

```text
alertmanager-data-science-monitoringstack-*    2/2  Running
prometheus-data-science-monitoringstack-*      3/3  Running
thanos-querier-data-science-thanos-querier-*   1/1  Running
```

## 3. Enable the Feature Flag

The observability nav item is hidden by default behind the `observabilityDashboard` feature flag:

```bash
oc patch odhdashboardconfig odh-dashboard-config \
  -n redhat-ods-applications \
  --type='merge' \
  -p '{"spec":{"dashboardConfig":{"observabilityDashboard":true}}}'
```

---

## Local Development

Both `start:dev` and `start:dev:ext` automatically handle Perses API proxying without requiring a manual `oc port-forward` in a separate terminal. The Perses proxy (`/perses/api`) requires special handling because the operator-managed `federation-config` ConfigMap does not include a perses entry, so the cluster dashboard backend cannot proxy Perses requests on its own.

### `start:dev` (frontend + backend)

When running `npm run start:dev`, the backend (Fastify) auto-spawns `oc port-forward` for any `proxyService` entries with a `localService` config whose cluster service actually exists. For observability, this forwards `svc/data-science-perses` to `localhost:9005`. The backend then proxies `/perses/api` requests to `localhost:9005`. Port-forwards auto-restart on connection drops and are cleaned up when the backend exits.

### `start:dev:ext` (frontend only, external cluster)

When running `npm run start:dev:ext`, the webpack dev server handles port-forwarding directly:

1. **Auto port-forward** -- At startup, `webpack.dev.js` checks whether `proxyService` entries with a `localService` config have their corresponding service deployed on the cluster. If so, it spawns `oc port-forward` as a child process, forwarding `svc/data-science-perses` to `localhost:9005`.

2. **Local proxy routing** -- The webpack dev proxy creates a dedicated route for `/perses/api` targeting `https://localhost:9005` (with the prefix stripped), bypassing the cluster gateway entirely.

If the Perses service is not deployed on the cluster, port-forwarding is skipped silently and the dev server starts normally.
