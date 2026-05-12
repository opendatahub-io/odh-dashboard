# Observability Setup

This guide covers setting up the Perses observability dashboards for development, both on a RHOAI/ODH cluster and for local `start:dev:ext` development.

> **Namespace note:** This guide uses `redhat-ods-applications` (RHOAI). Replace with `opendatahub` if running Open Data Hub, and use manifests from `manifests/observability/odh/` instead of `manifests/observability/rhoai/`.

## Prerequisites

- OpenShift cluster with `oc` CLI configured and logged in
- Red Hat OpenShift AI or Open Data Hub installed

## 1. Install Required Operators

Three operators are required. The **Cluster Observability Operator** may already be installed; the other two likely are not.

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

### Tempo Operator

```bash
oc create namespace openshift-tempo-operator --dry-run=client -o yaml | oc apply -f -
oc apply -f - <<EOF
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: openshift-tempo-operator
  namespace: openshift-tempo-operator
spec:
  upgradeStrategy: Default
---
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: tempo-product
  namespace: openshift-tempo-operator
spec:
  channel: stable
  installPlanApproval: Automatic
  name: tempo-product
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

Verify all three are installed:

```bash
oc get csv -n openshift-operators | grep observability
oc get csv -n openshift-tempo-operator | grep tempo
oc get csv -n openshift-opentelemetry-operator | grep telemetry
```

All should show `Succeeded`.

## 2. Enable the Observability Stack in DSCI

Patch the `DataScienceClusterInitialization` to enable monitoring with metrics, alerting, and tracing:

```bash
oc patch dsci default-dsci --type='merge' -p '{
  "spec": {
    "monitoring": {
      "managementState": "Managed",
      "namespace": "redhat-ods-monitoring",
      "alerting": {},
      "metrics": {
        "replicas": 1,
        "storage": {
          "size": "5Gi",
          "retention": "90d"
        },
        "exporters": {}
      },
      "traces": {
        "sampleRatio": "0.1",
        "storage": {
          "backend": "pv",
          "retention": "2160h"
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
tempo-data-science-tempomonolithic-*           3/3  Running
thanos-querier-data-science-thanos-querier-*   1/1  Running
```

> **Tip:** If the Tempo pod stays `Pending` with `Insufficient cpu`, you may need to free CPU by scaling down idle workloads (e.g. test notebooks).

## 3. Apply Dashboard Resources

Apply the PersesDashboard CRDs so the observability page has dashboards to display. Use the RHOAI or ODH manifests depending on your installation:

```bash
# RHOAI
oc apply -n redhat-ods-applications -f manifests/observability/rhoai/perses-dashboard-cluster.yaml
oc apply -n redhat-ods-applications -f manifests/observability/rhoai/perses-dashboard-model.yaml

# ODH
# oc apply -n opendatahub -f manifests/observability/odh/perses-dashboard-cluster.yaml
# oc apply -n opendatahub -f manifests/observability/odh/perses-dashboard-model.yaml
```

If running on a cluster without the managed monitoring stack, also apply the datasource:

```bash
oc apply -n redhat-ods-applications -f packages/observability/setup/prometheus-data-source.yaml
```

## 4. Enable the Feature Flag

The observability nav item is hidden by default behind the `observabilityDashboard` feature flag:

```bash
oc patch odhdashboardconfig odh-dashboard-config \
  -n redhat-ods-applications \
  --type='merge' \
  -p '{"spec":{"dashboardConfig":{"observabilityDashboard":true}}}'
```

## 5. (If needed) Network Policy

If data isn't loading in the dashboards, create a network policy to allow the Perses operator to reach the Perses pods:

```bash
oc apply -n redhat-ods-applications -f packages/observability/setup/network-policy-perses-operator-access.yaml
```

## 6. (Optional) Install UI Plugin

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

## Local Development with `start:dev:ext`

When running `npm run start:dev:ext`, the dashboard runs locally but proxies API calls to the cluster. The Perses proxy (`/perses/api`) requires special handling because the operator-managed `federation-config` ConfigMap does not include a perses entry, so the cluster dashboard backend cannot proxy Perses requests.

The dev server handles this automatically:

1. **Auto port-forward** -- At startup, `webpack.dev.js` checks whether `proxyService` entries with a `localService` config have their corresponding service deployed on the cluster. If so, it spawns `oc port-forward` as a child process. For observability, this forwards `svc/perses` in `openshift-cluster-observability-operator` to `localhost:9005`. The port-forward is cleaned up when the dev server exits.

2. **Local proxy routing** -- The webpack dev proxy creates a dedicated route for `/perses/api` targeting `https://localhost:9005` (with the prefix stripped), bypassing the cluster gateway entirely.

If the Perses service is not deployed on the cluster, both steps are skipped silently and the dev server starts normally.

### Verify

After starting the dev server:

```bash
curl -s http://localhost:4010/perses/api/api/v1/dashboards | head -c 100
# Should return JSON array of dashboards (not HTML)
```
