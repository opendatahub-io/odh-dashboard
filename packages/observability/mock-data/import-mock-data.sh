#!/bin/bash
#
# Import mock Prometheus metrics data using Remote Write API or TSDB block creation
# Based on: https://github.com/RedHatInsights/rhsm-subscriptions/blob/721d8d3c4cba464fc6cbd8a0c870d2a659cc6259/bin/prometheus-mock-data.sh
#
# Methods:
# 1. Remote Write (default): Push metrics directly to Prometheus remote write endpoint
# 2. TSDB Blocks: Create TSDB blocks and import them (requires promtool)
#
# Usage: ./import-mock-data.sh [OPTIONS]
#   -f FILE         Input file with metrics data (default: mock-metrics.txt)
#   -m METHOD       Import method: remote-write or tsdb-blocks (default: remote-write)
#   -u URL          Prometheus URL (default: auto-detect from OpenShift)
#   -t TOKEN        Bearer token for authentication (default: auto-detect from OpenShift)
#   -n NAMESPACE    Prometheus namespace in OpenShift (default: openshift-monitoring)
#   -s SERVICE      Prometheus service name (default: prometheus-k8s)
#   -p PORT         Prometheus port (default: 9090)
#   --thanos        Target Thanos instead of Prometheus
#   --dry-run       Show what would be done without executing
#

set -e

# Default configuration
INPUT_FILE="mock-metrics.txt"
METHOD="remote-write"
PROMETHEUS_URL=""
BEARER_TOKEN=""
PROMETHEUS_NAMESPACE="opendatahub"
PROMETHEUS_SERVICE="prometheus-data-science-monitoringstack"
PROMETHEUS_PORT="9090"
USE_THANOS=false
DRY_RUN=false
AUTO_RESTART=false
BATCH_SIZE=500

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f) INPUT_FILE="$2"; shift 2 ;;
        -m) METHOD="$2"; shift 2 ;;
        -u) PROMETHEUS_URL="$2"; shift 2 ;;
        -t) BEARER_TOKEN="$2"; shift 2 ;;
        -n) PROMETHEUS_NAMESPACE="$2"; shift 2 ;;
        -s) PROMETHEUS_SERVICE="$2"; shift 2 ;;
        -p) PROMETHEUS_PORT="$2"; shift 2 ;;
        --thanos) USE_THANOS=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        --auto-restart) AUTO_RESTART=true; shift ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -f FILE         Input file with metrics data (default: mock-metrics.txt)"
            echo "  -m METHOD       Import method: remote-write or tsdb-blocks (default: remote-write)"
            echo "  -u URL          Prometheus URL (default: auto-detect from OpenShift)"
            echo "  -t TOKEN        Bearer token for authentication (default: auto-detect from OpenShift)"
            echo "  -n NAMESPACE    Prometheus namespace (default: openshift-user-workload-monitoring)"
            echo "  -s SERVICE      Prometheus service name (default: prometheus-user-workload)"
            echo "  -p PORT         Prometheus port (default: 9090)"
            echo "  --thanos        Target Thanos instead of Prometheus"
            echo "  --dry-run       Show what would be done without executing"
            echo "  --auto-restart  Automatically restart Prometheus pod after import"
            echo ""
            echo "Methods:"
            echo "  remote-write    Push metrics via Prometheus Remote Write API (requires remote write receiver enabled)"
            echo "  tsdb-blocks     Create TSDB blocks using promtool (slower but works with historical data)"
            echo ""
            echo "Examples:"
            echo "  # Auto-detect OpenShift Prometheus and import"
            echo "  ./import-mock-data.sh -f mock-metrics.txt"
            echo ""
            echo "  # Use specific URL and token"
            echo "  ./import-mock-data.sh -u https://prometheus.example.com -t \$TOKEN"
            echo ""
            echo "  # Create TSDB blocks for historical data"
            echo "  ./import-mock-data.sh -m tsdb-blocks -f mock-metrics.txt"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Validate input file
if [[ ! -f "$INPUT_FILE" ]]; then
    echo "Error: Input file not found: $INPUT_FILE"
    echo "Run ./generate-mock-data.sh first to create the mock data file."
    exit 1
fi

echo "=== Prometheus Mock Data Import ==="
echo "Input file: $INPUT_FILE"
echo "Import method: $METHOD"
echo ""

