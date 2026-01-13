#!/bin/bash
#
# Generate mock Prometheus metrics data in OpenMetrics format for testing Perses dashboards
# Based on: https://github.com/RedHatInsights/rhsm-subscriptions/blob/721d8d3c4cba464fc6cbd8a0c870d2a659cc6259/bin/prometheus-mock-data.sh
#
# Usage: ./generate-mock-data.sh [OPTIONS]
#   -o FILE    Output file (default: mock-metrics.txt)
#   -d HOURS   Duration in hours to generate data for (default: 24)
#   -i SECONDS Interval between data points in seconds (default: 60)
#   -f FORMAT  Output format: openmetrics or prometheus (default: openmetrics)
#

set -e

# Default configuration
OUTPUT_FILE="mock-metrics.txt"
DURATION_HOURS=24
INTERVAL_SECONDS=60
FORMAT="openmetrics"

# Parse arguments
while getopts "o:d:i:f:h" opt; do
    case $opt in
        o) OUTPUT_FILE="$OPTARG" ;;
        d) DURATION_HOURS="$OPTARG" ;;
        i) INTERVAL_SECONDS="$OPTARG" ;;
        f) FORMAT="$OPTARG" ;;
        h)
            echo "Usage: $0 [OPTIONS]"
            echo "  -o FILE    Output file (default: mock-metrics.txt)"
            echo "  -d HOURS   Duration in hours (default: 24)"
            echo "  -i SECONDS Interval between data points (default: 60)"
            echo "  -f FORMAT  Output format: openmetrics or prometheus (default: openmetrics)"
            exit 0
            ;;
        \?) echo "Invalid option: -$OPTARG" >&2; exit 1 ;;
    esac
done

# Configuration
NODES=("node-1" "node-2" "node-3" "node-4")
NAMESPACES=("ai-research" "ml-production" "kontext-pte" "data-science")
MODELS=("llama-3-8b" "mistral-7b" "gpt-neo-2.7b" "falcon-7b")
DEPLOYMENTS=("llama-deployment" "mistral-deployment" "gpt-neo-deployment" "falcon-deployment")
# Pod names for each model (predictor pods used by KServe)
PODS=("llama-3-8b-predictor-00001-abc12" "mistral-7b-predictor-00001-def34" "gpt-neo-2.7b-predictor-00001-ghi56" "falcon-7b-predictor-00001-jkl78")
GPUS=("gpu-0" "gpu-1" "gpu-2" "gpu-3")

# Histogram bucket boundaries for latency metrics (in seconds)
LATENCY_BUCKETS=(0.005 0.01 0.025 0.05 0.1 0.25 0.5 1 2.5 5 10)
TTFT_BUCKETS=(0.001 0.005 0.01 0.025 0.05 0.1 0.25 0.5 1 2.5)
OUTPUT_TOKENS_BUCKETS=(10 50 100 250 500 1000 2000 4000)

# Hardware profiles for model deployments
HARDWARE_PROFILES=("NVIDIA A100 40GB" "NVIDIA A100 80GB" "NVIDIA V100 32GB" "NVIDIA T4 16GB")
RUNTIMES=("vLLM" "KServe" "Triton")

# Calculate time range (use awk for floating point support)
END_TIME=$(date +%s)
DURATION_SECONDS=$(awk "BEGIN {printf \"%d\", $DURATION_HOURS * 3600}")
START_TIME=$((END_TIME - DURATION_SECONDS))
STEP=$INTERVAL_SECONDS

# Calculate total data points for progress tracking
TOTAL_POINTS=$(awk "BEGIN {printf \"%d\", ($DURATION_SECONDS / $INTERVAL_SECONDS) + 1}")

# Cross-platform date formatting (works on macOS and Linux)
format_date() {
    local ts=$1
    if date -r "$ts" "+%Y-%m-%d %H:%M:%S" 2>/dev/null; then
        return
    fi
    # Linux fallback
    date -d "@$ts" "+%Y-%m-%d %H:%M:%S" 2>/dev/null || echo "$ts"
}

