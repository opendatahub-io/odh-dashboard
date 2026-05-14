# Observability Setup

This guide covers setting up the Perses observability dashboards for development, both on a RHOAI/ODH cluster and for local development (`start:dev` and `start:dev:ext`).

> **Namespace note:** This guide uses `redhat-ods-applications` (RHOAI). Replace with `opendatahub` if running Open Data Hub, and use manifests from `manifests/observability/odh/` instead of `manifests/observability/rhoai/`.

## Prerequisites

- OpenShift cluster with `oc` CLI configured and logged in
- Red Hat OpenShift AI or Open Data Hub installed

## 1. Install Required Operators

Two operators are required. The **Cluster Observability Operator** may already be installed; the other one likely is not.

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

### Red Hat build of OpenTelemetry

```bash
oc create namespace openshift-opentelemetry-operator --dry-run=client -o yaml | oc apply -f -
oc apply -f - <<EOF
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: openshift-opentelemetry-operator
  namespace: openshift-opentelemetry-operator
spec:
  upgradeStrategy: Default
---
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: opentelemetry-product
  namespace: openshift-opentelemetry-operator
spec:
  channel: stable
  installPlanApproval: Automatic
  name: opentelemetry-product
  source: redhat-operators
  sourceNamespace: openshift-marketplace
EOF
```

Verify both are installed:

```bash
oc get csv -n openshift-operators | grep observability
oc get csv -n openshift-opentelemetry-operator | grep telemetry
```

All should show `Succeeded`.

## 2. Enable the Observability Stack in DSCI

Patch the `DataScienceClusterInitialization` to enable monitoring with metrics and alerting:

```yaml
# DSCI monitoring spec (for reference / console YAML editor):
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

Apply via CLI:

```bash
oc patch dsci default-dsci --type='merge' -p '{
  "spec": {
    "monitoring": {
      "managementState": "Managed",
      "alerting": {},
      "metrics": {
        "replicas": 1,
        "storage": {
          "size": "5Gi",
          "retention": "90d"
        },
        "exporters": {}
      }
    }
  }
}'
```

Wait for the observability stack pods to come up:

```bash
oc get pods -n redhat-ods-monitoring -w
```

Expected pods (all Running):

```text
alertmanager-data-science-monitoringstack-*    2/2  Running
data-science-collector-collector-*             1/1  Running
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

## 4. (Optional) Install UI Plugin

To also enable Perses dashboards in the OpenShift Console (not the RHOAI dashboard):

```bash
oc apply -f - <<EOF
apiVersion: observability.openshift.io/v1alpha1
kind: UIPlugin
metadata:
  name: monitoring
spec:
  type: Monitoring
  monitoring:
    perses:
      enabled: true
EOF
```

---

## Local Development

Both `start:dev` and `start:dev:ext` automatically handle Perses API proxying without requiring a manual `oc port-forward` in a separate terminal. The Perses proxy (`/perses/api`) requires special handling because the operator-managed `federation-config` ConfigMap does not include a perses entry, so the cluster dashboard backend cannot proxy Perses requests on its own.

### `start:dev` (frontend + backend)

When running `npm run start:dev`, the backend (Fastify) auto-spawns `oc port-forward` for any `proxyService` entries with a `localService` config whose cluster service actually exists. For observability, this forwards `svc/perses` in `openshift-cluster-observability-operator` to `localhost:9005`. The backend then proxies `/perses/api` requests to `localhost:9005`. Port-forwards auto-restart on connection drops and are cleaned up when the backend exits.

### `start:dev:ext` (frontend only, external cluster)

When running `npm run start:dev:ext`, the webpack dev server handles port-forwarding directly:

1. **Auto port-forward** -- At startup, `webpack.dev.js` checks whether `proxyService` entries with a `localService` config have their corresponding service deployed on the cluster. If so, it spawns `oc port-forward` as a child process, forwarding `svc/perses` to `localhost:9005`.

2. **Local proxy routing** -- The webpack dev proxy creates a dedicated route for `/perses/api` targeting `https://localhost:9005` (with the prefix stripped), bypassing the cluster gateway entirely.

If the Perses service is not deployed on the cluster, port-forwarding is skipped silently and the dev server starts normally.

### Verify

After starting the dev server:

```bash
curl -s http://localhost:4010/perses/api/api/v1/dashboards | head -c 100
# Should return JSON array of dashboards (not HTML)
```