# Function to detect OpenShift/Kubernetes configuration
detect_openshift_config() {
    echo "Detecting OpenShift configuration..."

    # Check if oc is available
    if ! command -v oc &> /dev/null; then
        echo "Warning: 'oc' command not found. Please provide URL and token manually."
        return 1
    fi

    # Check if logged in
    if ! oc whoami &> /dev/null; then
        echo "Warning: Not logged into OpenShift. Please login first with 'oc login'."
        return 1
    fi

    echo "Logged in as: $(oc whoami)"

    # Get token
    if [[ -z "$BEARER_TOKEN" ]]; then
        BEARER_TOKEN=$(oc whoami -t)
        echo "Using current session token"
    fi

    # Get Prometheus route or service URL
    if [[ -z "$PROMETHEUS_URL" ]]; then
        # Try to get the route first
        if $USE_THANOS; then
            # For Thanos, try the thanos-querier route
            ROUTE=$(oc get route thanos-querier -n openshift-monitoring -o jsonpath='{.spec.host}' 2>/dev/null || true)
            if [[ -n "$ROUTE" ]]; then
                PROMETHEUS_URL="https://$ROUTE"
            fi
        else
            # For user workload monitoring Prometheus
            ROUTE=$(oc get route prometheus-user-workload -n "$PROMETHEUS_NAMESPACE" -o jsonpath='{.spec.host}' 2>/dev/null || true)
            if [[ -n "$ROUTE" ]]; then
                PROMETHEUS_URL="https://$ROUTE"
            fi
        fi

        # Fallback to port-forward approach
        if [[ -z "$PROMETHEUS_URL" ]]; then
            echo "No route found, will use port-forward method"
            PROMETHEUS_URL="http://localhost:$PROMETHEUS_PORT"
        fi
    fi

    echo "Prometheus URL: $PROMETHEUS_URL"
    return 0
}

# Function to setup port-forward if needed
setup_port_forward() {
    if [[ "$PROMETHEUS_URL" == *"localhost"* ]]; then
        echo "Setting up port-forward to $PROMETHEUS_SERVICE in $PROMETHEUS_NAMESPACE..."

        # Kill any existing port-forward
        pkill -f "port-forward.*$PROMETHEUS_SERVICE" 2>/dev/null || true

        # Start port-forward in background
        oc port-forward -n "$PROMETHEUS_NAMESPACE" "svc/$PROMETHEUS_SERVICE" "$PROMETHEUS_PORT:9090" &
        PF_PID=$!
        sleep 3

        # Verify port-forward is working
        if ! kill -0 $PF_PID 2>/dev/null; then
            echo "Error: Port-forward failed to start"
            exit 1
        fi

        echo "Port-forward established (PID: $PF_PID)"
        trap "kill $PF_PID 2>/dev/null" EXIT
    fi
}

# Function to import via Remote Write API
import_remote_write() {
    echo ""
    echo "=== Importing via Remote Write API ==="

    local write_url="${PROMETHEUS_URL}/api/v1/write"
    echo "Remote Write endpoint: $write_url"

    # Check if promtool is available for pushing
    if ! command -v promtool &> /dev/null; then
        echo ""
        echo "promtool not found. Attempting to use curl with snappy compression..."
        import_remote_write_curl
        return
    fi

    if $DRY_RUN; then
        echo "[DRY RUN] Would execute: promtool push metrics $write_url $INPUT_FILE"
        return
    fi

    echo "Pushing metrics using promtool..."
    promtool push metrics "$write_url" "$INPUT_FILE" \
        ${BEARER_TOKEN:+--header="Authorization: Bearer $BEARER_TOKEN"}

    echo "Import complete!"
}

# Function to import via curl (for remote write without promtool)
import_remote_write_curl() {
    local write_url="${PROMETHEUS_URL}/api/v1/write"

    echo ""
    echo "Note: Direct curl import requires the data to be in Prometheus Remote Write protobuf format."
    echo "Converting OpenMetrics to Remote Write format requires additional tooling."
    echo ""
    echo "Recommended alternatives:"
    echo "1. Install promtool: https://prometheus.io/download/"
    echo "2. Use the TSDB blocks method: ./import-mock-data.sh -m tsdb-blocks"
    echo "3. Use a conversion tool like 'prom-migrator' or 'cortextool'"
    echo ""

    # Check if the metrics can be pushed via mimirtool or similar
    if command -v mimirtool &> /dev/null; then
        echo "Found mimirtool! Using it to push metrics..."
        if $DRY_RUN; then
            echo "[DRY RUN] Would execute: mimirtool backfill $INPUT_FILE --address $write_url"
            return
        fi
        mimirtool backfill "$INPUT_FILE" \
            --address "$write_url" \
            ${BEARER_TOKEN:+--key="$BEARER_TOKEN"}
        return
    fi

    echo "To install promtool, download from: https://prometheus.io/download/"
    echo "Or use: go install github.com/prometheus/prometheus/cmd/promtool@latest"
    exit 1
}

