# Observability Setup

This directory contains Kubernetes resources for setting up the Perses observability dashboards for development.

## Prerequisites

- OpenShift cluster with `oc` CLI configured
- Access to the `opendatahub` namespace

## 1. Install Cluster Observability Operator

First, install the Cluster Observability Operator from OperatorHub:

1. In the OpenShift Console, navigate to **Operators → OperatorHub**
2. Search for "Cluster Observability Operator"
3. Click **Install** and follow the prompts

Or install via CLI:

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

## 2. (Optional) Install UI Plugin

Optionally install the Monitoring UI Plugin to enable Perses dashboards in the OpenShift Console:

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

## 3. Configure Monitoring (Cluster with Observability Stack)

If running against a cluster with the observability stack, ensure that monitoring is enabled in the DSCInitialization with the following spec update:

```yaml
  monitoring:
    managementState: Managed
    metrics:
      storage:
        retention: 90d
        size: 5Gi
    namespace: opendatahub
    traces:
      sampleRatio: '0.1'
      storage:
        backend: pv
        retention: 2160h0m0s
      tls:
        enabled: true
```

## 4. Apply Dashboard Resources

Apply the dashboard resources to your cluster:

```bash
oc apply -n opendatahub -f packages/observability/setup/perses-dashboard-cluster.yaml
oc apply -n opendatahub -f packages/observability/setup/perses-dashboard-model.yaml
```

**Note:** If running on a cluster that doesn't support the monitoring stack, you also need to apply the data source:

```bash
oc apply -n opendatahub -f packages/observability/setup/prometheus-data-source.yaml
```

## 5. (Cluster with Monitoring) Network Policy for Dashboard Data

If running on a cluster with monitoring enabled and data isn't loading in the dashboards, you may need to create a network policy in the application namespace to allow the Perses operator to access the dashboards:

```bash
oc apply -n opendatahub -f packages/observability/setup/network-policy-perses-operator-access.yaml
```

## 6. (Cluster with Monitoring) Update Federation Config for Perses Proxy

When the monitoring component is available, you need to update the `federation-config` ConfigMap to set up the proxy to the running Perses instance.

Add the following entry to the JSON array in the ConfigMap:

```json
{
  "name": "perses",
  "proxyService": [
    {
      "authorize": true,
      "path": "/perses/api",
      "pathRewrite": "",
      "tls": false,
      "service": {
        "name": "data-science-perses",
        "namespace": "opendatahub",
        "port": 8080
      }
    }
  ]
}
```
