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
GPUS=("gpu-0" "gpu-1" "gpu-2" "gpu-3")

# Histogram bucket boundaries for latency metrics (in seconds)
LATENCY_BUCKETS=(0.005 0.01 0.025 0.05 0.1 0.25 0.5 1 2.5 5 10)
TTFT_BUCKETS=(0.001 0.005 0.01 0.025 0.05 0.1 0.25 0.5 1 2.5)

# Calculate time range
END_TIME=$(date +%s)
START_TIME=$((END_TIME - DURATION_HOURS * 3600))
STEP=$INTERVAL_SECONDS

# Calculate total data points for progress tracking
TOTAL_POINTS=$(( (DURATION_HOURS * 3600) / INTERVAL_SECONDS + 1 ))

echo "Generating mock data from $(date -r $START_TIME) to $(date -r $END_TIME)"
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

    # Calculate percentage
    local percent=$((current * 100 / total))

    # Calculate filled/empty parts of bar
    local filled=$((percent * width / 100))
    local empty=$((width - filled))

    # Calculate ETA
    local elapsed=$(($(date +%s) - start_ts))
    if [[ $current -gt 0 ]]; then
        local rate=$(awk "BEGIN {printf \"%.2f\", $current / $elapsed}")
        local remaining=$(awk "BEGIN {printf \"%.0f\", ($total - $current) / $rate}")
        local eta_min=$((remaining / 60))
        local eta_sec=$((remaining % 60))
        local eta_str="${eta_min}m ${eta_sec}s"
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
# HELP accelerator_gpu_utilization GPU accelerator utilization (0-1)
# TYPE accelerator_gpu_utilization gauge
# HELP inference_model_request_total Total number of inference requests
# TYPE inference_model_request_total counter
# HELP inference_model_request_error_total Total number of failed inference requests
# TYPE inference_model_request_error_total counter
# HELP vllm:num_requests_waiting Number of requests waiting in queue
# TYPE vllm:num_requests_waiting gauge
# HELP vllm:e2e_request_latency_seconds_bucket End to end request latency histogram
# TYPE vllm:e2e_request_latency_seconds_bucket histogram
# HELP vllm:time_to_first_token_seconds_bucket Time to first token histogram
# TYPE vllm:time_to_first_token_seconds_bucket histogram
# HELP vllm:generation_tokens_total Total tokens generated
# TYPE vllm:generation_tokens_total counter
# HELP vllm:request_success_total Total successful requests
# TYPE vllm:request_success_total counter
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

    # accelerator_gpu_utilization - GPU utilization (0-1)
    for gpu in "${GPUS[@]}"; do
        gpu_util=$(generate_value 0.65 0.25)
        gpu_util=$(awk "BEGIN {printf \"%.4f\", $gpu_util * $LOAD_FACTOR}")
        gpu_util=$(awk "BEGIN {if ($gpu_util > 1) print 1; else if ($gpu_util < 0) print 0; else print $gpu_util}")
        echo "accelerator_gpu_utilization{gpu=\"$gpu\"} $gpu_util $TS" >> "$OUTPUT_FILE"
    done

    # ==================== INFERENCE METRICS ====================

    # inference_model_request_total and inference_model_request_error_total
    for model in "${MODELS[@]}"; do
        # ~100 requests per minute base rate
        total_requests=$(generate_counter 1.67 $ELAPSED 100)
        total_requests=$(awk "BEGIN {printf \"%.0f\", $total_requests * $LOAD_FACTOR}")
        echo "inference_model_request_total{model=\"$model\"} $total_requests $TS" >> "$OUTPUT_FILE"

        # ~1% error rate
        error_requests=$(awk "BEGIN {printf \"%.0f\", $total_requests * 0.01}")
        echo "inference_model_request_error_total{model=\"$model\"} $error_requests $TS" >> "$OUTPUT_FILE"
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

        # kube_deployment_status_replicas_available
        replicas=$(( 2 + RANDOM % 3 ))  # 2-4 replicas
        echo "kube_deployment_status_replicas_available{deployment=\"$deployment\",namespace=\"$ns\"} $replicas $TS" >> "$OUTPUT_FILE"

        # vllm:generation_tokens_total - Token counter (~500 tokens/sec)
        tokens=$(generate_counter 500 $ELAPSED 1000)
        tokens=$(awk "BEGIN {printf \"%.0f\", $tokens * $LOAD_FACTOR}")
        echo "vllm:generation_tokens_total{model_name=\"$model\",namespace=\"$ns\"} $tokens $TS" >> "$OUTPUT_FILE"

        # vllm:request_success_total
        success=$(generate_counter 1.5 $ELAPSED 50)
        success=$(awk "BEGIN {printf \"%.0f\", $success * $LOAD_FACTOR}")
        echo "vllm:request_success_total{model_name=\"$model\",namespace=\"$ns\"} $success $TS" >> "$OUTPUT_FILE"

        # vllm:e2e_request_latency_seconds histogram buckets
        # Simulate a distribution with most requests completing in 0.1-0.5 seconds
        cumulative=0
        for bucket in "${LATENCY_BUCKETS[@]}"; do
            # Exponential-like distribution
            if (( $(echo "$bucket < 0.1" | bc -l) )); then
                bucket_prob=0.05
            elif (( $(echo "$bucket < 0.5" | bc -l) )); then
                bucket_prob=0.7
            elif (( $(echo "$bucket < 2" | bc -l) )); then
                bucket_prob=0.9
            else
                bucket_prob=0.99
            fi
            cumulative=$(generate_counter $(awk "BEGIN {print 1.5 * $bucket_prob}") $ELAPSED 10)
            cumulative=$(awk "BEGIN {printf \"%.0f\", $cumulative * $LOAD_FACTOR}")
            echo "vllm:e2e_request_latency_seconds_bucket{model_name=\"$model\",namespace=\"$ns\",le=\"$bucket\"} $cumulative $TS" >> "$OUTPUT_FILE"
        done
        echo "vllm:e2e_request_latency_seconds_bucket{model_name=\"$model\",namespace=\"$ns\",le=\"+Inf\"} $cumulative $TS" >> "$OUTPUT_FILE"

        # vllm:time_to_first_token_seconds histogram buckets
        # TTFT is typically faster than e2e latency
        cumulative=0
        for bucket in "${TTFT_BUCKETS[@]}"; do
            if (( $(echo "$bucket < 0.025" | bc -l) )); then
                bucket_prob=0.1
            elif (( $(echo "$bucket < 0.1" | bc -l) )); then
                bucket_prob=0.6
            elif (( $(echo "$bucket < 0.5" | bc -l) )); then
                bucket_prob=0.95
            else
                bucket_prob=0.99
            fi
            cumulative=$(generate_counter $(awk "BEGIN {print 1.5 * $bucket_prob}") $ELAPSED 10)
            cumulative=$(awk "BEGIN {printf \"%.0f\", $cumulative * $LOAD_FACTOR}")
            echo "vllm:time_to_first_token_seconds_bucket{model_name=\"$model\",namespace=\"$ns\",le=\"$bucket\"} $cumulative $TS" >> "$OUTPUT_FILE"
        done
        echo "vllm:time_to_first_token_seconds_bucket{model_name=\"$model\",namespace=\"$ns\",le=\"+Inf\"} $cumulative $TS" >> "$OUTPUT_FILE"
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