# Function to import via TSDB block creation
import_tsdb_blocks() {
    echo ""
    echo "=== Importing via TSDB Block Creation ==="

    if ! command -v promtool &> /dev/null; then
        echo "Error: promtool is required for TSDB block creation"
        echo "Install: go install github.com/prometheus/prometheus/cmd/promtool@latest"
        echo "Or download from: https://prometheus.io/download/"
        exit 1
    fi

    # Create temporary directory for blocks
    BLOCKS_DIR=$(mktemp -d)
    echo "Creating TSDB blocks in: $BLOCKS_DIR"

    if $DRY_RUN; then
        echo "[DRY RUN] Would execute: promtool tsdb create-blocks-from openmetrics $INPUT_FILE $BLOCKS_DIR"
        rm -rf "$BLOCKS_DIR"
        return
    fi

    # Create blocks from OpenMetrics data
    echo "Running promtool tsdb create-blocks-from openmetrics..."
    promtool tsdb create-blocks-from openmetrics "$INPUT_FILE" "$BLOCKS_DIR"

    echo ""
    echo "Blocks created successfully!"
    echo "Block directory contents:"
    ls -la "$BLOCKS_DIR"

    echo ""
    echo "=== Next Steps ==="
    echo "To import these blocks into Prometheus, you need to:"
    echo ""
    echo "1. Copy blocks to Prometheus data directory:"
    echo "   For OpenShift, you can use:"
    echo "   oc cp $BLOCKS_DIR prometheus-user-workload-0:/prometheus -n $PROMETHEUS_NAMESPACE"
    echo ""
    echo "2. Or if running locally, move blocks to your Prometheus data directory:"
    echo "   mv $BLOCKS_DIR/* /path/to/prometheus/data/"
    echo ""
    echo "3. Restart Prometheus or wait for it to detect new blocks"
    echo ""

    # Offer to copy blocks to OpenShift
    if command -v oc &> /dev/null && oc whoami &> /dev/null; then
        echo "Detected OpenShift connection. Attempting to copy blocks..."

        # Find a Running Prometheus pod (prefer Running status over CrashLoopBackOff)
        PROM_POD=""
        for pod in $(oc get pods -n "$PROMETHEUS_NAMESPACE" -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[*].metadata.name}' 2>/dev/null); do
            pod_status=$(oc get pod "$pod" -n "$PROMETHEUS_NAMESPACE" -o jsonpath='{.status.phase}' 2>/dev/null)
            container_ready=$(oc get pod "$pod" -n "$PROMETHEUS_NAMESPACE" -o jsonpath='{.status.containerStatuses[?(@.name=="prometheus")].ready}' 2>/dev/null)
            if [[ "$pod_status" == "Running" && "$container_ready" == "true" ]]; then
                PROM_POD="$pod"
                break
            fi
        done

        # Fallback to first pod if none are fully ready
        if [[ -z "$PROM_POD" ]]; then
            PROM_POD=$(oc get pods -n "$PROMETHEUS_NAMESPACE" -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
        fi

        if [[ -n "$PROM_POD" ]]; then
            echo "Found Prometheus pod: $PROM_POD"

            # Find the prometheus container name (might be 'prometheus' or 'prometheus-proxy')
            PROM_CONTAINER=$(oc get pod "$PROM_POD" -n "$PROMETHEUS_NAMESPACE" -o jsonpath='{.spec.containers[*].name}' | tr ' ' '\n' | grep -E '^prometheus$' | head -1)
            if [[ -z "$PROM_CONTAINER" ]]; then
                PROM_CONTAINER="prometheus"
            fi
            echo "Using container: $PROM_CONTAINER"

            # Find the data directory
            DATA_DIR=$(oc exec -n "$PROMETHEUS_NAMESPACE" "$PROM_POD" -c "$PROM_CONTAINER" -- sh -c 'ls -d /prometheus 2>/dev/null || echo /data' 2>/dev/null || echo "/prometheus")
            echo "Data directory: $DATA_DIR"

            for block in "$BLOCKS_DIR"/*; do
                if [[ -d "$block" ]]; then
                    block_name=$(basename "$block")
                    echo "Copying block $block_name..."

                    # Try oc cp first
                    if oc cp "$block" "$PROMETHEUS_NAMESPACE/$PROM_POD:$DATA_DIR/$block_name" -c "$PROM_CONTAINER" 2>/dev/null; then
                        echo "  Copied using oc cp"
                    else
                        echo "  oc cp failed, using cat-based copy..."
                        # Create directory structure
                        oc exec -n "$PROMETHEUS_NAMESPACE" "$PROM_POD" -c "$PROM_CONTAINER" -- mkdir -p "$DATA_DIR/$block_name/chunks"

                        # Copy each file using cat and stdin
                        for file in meta.json index tombstones; do
                            if [[ -f "$block/$file" ]]; then
                                cat "$block/$file" | oc exec -i -n "$PROMETHEUS_NAMESPACE" "$PROM_POD" -c "$PROM_CONTAINER" -- sh -c "cat > $DATA_DIR/$block_name/$file"
                            fi
                        done

                        # Copy chunks
                        for chunk in "$block/chunks"/*; do
                            if [[ -f "$chunk" ]]; then
                                chunkname=$(basename "$chunk")
                                cat "$chunk" | oc exec -i -n "$PROMETHEUS_NAMESPACE" "$PROM_POD" -c "$PROM_CONTAINER" -- sh -c "cat > $DATA_DIR/$block_name/chunks/$chunkname"
                            fi
                        done
                        echo "  Copied using cat method"
                    fi
                fi
            done

            echo ""
            echo "Blocks copied to Prometheus pod!"

            # Auto-restart if requested
            if $AUTO_RESTART; then
                echo ""
                echo "Auto-restarting Prometheus pod to load new blocks..."
                oc delete pod "$PROM_POD" -n "$PROMETHEUS_NAMESPACE"
                echo "Waiting for pod to restart..."
                sleep 5

                # Wait for new pod to be ready (timeout 120s)
                NEW_POD=""
                for i in {1..24}; do
                    NEW_POD=$(oc get pods -n "$PROMETHEUS_NAMESPACE" -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
                    if [[ -n "$NEW_POD" ]]; then
                        pod_ready=$(oc get pod "$NEW_POD" -n "$PROMETHEUS_NAMESPACE" -o jsonpath='{.status.containerStatuses[?(@.name=="prometheus")].ready}' 2>/dev/null)
                        if [[ "$pod_ready" == "true" ]]; then
                            echo "Prometheus pod $NEW_POD is ready!"
                            break
                        fi
                    fi
                    echo "  Waiting... ($i/24)"
                    sleep 5
                done

                if [[ -z "$NEW_POD" ]]; then
                    echo "WARNING: Pod did not become ready within timeout. Check pod status manually."
                fi
            else
                echo ""
                echo "IMPORTANT: You may need to restart the Prometheus pod for blocks to load correctly:"
                echo "  oc delete pod $PROM_POD -n $PROMETHEUS_NAMESPACE"
                echo ""
                echo "Or use --auto-restart flag to automatically restart after import."
            fi

            echo ""
            echo "After restart, verify the block loaded successfully:"
            echo "  oc logs -n $PROMETHEUS_NAMESPACE \$(oc get pods -n $PROMETHEUS_NAMESPACE -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[0].metadata.name}') -c prometheus | grep -i 'healthy block'"
            echo ""
            echo "NOTE: Mock data is static and will become stale after ~5 minutes."
            echo "Set your dashboard time range to match the data period, or regenerate data frequently."
        else
            echo "Could not find Prometheus pod in $PROMETHEUS_NAMESPACE"
            echo "Please copy blocks manually using the commands above."
        fi
    fi

    # Cleanup
    echo ""
    echo "Cleaning up temporary directory..."
    rm -rf "$BLOCKS_DIR"
}

# Detect if running on OpenShift and warn about remote-write limitations
check_openshift_remote_write() {
    if command -v oc &> /dev/null && oc whoami &> /dev/null; then
        echo ""
        echo "WARNING: OpenShift's built-in Prometheus does not have remote-write receiver enabled by default."
        echo "The remote-write method will likely fail."
        echo ""
        echo "Recommended alternatives:"
        echo "  1. Use TSDB blocks method: $0 -m tsdb-blocks"
        echo "  2. Deploy a separate Prometheus instance for mock data"
        echo ""
        read -p "Continue with remote-write anyway? (y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Switching to TSDB blocks method..."
            METHOD="tsdb-blocks"
        fi
    fi
}

# Main execution
detect_openshift_config || {
    if [[ -z "$PROMETHEUS_URL" ]]; then
        echo ""
        echo "Error: Could not detect Prometheus configuration."
        echo "Please provide URL and token manually:"
        echo "  $0 -u https://prometheus.example.com -t YOUR_TOKEN"
        exit 1
    fi
}

if [[ "$METHOD" == "remote-write" ]]; then
    check_openshift_remote_write
fi

if [[ "$METHOD" == "remote-write" ]]; then
    setup_port_forward
    import_remote_write
elif [[ "$METHOD" == "tsdb-blocks" ]]; then
    import_tsdb_blocks
else
    echo "Error: Unknown method: $METHOD"
    echo "Use 'remote-write' or 'tsdb-blocks'"
    exit 1
fi

echo ""
echo "=== Import Complete ==="