echo "Generating mock data from $(format_date $START_TIME) to $(format_date $END_TIME)"
echo "Output format: $FORMAT"
echo "Output file: $OUTPUT_FILE"
echo "Total data points to generate: $TOTAL_POINTS"
echo ""
echo "Estimated time: ~$((TOTAL_POINTS / 3)) seconds ($((TOTAL_POINTS / 180)) minutes)"
echo ""

# Progress bar function
show_progress() {
    local current=$1
    local total=$2
    local start_ts=$3
    local width=50

    # Calculate percentage (protect against division by zero)
    local percent=0
    if [[ $total -gt 0 ]]; then
        percent=$((current * 100 / total))
    fi

    # Calculate filled/empty parts of bar
    local filled=$((percent * width / 100))
    local empty=$((width - filled))

    # Calculate ETA
    local elapsed=$(($(date +%s) - start_ts))
    if [[ $current -gt 0 && $elapsed -gt 0 && $total -gt 0 ]]; then
        local rate=$(awk "BEGIN {printf \"%.2f\", $current / $elapsed}")
        if awk "BEGIN {exit !($rate > 0)}"; then
            local remaining=$(awk "BEGIN {printf \"%.0f\", ($total - $current) / $rate}")
            local eta_min=$((remaining / 60))
            local eta_sec=$((remaining % 60))
            local eta_str="${eta_min}m ${eta_sec}s"
        else
            local eta_str="calculating..."
        fi
    else
        local eta_str="calculating..."
    fi

    # Build progress bar
    local bar=""
    for ((i=0; i<filled; i++)); do bar+="█"; done
    for ((i=0; i<empty; i++)); do bar+="░"; done

    # Print progress bar (overwrite same line)
    printf "\r[%s] %3d%% (%d/%d) ETA: %s    " "$bar" "$percent" "$current" "$total" "$eta_str"
}

# Helper function to generate a value with some variance
generate_value() {
    local base=$1
    local variance=$2
    local random_factor=$(awk "BEGIN {srand(); print rand() * 2 - 1}")
    awk "BEGIN {printf \"%.6f\", $base + ($variance * $random_factor)}"
}

# Helper function for floating point comparison (returns 0 if a < b, 1 otherwise)
# Usage: if float_lt 0.5 1.0; then echo "0.5 < 1.0"; fi
float_lt() {
    awk "BEGIN {exit !($1 < $2)}"
}

# Helper function to generate monotonically increasing counter value
generate_counter() {
    local base_rate=$1  # rate per second
    local elapsed=$2    # seconds since start
    local variance=$3   # variance factor
    local noise=$(awk "BEGIN {srand(); print rand() * $variance}")
    awk "BEGIN {printf \"%.0f\", ($base_rate * $elapsed) + $noise}"
}

# Format timestamp based on output format
format_timestamp() {
    local ts=$1
    if [[ "$FORMAT" == "openmetrics" ]]; then
        # OpenMetrics uses seconds with optional decimal (epoch seconds)
        echo "$ts.000"
    else
        # Prometheus remote write uses milliseconds
        echo "${ts}000"
    fi
}

