# Prometheus Mock Data Generator

Scripts to generate and import mock Prometheus metrics data for testing Perses observability dashboards.

Based on [prometheus-mock-data.sh](https://github.com/RedHatInsights/rhsm-subscriptions/blob/721d8d3c4cba464fc6cbd8a0c870d2a659cc6259/bin/prometheus-mock-data.sh) and [Prometheus storage documentation](https://prometheus.io/docs/prometheus/latest/storage/#usage).

## Quick Start

```bash
# 1. Generate mock data (24 hours of data by default)
./generate-mock-data.sh

# 2. Import to Prometheus (auto-detects OpenShift configuration)
./import-mock-data.sh
```

## Prerequisites

- `bash` (version 4.0+)
- `oc` CLI (for OpenShift integration)
- `promtool` (for importing data) - [Download](https://prometheus.io/download/)

### Installing promtool

```bash
# Option 1: Download binary
wget https://github.com/prometheus/prometheus/releases/download/v2.53.0/prometheus-2.53.0.darwin-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
sudo cp prometheus-*/promtool /usr/local/bin/

# Option 2: Using Go
go install github.com/prometheus/prometheus/cmd/promtool@latest
```

## Scripts

### generate-mock-data.sh

Generates mock Prometheus metrics in OpenMetrics format for all dashboard queries.

```bash
./generate-mock-data.sh [OPTIONS]

Options:
  -o FILE    Output file (default: mock-metrics.txt)
  -d HOURS   Duration in hours to generate data for (default: 24)
  -i SECONDS Interval between data points in seconds (default: 60)
  -f FORMAT  Output format: openmetrics or prometheus (default: openmetrics)
```

**Runtime Estimates:**

The script displays a progress bar with ETA. Approximate runtimes:

| Duration | Interval | Data Points | Approx. Time | File Size |
|----------|----------|-------------|--------------|-----------|
| 1 hour   | 60s      | 61          | ~20 seconds  | ~1.2 MB   |
| 6 hours  | 60s      | 361         | ~2 minutes   | ~7 MB     |
| 24 hours | 60s      | 1,441       | ~8 minutes   | ~28 MB    |
| 24 hours | 300s     | 289         | ~2 minutes   | ~6 MB     |
| 7 days   | 300s     | 2,017       | ~11 minutes  | ~40 MB    |

**Examples:**

```bash
# Generate 24 hours of data (default) - takes ~8 minutes
./generate-mock-data.sh

# Faster: 24 hours with 5-minute intervals - takes ~2 minutes
./generate-mock-data.sh -i 300

# Generate 7 days of data with 5-minute intervals
./generate-mock-data.sh -d 168 -i 300

# Quick test: 1 hour of data
./generate-mock-data.sh -d 1

# Generate data to a specific file
./generate-mock-data.sh -o my-metrics.txt
```

### import-mock-data.sh

Imports generated mock data into Prometheus.

```bash
./import-mock-data.sh [OPTIONS]

Options:
  -f FILE         Input file with metrics data (default: mock-metrics.txt)
  -m METHOD       Import method: remote-write or tsdb-blocks (default: remote-write)
  -u URL          Prometheus URL (default: auto-detect from OpenShift)
  -t TOKEN        Bearer token for authentication (default: auto-detect from OpenShift)
  -n NAMESPACE    Prometheus namespace (default: openshift-user-workload-monitoring)
  -s SERVICE      Prometheus service name (default: prometheus-user-workload)
  -p PORT         Prometheus port (default: 9090)
  --thanos        Target Thanos instead of Prometheus
  --dry-run       Show what would be done without executing
```

**Examples:**

```bash
# Auto-detect OpenShift configuration and import
./import-mock-data.sh

# Use TSDB blocks method (for historical data)
./import-mock-data.sh -m tsdb-blocks

# Specify URL and token manually
./import-mock-data.sh -u https://prometheus.example.com -t $TOKEN

# Dry run to see what would happen
./import-mock-data.sh --dry-run
```

## Import Methods

### 1. Remote Write (Default)

Pushes metrics directly to Prometheus via the Remote Write API (`/api/v1/write`).

**Requirements:**
- Prometheus must have remote write receiver enabled (`--web.enable-remote-write-receiver`)
- For historical data, requires `out_of_order_time_window` configuration

**Pros:**
- Fast and direct
- Works with remote Prometheus instances

**Cons:**
- Limited historical data support without configuration changes

### 2. TSDB Blocks

Creates TSDB blocks from OpenMetrics data and copies them to the Prometheus data directory.

**Requirements:**
- `promtool` command
- Access to Prometheus data directory (via `oc cp` for OpenShift)

**Pros:**
- Supports arbitrary historical timestamps
- No Prometheus configuration changes needed

**Cons:**
- Slower for large datasets
- Requires pod access in OpenShift

## Generated Metrics

The generator creates data for all metrics used in the Perses dashboards:

### Cluster Dashboard Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `kube_node_status_condition` | gauge | condition, status, node | Node health status |
| `kube_node_status_allocatable` | gauge | resource, node | Allocatable resources |
| `container_memory_working_set_bytes` | gauge | namespace, container, image | Memory usage |
| `node_memory_MemTotal_bytes` | gauge | node | Total node memory |
| `node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate` | gauge | namespace | CPU usage rate |
| `container_network_receive_bytes_total` | counter | namespace | Network bytes received |
| `DCGM_FI_DEV_GPU_UTIL` | gauge | namespace, gpu | GPU utilization (0-100) |
| `accelerator_gpu_utilization` | gauge | gpu | GPU utilization (0-1) |
| `inference_model_request_total` | counter | model | Total inference requests |
| `inference_model_request_error_total` | counter | model | Failed inference requests |

### Model Dashboard Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `vllm:num_requests_waiting` | gauge | model_name, namespace | Queue length |
| `kube_deployment_status_replicas_available` | gauge | deployment, namespace | Available replicas |
| `vllm:e2e_request_latency_seconds_bucket` | histogram | model_name, namespace, le | E2E latency |
| `vllm:time_to_first_token_seconds_bucket` | histogram | model_name, namespace, le | TTFT latency |
| `vllm:generation_tokens_total` | counter | model_name, namespace | Tokens generated |
| `vllm:request_success_total` | counter | model_name, namespace | Successful requests |

## Sample Data Characteristics

The generated data simulates realistic patterns:

- **4 nodes**: node-1 through node-4
- **4 namespaces**: ai-research, ml-production, kontext-pte, data-science
- **4 models**: llama-3-8b, mistral-7b, gpt-neo-2.7b, falcon-7b
- **Daily load patterns**: Higher utilization during business hours (8-18)
- **Realistic error rates**: ~1% error rate for inference requests
- **Histogram distributions**: Exponential-like latency distributions

## Troubleshooting

### "promtool not found"

Install promtool from [Prometheus downloads](https://prometheus.io/download/) or via Go:

```bash
go install github.com/prometheus/prometheus/cmd/promtool@latest
```

### "Remote write failed"

Ensure Prometheus has remote write receiver enabled. For OpenShift, you may need to configure the Prometheus operator:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-monitoring-config
  namespace: openshift-monitoring
data:
  config.yaml: |
    prometheusK8s:
      remoteWrite:
        - url: "http://localhost:9090/api/v1/write"
```

### "Port-forward failed"

Ensure you're logged into OpenShift and have access to the monitoring namespace:

```bash
oc login
oc project openshift-user-workload-monitoring
```

### Data not appearing in dashboards

1. Wait a few minutes for Prometheus to load new data
2. Check the time range in your dashboard matches the generated data
3. Verify the namespace filter matches the generated namespaces

## References

- [Prometheus Storage Documentation](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus Remote Write](https://prometheus.io/docs/prometheus/latest/querying/remote_read_api/)
- [Original mock data script](https://github.com/RedHatInsights/rhsm-subscriptions/blob/721d8d3c4cba464fc6cbd8a0c870d2a659cc6259/bin/prometheus-mock-data.sh)
