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
    acm:
      enabled: true
      alertmanager:
        url: 'https://alertmanager.open-cluster-management-observability.svc:9095'
      thanosQuerier:
        url: 'https://rbac-query-proxy.open-cluster-management-observability.svc:8443'
    perses:
      enabled: true
    incidents:
      enabled: true
EOF
```

## 3. Apply Dashboard Resources

Apply all resources to your cluster:

```bash
oc apply -n opendatahub -f packages/observability/setup/
```

## Files

| File | Kind | Description |
|------|------|-------------|
| `prometheus-data-source.yaml` | PersesDatasource | Configures Thanos Querier as the Prometheus datasource |
| `perses-dashboard-cluster.yaml` | PersesDashboard | Cluster-wide metrics dashboard (GPU, CPU, Memory, Network) |
| `perses-dashboard-model.yaml` | PersesDashboard | Model performance metrics dashboard (latency, throughput, TTFT) |