# Initialize output file with metric help and type declarations
cat > "$OUTPUT_FILE" << 'EOF'
# HELP kube_node_status_condition The condition of a cluster node
# TYPE kube_node_status_condition gauge
# HELP kube_node_status_allocatable The allocatable resources of a node
# TYPE kube_node_status_allocatable gauge
# HELP kube_deployment_status_replicas_available The number of available replicas per deployment
# TYPE kube_deployment_status_replicas_available gauge
# HELP container_memory_working_set_bytes Current working set memory in bytes
# TYPE container_memory_working_set_bytes gauge
# HELP node_memory_MemTotal_bytes Total memory in bytes
# TYPE node_memory_MemTotal_bytes gauge
# HELP node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate CPU usage rate
# TYPE node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate gauge
# HELP container_network_receive_bytes_total Cumulative count of bytes received
# TYPE container_network_receive_bytes_total counter
# HELP DCGM_FI_DEV_GPU_UTIL GPU utilization percentage (0-100)
# TYPE DCGM_FI_DEV_GPU_UTIL gauge
# HELP DCGM_FI_DEV_FB_USED GPU framebuffer memory used in MiB
# TYPE DCGM_FI_DEV_FB_USED gauge
# HELP DCGM_FI_DEV_FB_FREE GPU framebuffer memory free in MiB
# TYPE DCGM_FI_DEV_FB_FREE gauge
# HELP accelerator_gpu_utilization GPU accelerator utilization (0-1)
# TYPE accelerator_gpu_utilization gauge
# HELP inference_model_request_total Total number of inference requests
# TYPE inference_model_request_total counter
# HELP inference_model_request_error_total Total number of failed inference requests
# TYPE inference_model_request_error_total counter
# HELP inference_pool_average_queue_size Average queue size per inference pool
# TYPE inference_pool_average_queue_size gauge
# HELP inference_pool_ready_pods Number of ready pods per inference pool
# TYPE inference_pool_ready_pods gauge
# HELP inference_model_request_duration_seconds Inference request duration histogram
# TYPE inference_model_request_duration_seconds histogram
# HELP vllm:num_requests_waiting Number of requests waiting in queue
# TYPE vllm:num_requests_waiting gauge
# HELP vllm:num_requests_running Number of requests currently running
# TYPE vllm:num_requests_running gauge
# HELP vllm:e2e_request_latency_seconds_bucket End to end request latency histogram
# TYPE vllm:e2e_request_latency_seconds_bucket histogram
# HELP vllm:time_to_first_token_seconds_bucket Time to first token histogram
# TYPE vllm:time_to_first_token_seconds_bucket histogram
# HELP vllm:generation_tokens_total Total tokens generated
# TYPE vllm:generation_tokens_total counter
# HELP vllm:request_success_total Total successful requests
# TYPE vllm:request_success_total counter
# HELP vllm:gpu_cache_usage_perc GPU KV cache usage percentage
# TYPE vllm:gpu_cache_usage_perc gauge
# HELP vllm:cpu_cache_usage_perc CPU KV cache usage percentage
# TYPE vllm:cpu_cache_usage_perc gauge
# HELP kserve_vllm:e2e_request_latency_seconds_bucket KServe vLLM end to end request latency histogram
# TYPE kserve_vllm:e2e_request_latency_seconds_bucket histogram
# HELP kserve_vllm:time_to_first_token_seconds_bucket KServe vLLM time to first token histogram
# TYPE kserve_vllm:time_to_first_token_seconds_bucket histogram
# HELP kserve_vllm:generation_tokens_total KServe vLLM total tokens generated
# TYPE kserve_vllm:generation_tokens_total counter
# HELP kserve_inference_model_output_tokens_bucket KServe output tokens histogram
# TYPE kserve_inference_model_output_tokens_bucket histogram
# HELP kube_node_status_capacity Node capacity for resources
# TYPE kube_node_status_capacity gauge
# HELP cluster:node_gpu:sum Total GPUs in cluster
# TYPE cluster:node_gpu:sum gauge
# HELP cluster:node_gpu_allocated:sum Allocated GPUs in cluster
# TYPE cluster:node_gpu_allocated:sum gauge
# HELP kube_pod_labels Kubernetes labels converted to Prometheus labels
# TYPE kube_pod_labels gauge
# HELP kube_pod_container_resource_limits The resource limits set on containers
# TYPE kube_pod_container_resource_limits gauge
EOF

# Generate time series data
CURRENT_TIME=$START_TIME
POINT_COUNT=0
GENERATION_START=$(date +%s)

echo "Generating data points..."
echo ""

while [[ $CURRENT_TIME -le $END_TIME ]]; do
    TS=$(format_timestamp $CURRENT_TIME)
    ELAPSED=$((CURRENT_TIME - START_TIME))

    # Add some time-based variation patterns (simulating daily patterns)
    HOUR_OF_DAY=$(( (CURRENT_TIME % 86400) / 3600 ))
    # Higher load during business hours (8-18)
    if [[ $HOUR_OF_DAY -ge 8 && $HOUR_OF_DAY -le 18 ]]; then
        LOAD_FACTOR=1.5
    else
        LOAD_FACTOR=0.7
    fi

    # ==================== CLUSTER METRICS ====================

    # kube_node_status_condition - Node health (most nodes healthy)
    for node in "${NODES[@]}"; do
        # Ready condition - most nodes are ready
        ready_value=$(( RANDOM % 100 < 95 ? 1 : 0 ))
        echo "kube_node_status_condition{condition=\"Ready\",status=\"true\",node=\"$node\"} $ready_value $TS" >> "$OUTPUT_FILE"
    done

    # kube_node_status_allocatable - CPU cores per node
    for node in "${NODES[@]}"; do
        cpu_cores=$(( 16 + RANDOM % 16 ))  # 16-32 cores
        echo "kube_node_status_allocatable{resource=\"cpu\",node=\"$node\"} $cpu_cores $TS" >> "$OUTPUT_FILE"
    done

    # node_memory_MemTotal_bytes - Total memory per node (64-128 GB)
    for node in "${NODES[@]}"; do
        mem_bytes=$(( (64 + RANDOM % 64) * 1024 * 1024 * 1024 ))
        echo "node_memory_MemTotal_bytes{node=\"$node\"} $mem_bytes $TS" >> "$OUTPUT_FILE"
    done

    # container_memory_working_set_bytes - Memory usage per namespace
    for ns in "${NAMESPACES[@]}"; do
        # 2-20 GB per namespace
        mem_used=$(generate_value $(( 5 * 1024 * 1024 * 1024 )) $(( 3 * 1024 * 1024 * 1024 )))
        mem_used=$(awk "BEGIN {printf \"%.0f\", $mem_used * $LOAD_FACTOR}")
        echo "container_memory_working_set_bytes{namespace=\"$ns\",container=\"model-server\",image=\"vllm:latest\"} $mem_used $TS" >> "$OUTPUT_FILE"
    done

    # node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate - CPU usage rate
    for ns in "${NAMESPACES[@]}"; do
        cpu_rate=$(generate_value 2.5 1.5)
        cpu_rate=$(awk "BEGIN {printf \"%.6f\", $cpu_rate * $LOAD_FACTOR}")
        echo "node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{namespace=\"$ns\"} $cpu_rate $TS" >> "$OUTPUT_FILE"
    done

    # container_network_receive_bytes_total - Network counter
    for ns in "${NAMESPACES[@]}"; do
        # ~10 MB/s base rate
        net_bytes=$(generate_counter 10000000 $ELAPSED 1000000)
        net_bytes=$(awk "BEGIN {printf \"%.0f\", $net_bytes * $LOAD_FACTOR}")
        echo "container_network_receive_bytes_total{namespace=\"$ns\"} $net_bytes $TS" >> "$OUTPUT_FILE"
    done

    # DCGM_FI_DEV_GPU_UTIL - GPU utilization (0-100)
    for ns in "${NAMESPACES[@]}"; do
        for gpu in "${GPUS[@]}"; do
            gpu_util=$(generate_value 65 25)
            gpu_util=$(awk "BEGIN {printf \"%.2f\", $gpu_util * $LOAD_FACTOR}")
            # Clamp to 0-100
            gpu_util=$(awk "BEGIN {if ($gpu_util > 100) print 100; else if ($gpu_util < 0) print 0; else print $gpu_util}")
            echo "DCGM_FI_DEV_GPU_UTIL{namespace=\"$ns\",gpu=\"$gpu\"} $gpu_util $TS" >> "$OUTPUT_FILE"
        done
    done

    # DCGM_FI_DEV_FB_USED and DCGM_FI_DEV_FB_FREE - GPU memory (in MiB)
    for ns in "${NAMESPACES[@]}"; do
        for gpu in "${GPUS[@]}"; do
            # Simulate 40GB GPUs (40960 MiB total)
            total_mem=40960
            # Usage varies between 50-90% based on load
            usage_pct=$(generate_value 0.70 0.15)
            usage_pct=$(awk "BEGIN {printf \"%.4f\", $usage_pct * $LOAD_FACTOR}")
            usage_pct=$(awk "BEGIN {if ($usage_pct > 0.95) print 0.95; else if ($usage_pct < 0.1) print 0.1; else print $usage_pct}")
            mem_used=$(awk "BEGIN {printf \"%.0f\", $total_mem * $usage_pct}")
            mem_free=$(awk "BEGIN {printf \"%.0f\", $total_mem - $mem_used}")
            echo "DCGM_FI_DEV_FB_USED{namespace=\"$ns\",gpu=\"$gpu\"} $mem_used $TS" >> "$OUTPUT_FILE"
            echo "DCGM_FI_DEV_FB_FREE{namespace=\"$ns\",gpu=\"$gpu\"} $mem_free $TS" >> "$OUTPUT_FILE"
        done
    done

    # accelerator_gpu_utilization - GPU utilization (0-1)
    for gpu in "${GPUS[@]}"; do
        gpu_util=$(generate_value 0.65 0.25)
        gpu_util=$(awk "BEGIN {printf \"%.4f\", $gpu_util * $LOAD_FACTOR}")
        gpu_util=$(awk "BEGIN {if ($gpu_util > 1) print 1; else if ($gpu_util < 0) print 0; else print $gpu_util}")
        echo "accelerator_gpu_utilization{gpu=\"$gpu\"} $gpu_util $TS" >> "$OUTPUT_FILE"
    done

    # GPU capacity metrics (cluster-wide)
    total_gpus=${#GPUS[@]}
    total_gpus=$((total_gpus * ${#NODES[@]}))  # GPUs per node * nodes
    allocated_gpus=$(awk "BEGIN {printf \"%.0f\", $total_gpus * 0.85}")  # ~85% allocated
    echo "cluster:node_gpu:sum{} $total_gpus $TS" >> "$OUTPUT_FILE"
    echo "cluster:node_gpu_allocated:sum{} $allocated_gpus $TS" >> "$OUTPUT_FILE"

    # kube_node_status_capacity for GPUs
    for node in "${NODES[@]}"; do
        echo "kube_node_status_capacity{resource=\"nvidia.com/gpu\",node=\"$node\"} ${#GPUS[@]} $TS" >> "$OUTPUT_FILE"
    done

    # ==================== KSERVE/MODEL POD METRICS ====================

    # kube_pod_labels - Labels for predictor pods (used for model deployment table)
    for i in "${!MODELS[@]}"; do
        model="${MODELS[$i]}"
        ns="${NAMESPACES[$((i % ${#NAMESPACES[@]}))]}"
        pod="${PODS[$i]}"
        # The key label_serving_kserve_io_inferenceservice identifies the model deployment
        echo "kube_pod_labels{pod=\"$pod\",namespace=\"$ns\",label_component=\"predictor\",label_serving_kserve_io_inferenceservice=\"$model\"} 1 $TS" >> "$OUTPUT_FILE"
    done

    # kube_pod_container_resource_limits - CPU limits for predictor pods
    for i in "${!MODELS[@]}"; do
        model="${MODELS[$i]}"
        ns="${NAMESPACES[$((i % ${#NAMESPACES[@]}))]}"
        pod="${PODS[$i]}"
        # 4-8 CPU cores limit per pod
        cpu_limit=$(( 4 + RANDOM % 5 ))
        echo "kube_pod_container_resource_limits{pod=\"$pod\",namespace=\"$ns\",resource=\"cpu\",container=\"kserve-container\"} $cpu_limit $TS" >> "$OUTPUT_FILE"
    done

    # node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate - CPU usage with pod labels
    for i in "${!MODELS[@]}"; do
        model="${MODELS[$i]}"
        ns="${NAMESPACES[$((i % ${#NAMESPACES[@]}))]}"
        pod="${PODS[$i]}"
        # CPU usage rate per pod (0.5-4 cores)
        cpu_rate=$(generate_value 2.0 1.5)
        cpu_rate=$(awk "BEGIN {printf \"%.6f\", $cpu_rate * $LOAD_FACTOR}")
        cpu_rate=$(awk "BEGIN {if ($cpu_rate < 0.1) print 0.1; else print $cpu_rate}")
        echo "node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{pod=\"$pod\",namespace=\"$ns\",container=\"kserve-container\"} $cpu_rate $TS" >> "$OUTPUT_FILE"
    done

    # ==================== INFERENCE METRICS ====================

    # inference_model_request_total and inference_model_request_error_total (with namespace)
    for i in "${!MODELS[@]}"; do
        model="${MODELS[$i]}"
        ns="${NAMESPACES[$((i % ${#NAMESPACES[@]}))]}"

        # ~100 requests per minute base rate
        total_requests=$(generate_counter 1.67 $ELAPSED 100)
        total_requests=$(awk "BEGIN {printf \"%.0f\", $total_requests * $LOAD_FACTOR}")
        echo "inference_model_request_total{model=\"$model\",namespace=\"$ns\"} $total_requests $TS" >> "$OUTPUT_FILE"

        # ~1-4% error rate (varies by model)
        error_rate=$(awk "BEGIN {print 0.01 + ($i * 0.01)}")
        error_requests=$(awk "BEGIN {printf \"%.0f\", $total_requests * $error_rate}")
        echo "inference_model_request_error_total{model=\"$model\",namespace=\"$ns\"} $error_requests $TS" >> "$OUTPUT_FILE"

        # inference_pool_average_queue_size - Queue size per model (from inference gateway)
        queue_size=$(generate_value 3 3)
        queue_size=$(awk "BEGIN {printf \"%.2f\", $queue_size * $LOAD_FACTOR}")
        queue_size=$(awk "BEGIN {if ($queue_size < 0) print 0; else print $queue_size}")
        echo "inference_pool_average_queue_size{model=\"$model\",namespace=\"$ns\"} $queue_size $TS" >> "$OUTPUT_FILE"

        # inference_pool_ready_pods - Ready pods per model
        ready_pods=$(( 2 + RANDOM % 3 ))  # 2-4 pods
        echo "inference_pool_ready_pods{model=\"$model\",namespace=\"$ns\"} $ready_pods $TS" >> "$OUTPUT_FILE"
    done

    # ==================== MODEL METRICS (vLLM) ====================

    for i in "${!MODELS[@]}"; do
        model="${MODELS[$i]}"
        ns="${NAMESPACES[$((i % ${#NAMESPACES[@]}))]}"
        deployment="${DEPLOYMENTS[$i]}"

        # vllm:num_requests_waiting - Queue length (0-20)
        queue_len=$(generate_value 5 5)
        queue_len=$(awk "BEGIN {printf \"%.0f\", $queue_len * $LOAD_FACTOR}")
        queue_len=$(awk "BEGIN {if ($queue_len < 0) print 0; else print $queue_len}")
        echo "vllm:num_requests_waiting{model_name=\"$model\",namespace=\"$ns\"} $queue_len $TS" >> "$OUTPUT_FILE"

        # vllm:num_requests_running - Concurrency/in-flight requests (1-10)
        running=$(generate_value 4 3)
        running=$(awk "BEGIN {printf \"%.0f\", $running * $LOAD_FACTOR}")
        running=$(awk "BEGIN {if ($running < 1) print 1; else print $running}")
        echo "vllm:num_requests_running{model_name=\"$model\",namespace=\"$ns\"} $running $TS" >> "$OUTPUT_FILE"

        # kube_deployment_status_replicas_available
        replicas=$(( 2 + RANDOM % 3 ))  # 2-4 replicas
        echo "kube_deployment_status_replicas_available{deployment=\"$deployment\",namespace=\"$ns\"} $replicas $TS" >> "$OUTPUT_FILE"

        # vllm:generation_tokens_total - Token counter (~500 tokens/sec)
        tokens=$(generate_counter 500 $ELAPSED 1000)
        tokens=$(awk "BEGIN {printf \"%.0f\", $tokens * $LOAD_FACTOR}")
        echo "vllm:generation_tokens_total{model_name=\"$model\",namespace=\"$ns\"} $tokens $TS" >> "$OUTPUT_FILE"

        # kserve_vllm:generation_tokens_total - KServe prefixed version
        echo "kserve_vllm:generation_tokens_total{model=\"$model\",namespace=\"$ns\"} $tokens $TS" >> "$OUTPUT_FILE"

        # vllm:request_success_total
        success=$(generate_counter 1.5 $ELAPSED 50)
        success=$(awk "BEGIN {printf \"%.0f\", $success * $LOAD_FACTOR}")
        echo "vllm:request_success_total{model_name=\"$model\",namespace=\"$ns\"} $success $TS" >> "$OUTPUT_FILE"

        # vllm:gpu_cache_usage_perc - KV cache GPU usage (0-1)
        gpu_cache=$(generate_value 0.60 0.25)
        gpu_cache=$(awk "BEGIN {printf \"%.4f\", $gpu_cache * $LOAD_FACTOR}")
        gpu_cache=$(awk "BEGIN {if ($gpu_cache > 0.98) print 0.98; else if ($gpu_cache < 0.1) print 0.1; else print $gpu_cache}")
        echo "vllm:gpu_cache_usage_perc{model_name=\"$model\",namespace=\"$ns\"} $gpu_cache $TS" >> "$OUTPUT_FILE"

        # vllm:cpu_cache_usage_perc - KV cache CPU usage (0-1, typically lower)
        cpu_cache=$(generate_value 0.15 0.10)
        cpu_cache=$(awk "BEGIN {printf \"%.4f\", $cpu_cache * $LOAD_FACTOR}")
        cpu_cache=$(awk "BEGIN {if ($cpu_cache > 0.5) print 0.5; else if ($cpu_cache < 0) print 0; else print $cpu_cache}")
        echo "vllm:cpu_cache_usage_perc{model_name=\"$model\",namespace=\"$ns\"} $cpu_cache $TS" >> "$OUTPUT_FILE"

        # vllm:e2e_request_latency_seconds histogram buckets
        # Simulate a distribution with most requests completing in 0.1-0.5 seconds
        cumulative=0
        for bucket in "${LATENCY_BUCKETS[@]}"; do
            # Exponential-like distribution (using awk for float comparison - no bc dependency)
            if float_lt "$bucket" 0.1; then
                bucket_prob=0.05
            elif float_lt "$bucket" 0.5; then
                bucket_prob=0.7
            elif float_lt "$bucket" 2; then
                bucket_prob=0.9
            else
                bucket_prob=0.99
            fi
            cumulative=$(generate_counter $(awk "BEGIN {print 1.5 * $bucket_prob}") $ELAPSED 10)
            cumulative=$(awk "BEGIN {printf \"%.0f\", $cumulative * $LOAD_FACTOR}")
            echo "vllm:e2e_request_latency_seconds_bucket{model_name=\"$model\",namespace=\"$ns\",le=\"$bucket\"} $cumulative $TS" >> "$OUTPUT_FILE"
            # Also emit KServe-prefixed version
            echo "kserve_vllm:e2e_request_latency_seconds_bucket{model=\"$model\",namespace=\"$ns\",le=\"$bucket\"} $cumulative $TS" >> "$OUTPUT_FILE"
        done
        echo "vllm:e2e_request_latency_seconds_bucket{model_name=\"$model\",namespace=\"$ns\",le=\"+Inf\"} $cumulative $TS" >> "$OUTPUT_FILE"
        echo "kserve_vllm:e2e_request_latency_seconds_bucket{model=\"$model\",namespace=\"$ns\",le=\"+Inf\"} $cumulative $TS" >> "$OUTPUT_FILE"

        # vllm:time_to_first_token_seconds histogram buckets
        # TTFT is typically faster than e2e latency
        cumulative=0
        for bucket in "${TTFT_BUCKETS[@]}"; do
            # Using awk for float comparison - no bc dependency
            if float_lt "$bucket" 0.025; then
                bucket_prob=0.1
            elif float_lt "$bucket" 0.1; then
                bucket_prob=0.6
            elif float_lt "$bucket" 0.5; then
                bucket_prob=0.95
            else
                bucket_prob=0.99
            fi
            cumulative=$(generate_counter $(awk "BEGIN {print 1.5 * $bucket_prob}") $ELAPSED 10)
            cumulative=$(awk "BEGIN {printf \"%.0f\", $cumulative * $LOAD_FACTOR}")
            echo "vllm:time_to_first_token_seconds_bucket{model_name=\"$model\",namespace=\"$ns\",le=\"$bucket\"} $cumulative $TS" >> "$OUTPUT_FILE"
            # Also emit KServe-prefixed version
            echo "kserve_vllm:time_to_first_token_seconds_bucket{model=\"$model\",namespace=\"$ns\",le=\"$bucket\"} $cumulative $TS" >> "$OUTPUT_FILE"
        done
        echo "vllm:time_to_first_token_seconds_bucket{model_name=\"$model\",namespace=\"$ns\",le=\"+Inf\"} $cumulative $TS" >> "$OUTPUT_FILE"
        echo "kserve_vllm:time_to_first_token_seconds_bucket{model=\"$model\",namespace=\"$ns\",le=\"+Inf\"} $cumulative $TS" >> "$OUTPUT_FILE"

        # kserve_inference_model_output_tokens_bucket - Output tokens histogram
        cumulative=0
        for bucket in "${OUTPUT_TOKENS_BUCKETS[@]}"; do
            if (( bucket < 100 )); then
                bucket_prob=0.15
            elif (( bucket < 500 )); then
                bucket_prob=0.65
            elif (( bucket < 2000 )); then
                bucket_prob=0.92
            else
                bucket_prob=0.99
            fi
            cumulative=$(generate_counter $(awk "BEGIN {print 1.5 * $bucket_prob}") $ELAPSED 10)
            cumulative=$(awk "BEGIN {printf \"%.0f\", $cumulative * $LOAD_FACTOR}")
            echo "kserve_inference_model_output_tokens_bucket{model=\"$model\",namespace=\"$ns\",le=\"$bucket\"} $cumulative $TS" >> "$OUTPUT_FILE"
        done
        echo "kserve_inference_model_output_tokens_bucket{model=\"$model\",namespace=\"$ns\",le=\"+Inf\"} $cumulative $TS" >> "$OUTPUT_FILE"
    done

    CURRENT_TIME=$((CURRENT_TIME + STEP))
    POINT_COUNT=$((POINT_COUNT + 1))

    # Update progress bar every 10 points (to reduce overhead)
    if [[ $((POINT_COUNT % 10)) -eq 0 ]] || [[ $POINT_COUNT -eq $TOTAL_POINTS ]]; then
        show_progress $POINT_COUNT $TOTAL_POINTS $GENERATION_START
    fi
done

# Add EOF marker for OpenMetrics format
if [[ "$FORMAT" == "openmetrics" ]]; then
    echo "# EOF" >> "$OUTPUT_FILE"
fi

# Calculate elapsed time
GENERATION_END=$(date +%s)
ELAPSED_TOTAL=$((GENERATION_END - GENERATION_START))
ELAPSED_MIN=$((ELAPSED_TOTAL / 60))
ELAPSED_SEC=$((ELAPSED_TOTAL % 60))

echo ""
echo ""
echo "Done! Generated $POINT_COUNT data points to $OUTPUT_FILE"
echo "Elapsed time: ${ELAPSED_MIN}m ${ELAPSED_SEC}s"
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
