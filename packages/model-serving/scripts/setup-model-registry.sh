#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Setup script for Model Registry on OpenShift with Open Data Hub
#
# This script:
# 1. Installs required operators (Authorino, Service Mesh, ODH)
# 2. Creates DSCInitialization and DataScienceCluster with Model Registry enabled
# 3. Optionally installs a MySQL database for development/testing
# 4. Creates a Model Registry instance
# 5. Enables Model Registry in the ODH Dashboard
#
# Prerequisites:
# - oc CLI logged into your OpenShift cluster with cluster-admin privileges
# - OpenShift 4.17+ recommended
#
# Usage:
#   ./setup-model-registry.sh                     # Full setup with local MySQL
#   ./setup-model-registry.sh --skip-operators    # Skip operator installation
#   ./setup-model-registry.sh --skip-database     # Use external database
#   ./setup-model-registry.sh --external-db       # Configure for external database
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
OPERATOR_NAMESPACE="${OPERATOR_NAMESPACE:-openshift-operators}"
DASHBOARD_NAMESPACE="${DASHBOARD_NAMESPACE:-opendatahub}"
MODEL_REGISTRY_NAMESPACE="${MODEL_REGISTRY_NAMESPACE:-odh-model-registries}"
DATABASE_NAMESPACE="${DATABASE_NAMESPACE:-model-registry-db}"

# Database configuration
DB_HOST="${DB_HOST:-model-registry-db.${DATABASE_NAMESPACE}.svc.cluster.local}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-model_registry}"
DB_USER="${DB_USER:-modelregistryuser}"
DB_PASSWORD="${DB_PASSWORD:-TheBlurstOfTimes}"

# Operator versions
AUTHORINO_VERSION="${AUTHORINO_VERSION:-authorino-operator.v0.16.0}"
SERVICE_MESH_VERSION="${SERVICE_MESH_VERSION:-servicemeshoperator.v2.6.5}"
ODH_VERSION="${ODH_VERSION:-opendatahub-operator.v2.23.0}"

# Flags
SKIP_OPERATORS="${SKIP_OPERATORS:-false}"
SKIP_DATABASE="${SKIP_DATABASE:-false}"
SKIP_DSC="${SKIP_DSC:-false}"
EXTERNAL_DB="${EXTERNAL_DB:-false}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-operators)
                SKIP_OPERATORS="true"
                shift
                ;;
            --skip-database)
                SKIP_DATABASE="true"
                shift
                ;;
            --skip-dsc)
                SKIP_DSC="true"
                shift
                ;;
            --external-db)
                EXTERNAL_DB="true"
                SKIP_DATABASE="true"
                shift
                ;;
            --db-host)
                DB_HOST="$2"
                shift 2
                ;;
            --db-port)
                DB_PORT="$2"
                shift 2
                ;;
            --db-name)
                DB_NAME="$2"
                shift 2
                ;;
            --db-user)
                DB_USER="$2"
                shift 2
                ;;
            --db-password)
                DB_PASSWORD="$2"
                shift 2
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Setup Model Registry on OpenShift with Open Data Hub.

Options:
    --skip-operators    Skip operator installation (if already installed)
    --skip-database     Skip local MySQL database installation
    --skip-dsc          Skip DSCInitialization and DataScienceCluster creation
    --external-db       Configure for external database (implies --skip-database)
    --db-host HOST      Database host (default: model-registry-db.${DATABASE_NAMESPACE}.svc.cluster.local)
    --db-port PORT      Database port (default: 3306)
    --db-name NAME      Database name (default: model_registry)
    --db-user USER      Database user (default: modelregistryuser)
    --db-password PASS  Database password
    --help, -h          Show this help message

Environment Variables:
    OPERATOR_NAMESPACE        Operator namespace (default: openshift-operators)
    DASHBOARD_NAMESPACE       Dashboard namespace (default: opendatahub)
    MODEL_REGISTRY_NAMESPACE  Model Registry namespace (default: odh-model-registries)
    DATABASE_NAMESPACE        Database namespace (default: model-registry-db)
    AUTHORINO_VERSION         Authorino operator version
    SERVICE_MESH_VERSION      Service Mesh operator version
    ODH_VERSION               ODH operator version

Examples:
    $(basename "$0")                              # Full setup with local MySQL
    $(basename "$0") --skip-operators             # Skip operator installation
    $(basename "$0") --external-db --db-host mydb.example.com --db-user admin
EOF
}

# Check for required tools
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v oc &> /dev/null; then
        log_error "oc CLI is required but not installed. Aborting."
        exit 1
    fi

    if ! oc whoami &> /dev/null; then
        log_error "Not logged into OpenShift cluster. Please run 'oc login' first."
        exit 1
    fi

    # Check for jq (optional but recommended)
    if ! command -v jq &> /dev/null; then
        log_warn "jq is not installed. Some status checks may be limited."
    fi

    log_info "Prerequisites check passed."
    log_info "Logged in as: $(oc whoami)"
    log_info "Cluster: $(oc whoami --show-server)"
}

# Wait for CSV to be ready (exact name)
wait_for_csv() {
    local csv_name="$1"
    local namespace="$2"
    local max_attempts="${3:-60}"
    local attempt=0

    log_info "Waiting for CSV ${csv_name} to be ready..."

    while [[ $attempt -lt $max_attempts ]]; do
        local phase
        phase=$(oc get csv "${csv_name}" -n "${namespace}" -o jsonpath='{.status.phase}' 2>/dev/null || echo "")

        if [[ "$phase" == "Succeeded" ]]; then
            log_info "CSV ${csv_name} is ready."
            return 0
        elif [[ "$phase" == "Failed" ]]; then
            log_error "CSV ${csv_name} failed to install."
            return 1
        fi

        log_info "CSV status: ${phase:-Pending}... (attempt $((attempt + 1))/$max_attempts)"
        sleep 5
        attempt=$((attempt + 1))
    done

    log_warn "CSV ${csv_name} did not become ready in time."
    return 1
}

# Wait for CSV to be ready (pattern match - finds any version)
wait_for_csv_pattern() {
    local csv_pattern="$1"
    local namespace="$2"
    local max_attempts="${3:-60}"
    local attempt=0

    log_info "Waiting for ${csv_pattern} CSV to be ready..."

    while [[ $attempt -lt $max_attempts ]]; do
        local csv
        csv=$(oc get csv -n "${namespace}" -o name 2>/dev/null | grep "${csv_pattern}" | head -n1 || echo "")

        if [[ -n "$csv" ]]; then
            local phase
            phase=$(oc get "${csv}" -n "${namespace}" -o jsonpath='{.status.phase}' 2>/dev/null || echo "")

            if [[ "$phase" == "Succeeded" ]]; then
                local csv_name
                csv_name=$(echo "${csv}" | cut -d/ -f2)
                log_info "CSV ${csv_name} is ready."
                return 0
            elif [[ "$phase" == "Failed" ]]; then
                log_error "CSV ${csv_pattern} failed to install."
                return 1
            fi

            log_info "CSV status: ${phase:-Pending}... (attempt $((attempt + 1))/$max_attempts)"
        else
            log_info "CSV not found yet... (attempt $((attempt + 1))/$max_attempts)"
        fi

        sleep 5
        attempt=$((attempt + 1))
    done

    log_warn "CSV ${csv_pattern} did not become ready in time."
    return 1
}

# Check if an operator is already installed (any version)
check_operator_installed() {
    local operator_name="$1"
    local namespace="$2"

    local csv
    csv=$(oc get csv -n "${namespace}" -o name 2>/dev/null | grep "${operator_name}" | head -n1 || echo "")

    if [[ -n "$csv" ]]; then
        local phase
        phase=$(oc get "${csv}" -n "${namespace}" -o jsonpath='{.status.phase}' 2>/dev/null || echo "")
        if [[ "$phase" == "Succeeded" ]]; then
            local csv_name
            csv_name=$(echo "${csv}" | cut -d/ -f2)
            log_info "${operator_name} already installed (${csv_name}) and ready."
            return 0
        fi
    fi
    return 1
}

# Install Authorino operator
install_authorino() {
    log_info "Installing Authorino operator..."

    # Check if any version of Authorino is already installed
    if check_operator_installed "authorino-operator" "${OPERATOR_NAMESPACE}"; then
        return 0
    fi

    cat <<EOF | oc apply -f -
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: authorino-operator
  namespace: ${OPERATOR_NAMESPACE}
spec:
  channel: stable
  installPlanApproval: Automatic
  name: authorino-operator
  source: redhat-operators
  sourceNamespace: openshift-marketplace
  startingCSV: ${AUTHORINO_VERSION}
EOF

    wait_for_csv_pattern "authorino-operator" "${OPERATOR_NAMESPACE}"
}

# Install Service Mesh operator
install_service_mesh() {
    log_info "Installing Service Mesh operator..."

    # Check if any version of Service Mesh is already installed
    if check_operator_installed "servicemeshoperator" "${OPERATOR_NAMESPACE}"; then
        return 0
    fi

    cat <<EOF | oc apply -f -
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: servicemeshoperator
  namespace: ${OPERATOR_NAMESPACE}
spec:
  channel: stable
  installPlanApproval: Automatic
  name: servicemeshoperator
  source: redhat-operators
  sourceNamespace: openshift-marketplace
  startingCSV: ${SERVICE_MESH_VERSION}
EOF

    wait_for_csv_pattern "servicemeshoperator" "${OPERATOR_NAMESPACE}"
}

# Install ODH operator
install_odh() {
    log_info "Installing Open Data Hub operator..."

    # Check if any version of ODH is already installed
    if check_operator_installed "opendatahub-operator" "${OPERATOR_NAMESPACE}"; then
        return 0
    fi

    cat <<EOF | oc apply -f -
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: opendatahub-operator
  namespace: ${OPERATOR_NAMESPACE}
spec:
  channel: fast
  installPlanApproval: Automatic
  name: opendatahub-operator
  source: community-operators
  sourceNamespace: openshift-marketplace
  startingCSV: ${ODH_VERSION}
EOF

    wait_for_csv_pattern "opendatahub-operator" "${OPERATOR_NAMESPACE}"
}

# Install all required operators
install_operators() {
    log_step "Installing required operators..."

    install_authorino
    install_service_mesh
    install_odh

    log_info "All operators installed successfully."
}

# Create DSCInitialization
create_dsci() {
    log_info "Creating DSCInitialization..."

    if oc get dsci default-dsci &> /dev/null; then
        log_info "DSCInitialization 'default-dsci' already exists."
        return 0
    fi

    cat <<EOF | oc apply -f -
apiVersion: dscinitialization.opendatahub.io/v1
kind: DSCInitialization
metadata:
  name: default-dsci
spec:
  applicationsNamespace: ${DASHBOARD_NAMESPACE}
  devFlags:
    logmode: production
  monitoring:
    managementState: Managed
    namespace: ${DASHBOARD_NAMESPACE}
  serviceMesh:
    auth:
      audiences:
        - 'https://kubernetes.default.svc'
    controlPlane:
      metricsCollection: Istio
      name: data-science-smcp
      namespace: istio-system
    managementState: Managed
  trustedCABundle:
    customCABundle: ''
    managementState: Managed
EOF

    log_info "Waiting for DSCInitialization to be ready..."
    local max_attempts=60
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        local phase
        phase=$(oc get dsci default-dsci -o jsonpath='{.status.phase}' 2>/dev/null || echo "")

        if [[ "$phase" == "Ready" ]]; then
            log_info "DSCInitialization is ready."
            return 0
        fi

        log_info "DSCInitialization status: ${phase:-Pending}... (attempt $((attempt + 1))/$max_attempts)"
        sleep 5
        attempt=$((attempt + 1))
    done

    log_warn "DSCInitialization may still be initializing."
}

# Create DataScienceCluster
create_dsc() {
    log_info "Creating DataScienceCluster..."

    if oc get dsc default-dsc &> /dev/null; then
        log_info "DataScienceCluster 'default-dsc' already exists. Checking Model Registry status..."

        # Check if modelregistry is managed
        local mr_state
        mr_state=$(oc get dsc default-dsc -o jsonpath='{.spec.components.modelregistry.managementState}' 2>/dev/null || echo "")

        if [[ "$mr_state" != "Managed" ]]; then
            log_info "Patching DataScienceCluster to enable Model Registry..."
            oc patch dsc default-dsc --type merge -p '{"spec":{"components":{"modelregistry":{"managementState":"Managed","registriesNamespace":"'"${MODEL_REGISTRY_NAMESPACE}"'"}}}}'
        else
            log_info "Model Registry is already enabled."
        fi
        return 0
    fi

    cat <<EOF | oc apply -f -
apiVersion: datasciencecluster.opendatahub.io/v1
kind: DataScienceCluster
metadata:
  labels:
    app.kubernetes.io/created-by: opendatahub-operator
    app.kubernetes.io/instance: default
    app.kubernetes.io/managed-by: kustomize
    app.kubernetes.io/name: datasciencecluster
    app.kubernetes.io/part-of: opendatahub-operator
  name: default-dsc
spec:
  components:
    codeflare:
      managementState: Removed
    kserve:
      managementState: Managed
      serving:
        ingressGateway:
          certificate:
            type: OpenshiftDefaultIngress
        managementState: Managed
        name: knative-serving
    modelregistry:
      managementState: Managed
      registriesNamespace: ${MODEL_REGISTRY_NAMESPACE}
    trustyai:
      managementState: Removed
    ray:
      managementState: Removed
    kueue:
      managementState: Removed
    workbenches:
      managementState: Managed
    dashboard:
      managementState: Managed
    modelmeshserving:
      managementState: Managed
    datasciencepipelines:
      managementState: Managed
    trainingoperator:
      managementState: Removed
EOF

    log_info "Waiting for DataScienceCluster to be ready..."
    local max_attempts=120
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        local phase
        phase=$(oc get dsc default-dsc -o jsonpath='{.status.phase}' 2>/dev/null || echo "")

        if [[ "$phase" == "Ready" ]]; then
            log_info "DataScienceCluster is ready."
            return 0
        fi

        log_info "DataScienceCluster status: ${phase:-Pending}... (attempt $((attempt + 1))/$max_attempts)"
        sleep 10
        attempt=$((attempt + 1))
    done

    log_warn "DataScienceCluster may still be initializing. This can take several minutes."
}

# Create DSCInitialization and DataScienceCluster
setup_dsc() {
    log_step "Setting up Data Science Cluster..."

    create_dsci
    create_dsc

    log_info "Data Science Cluster setup complete."
}

# Install MySQL database for development
install_database() {
    log_step "Installing MySQL database for Model Registry..."

    # Create namespace
    if ! oc get namespace "${DATABASE_NAMESPACE}" &> /dev/null; then
        log_info "Creating namespace ${DATABASE_NAMESPACE}..."
        oc new-project "${DATABASE_NAMESPACE}" || oc create namespace "${DATABASE_NAMESPACE}"
    else
        log_info "Namespace ${DATABASE_NAMESPACE} already exists."
    fi

    # Check if database already exists
    if oc get deployment model-registry-db -n "${DATABASE_NAMESPACE}" &> /dev/null; then
        log_info "MySQL database already exists in ${DATABASE_NAMESPACE}."
        return 0
    fi

    log_info "Deploying MySQL database..."

    cat <<EOF | oc apply -n "${DATABASE_NAMESPACE}" -f -
apiVersion: v1
kind: List
items:
- apiVersion: v1
  kind: Secret
  metadata:
    labels:
      app.kubernetes.io/name: model-registry-db
      app.kubernetes.io/instance: model-registry-db
      app.kubernetes.io/part-of: model-registry-db
      app.kubernetes.io/managed-by: kustomize
    name: model-registry-db
  stringData:
    database-name: "${DB_NAME}"
    database-password: "${DB_PASSWORD}"
    database-user: "${DB_USER}"
- apiVersion: v1
  kind: Service
  metadata:
    labels:
      app.kubernetes.io/name: model-registry-db
      app.kubernetes.io/instance: model-registry-db
      app.kubernetes.io/part-of: model-registry-db
      app.kubernetes.io/managed-by: kustomize
    name: model-registry-db
  spec:
    ports:
    - name: mysql
      port: 3306
      protocol: TCP
      appProtocol: tcp
      targetPort: 3306
    selector:
      name: model-registry-db
    sessionAffinity: None
    type: ClusterIP
- apiVersion: v1
  kind: PersistentVolumeClaim
  metadata:
    labels:
      app.kubernetes.io/name: model-registry-db
      app.kubernetes.io/instance: model-registry-db
      app.kubernetes.io/part-of: model-registry-db
      app.kubernetes.io/managed-by: kustomize
    name: model-registry-db
  spec:
    accessModes:
    - ReadWriteOnce
    resources:
      requests:
        storage: 5Gi
- apiVersion: apps/v1
  kind: Deployment
  metadata:
    labels:
      app.kubernetes.io/name: model-registry-db
      app.kubernetes.io/instance: model-registry-db
      app.kubernetes.io/part-of: model-registry-db
      app.kubernetes.io/managed-by: kustomize
    name: model-registry-db
  spec:
    replicas: 1
    revisionHistoryLimit: 0
    selector:
      matchLabels:
        name: model-registry-db
    strategy:
      type: Recreate
    template:
      metadata:
        labels:
          name: model-registry-db
          sidecar.istio.io/inject: "false"
      spec:
        containers:
        - name: mysql
          image: mysql:8.3.0
          imagePullPolicy: IfNotPresent
          args:
            - --datadir
            - /var/lib/mysql/datadir
            - --default-authentication-plugin=mysql_native_password
          env:
          - name: MYSQL_USER
            valueFrom:
              secretKeyRef:
                key: database-user
                name: model-registry-db
          - name: MYSQL_PASSWORD
            valueFrom:
              secretKeyRef:
                key: database-password
                name: model-registry-db
          - name: MYSQL_ROOT_PASSWORD
            valueFrom:
              secretKeyRef:
                key: database-password
                name: model-registry-db
          - name: MYSQL_DATABASE
            valueFrom:
              secretKeyRef:
                key: database-name
                name: model-registry-db
          ports:
          - containerPort: 3306
            protocol: TCP
          livenessProbe:
            exec:
              command:
                - /bin/bash
                - -c
                - mysqladmin -u\${MYSQL_USER} -p\${MYSQL_ROOT_PASSWORD} ping
            initialDelaySeconds: 15
            periodSeconds: 10
            timeoutSeconds: 5
          readinessProbe:
            exec:
              command:
              - /bin/bash
              - -c
              - mysql -D \${MYSQL_DATABASE} -u\${MYSQL_USER} -p\${MYSQL_ROOT_PASSWORD} -e 'SELECT 1'
            initialDelaySeconds: 10
            timeoutSeconds: 5
          volumeMounts:
          - mountPath: /var/lib/mysql
            name: model-registry-db-data
        volumes:
        - name: model-registry-db-data
          persistentVolumeClaim:
            claimName: model-registry-db
EOF

    log_info "Waiting for MySQL database to be ready..."
    if ! oc wait --for=condition=available deployment/model-registry-db -n "${DATABASE_NAMESPACE}" --timeout=300s; then
        log_error "MySQL database did not become ready in time."
        exit 1
    fi

    log_info "MySQL database is ready."
}

# Create Model Registry instance
create_model_registry() {
    log_step "Creating Model Registry instance..."

    # Ensure namespace exists
    if ! oc get namespace "${MODEL_REGISTRY_NAMESPACE}" &> /dev/null; then
        log_info "Creating namespace ${MODEL_REGISTRY_NAMESPACE}..."
        oc create namespace "${MODEL_REGISTRY_NAMESPACE}" || true
    fi

    # Switch to model registry namespace
    oc project "${MODEL_REGISTRY_NAMESPACE}"

    # Check if Model Registry already exists
    if oc get modelregistries.modelregistry.opendatahub.io modelregistry-public -n "${MODEL_REGISTRY_NAMESPACE}" &> /dev/null; then
        log_info "Model Registry 'modelregistry-public' already exists."
        return 0
    fi

    # Determine database host
    local db_host="${DB_HOST}"
    if [[ "${EXTERNAL_DB}" != "true" ]] && [[ "${SKIP_DATABASE}" != "true" ]]; then
        db_host="model-registry-db.${DATABASE_NAMESPACE}.svc.cluster.local"
    fi

    log_info "Creating Model Registry with database host: ${db_host}"

    cat <<EOF | oc apply -n "${MODEL_REGISTRY_NAMESPACE}" -f -
apiVersion: v1
kind: List
items:
  - apiVersion: v1
    kind: Secret
    metadata:
      labels:
        app.kubernetes.io/name: model-registry-db
        app.kubernetes.io/instance: model-registry-db
        app.kubernetes.io/part-of: model-registry-db
        app.kubernetes.io/managed-by: kustomize
      name: model-registry-db
    stringData:
      database-name: "${DB_NAME}"
      database-password: "${DB_PASSWORD}"
      database-user: "${DB_USER}"
  - apiVersion: modelregistry.opendatahub.io/v1beta1
    kind: ModelRegistry
    metadata:
      labels:
        app.kubernetes.io/created-by: model-registry-operator
        app.kubernetes.io/instance: modelregistry-sample
        app.kubernetes.io/managed-by: kustomize
        app.kubernetes.io/name: modelregistry
        app.kubernetes.io/part-of: model-registry-operator
      name: modelregistry-public
    spec:
      rest: {}
      istio:
        authProvider: opendatahub-auth-provider
        gateway:
          rest:
            tls: {}
      mysql:
        host: ${db_host}
        database: ${DB_NAME}
        passwordSecret:
          key: database-password
          name: model-registry-db
        port: ${DB_PORT}
        skipDBCreation: false
        username: ${DB_USER}
EOF

    log_info "Waiting for Model Registry to be available..."
    local max_attempts=60
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        if oc wait --for=condition=available modelregistries.modelregistry.opendatahub.io/modelregistry-public -n "${MODEL_REGISTRY_NAMESPACE}" --timeout=10s 2>/dev/null; then
            log_info "Model Registry is available."
            return 0
        fi

        log_info "Waiting for Model Registry... (attempt $((attempt + 1))/$max_attempts)"
        sleep 5
        attempt=$((attempt + 1))
    done

    log_warn "Model Registry may still be initializing."
}

# Enable Model Registry in Dashboard
enable_dashboard_model_registry() {
    log_step "Enabling Model Registry in ODH Dashboard..."

    if ! oc get odhdashboardconfig odh-dashboard-config -n "${DASHBOARD_NAMESPACE}" &> /dev/null; then
        log_warn "ODH Dashboard config not found. Dashboard may not be fully deployed yet."
        return 0
    fi

    oc patch odhdashboardconfig.opendatahub.io odh-dashboard-config -n "${DASHBOARD_NAMESPACE}" \
        --type merge -p '{"spec": {"dashboardConfig": {"disableModelRegistry": false}}}'

    log_info "Model Registry enabled in Dashboard."
}

# Configure default model catalog sources
configure_model_catalog_sources() {
    log_step "Configuring default model catalog sources..."

    # Check if configmap exists
    if ! oc get configmap model-catalog-sources -n "${MODEL_REGISTRY_NAMESPACE}" &> /dev/null; then
        log_info "Creating model-catalog-sources configmap..."
        cat <<EOF | oc apply -n "${MODEL_REGISTRY_NAMESPACE}" -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: model-catalog-sources
  namespace: ${MODEL_REGISTRY_NAMESPACE}
data:
  sources.yaml: |
    catalogs:
      - enabled: true
        id: redhat_ai_models
      - enabled: true
        id: redhat_ai_validated_models
EOF
    else
        log_info "Updating model-catalog-sources configmap..."
        oc patch configmap model-catalog-sources -n "${MODEL_REGISTRY_NAMESPACE}" \
            --type merge -p '{"data":{"sources.yaml":"catalogs:\n  - enabled: true\n    id: redhat_ai_models\n  - enabled: true\n    id: redhat_ai_validated_models\n"}}'
    fi

    log_info "Model catalog sources configured."
}

# Get Model Registry URL
get_model_registry_url() {
    log_info "Finding Model Registry URL..."

    local url
    url=$(oc get routes -n istio-system -l app.kubernetes.io/name=modelregistry-public -o jsonpath='{.items[*].status.ingress[*].host}' 2>/dev/null | tr ' ' '\n' | grep -E '\-rest' | head -n1 || echo "")

    if [[ -n "$url" ]]; then
        echo "https://${url}"
    else
        log_warn "Model Registry route not found yet. It may take a few minutes to be created."
        echo ""
    fi
}

# Verify installation
verify_installation() {
    log_info "Verifying installation..."

    echo ""
    echo "=============================================="
    echo "Model Registry Installation Summary"
    echo "=============================================="

    echo ""
    echo "Operators:"
    echo "----------"
    for operator in "authorino-operator" "servicemeshoperator" "opendatahub-operator"; do
        local csv
        csv=$(oc get csv -n "${OPERATOR_NAMESPACE}" -o name 2>/dev/null | grep "${operator}" | head -n1 || echo "")
        if [[ -n "$csv" ]]; then
            local csv_name phase
            csv_name=$(echo "${csv}" | cut -d/ -f2)
            phase=$(oc get "${csv}" -n "${OPERATOR_NAMESPACE}" -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
            echo "  ${csv_name}: ${phase}"
        else
            echo "  ${operator}: Not Found"
        fi
    done

    echo ""
    echo "Data Science Cluster:"
    echo "---------------------"
    if oc get dsc default-dsc &> /dev/null; then
        local dsc_phase
        dsc_phase=$(oc get dsc default-dsc -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")
        echo "  Status: ${dsc_phase}"

        local mr_state
        mr_state=$(oc get dsc default-dsc -o jsonpath='{.spec.components.modelregistry.managementState}' 2>/dev/null || echo "Unknown")
        echo "  Model Registry: ${mr_state}"
    else
        echo "  DataScienceCluster not found"
    fi

    if [[ "${SKIP_DATABASE}" != "true" ]]; then
        echo ""
        echo "Database:"
        echo "---------"
        if oc get deployment model-registry-db -n "${DATABASE_NAMESPACE}" &> /dev/null; then
            local db_ready
            db_ready=$(oc get deployment model-registry-db -n "${DATABASE_NAMESPACE}" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
            echo "  Status: ${db_ready:-0} replica(s) ready"
            echo "  Namespace: ${DATABASE_NAMESPACE}"
        else
            echo "  Database not found"
        fi
    fi

    echo ""
    echo "Model Registry:"
    echo "---------------"
    if oc get modelregistries.modelregistry.opendatahub.io modelregistry-public -n "${MODEL_REGISTRY_NAMESPACE}" &> /dev/null; then
        local mr_available
        mr_available=$(oc get modelregistries.modelregistry.opendatahub.io modelregistry-public -n "${MODEL_REGISTRY_NAMESPACE}" -o jsonpath='{.status.conditions[?(@.type=="Available")].status}' 2>/dev/null || echo "Unknown")
        echo "  Available: ${mr_available}"
        echo "  Namespace: ${MODEL_REGISTRY_NAMESPACE}"

        local mr_url
        mr_url=$(get_model_registry_url)
        if [[ -n "$mr_url" ]]; then
            echo "  URL: ${mr_url}"
        fi
    else
        echo "  Model Registry not found"
    fi

    echo ""
    echo "Dashboard:"
    echo "----------"
    if oc get deploy odh-dashboard -n "${DASHBOARD_NAMESPACE}" &> /dev/null; then
        local dashboard_ready
        dashboard_ready=$(oc get deploy odh-dashboard -n "${DASHBOARD_NAMESPACE}" -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        echo "  Status: ${dashboard_ready:-0} replica(s) ready"

        local dashboard_url
        dashboard_url=$(oc get routes -n "${DASHBOARD_NAMESPACE}" -l app=odh-dashboard -o jsonpath='{.items[0].status.ingress[0].host}' 2>/dev/null || echo "")
        if [[ -n "$dashboard_url" ]]; then
            echo "  URL: https://${dashboard_url}"
        fi
    else
        echo "  Dashboard not found"
    fi

    echo ""
    echo "=============================================="
}

# Test Model Registry API
test_model_registry() {
    log_info "Testing Model Registry API..."

    local mr_url
    mr_url=$(get_model_registry_url)

    if [[ -z "$mr_url" ]]; then
        log_warn "Model Registry URL not available yet. Skipping API test."
        return 0
    fi

    local token
    token=$(oc whoami -t 2>/dev/null || echo "")

    if [[ -z "$token" ]]; then
        log_warn "Could not get authentication token. Skipping API test."
        return 0
    fi

    log_info "Testing API at ${mr_url}..."

    local response
    if response=$(curl -sk -H "Authorization: Bearer ${token}" "${mr_url}/api/model_registry/v1alpha3/registered_models" 2>/dev/null); then
        if echo "$response" | grep -q '"items"'; then
            log_info "Model Registry API is working!"
            echo "Response: ${response}"
        else
            log_warn "Unexpected API response: ${response}"
        fi
    else
        log_warn "Could not reach Model Registry API. It may still be initializing."
    fi
}

# Main function
main() {
    parse_args "$@"

    echo "=============================================="
    echo "Model Registry Setup Script"
    echo "=============================================="
    echo ""
    echo "Configuration:"
    echo "  Dashboard Namespace: ${DASHBOARD_NAMESPACE}"
    echo "  Model Registry Namespace: ${MODEL_REGISTRY_NAMESPACE}"
    echo "  Database Namespace: ${DATABASE_NAMESPACE}"
    echo "  Skip Operators: ${SKIP_OPERATORS}"
    echo "  Skip Database: ${SKIP_DATABASE}"
    echo "  Skip DSC: ${SKIP_DSC}"
    echo "  External DB: ${EXTERNAL_DB}"
    if [[ "${EXTERNAL_DB}" == "true" ]]; then
        echo "  DB Host: ${DB_HOST}"
        echo "  DB Port: ${DB_PORT}"
        echo "  DB Name: ${DB_NAME}"
        echo "  DB User: ${DB_USER}"
    fi
    echo ""

    check_prerequisites

    # Step 1: Install operators
    if [[ "${SKIP_OPERATORS}" != "true" ]]; then
        echo ""
        log_step "Step 1/6: Installing operators..."
        install_operators
    else
        log_info "Skipping operator installation (--skip-operators flag provided)"
    fi

    # Step 2: Setup Data Science Cluster
    if [[ "${SKIP_DSC}" != "true" ]]; then
        echo ""
        log_step "Step 2/6: Setting up Data Science Cluster..."
        setup_dsc
    else
        log_info "Skipping DSC setup (--skip-dsc flag provided)"
    fi

    # Step 3: Install database
    if [[ "${SKIP_DATABASE}" != "true" ]]; then
        echo ""
        log_step "Step 3/6: Installing MySQL database..."
        install_database
    else
        log_info "Skipping database installation (--skip-database or --external-db flag provided)"
    fi

    # Step 4: Create Model Registry
    echo ""
    log_step "Step 4/6: Creating Model Registry..."
    create_model_registry

    # Step 5: Enable in Dashboard
    echo ""
    log_step "Step 5/6: Enabling Model Registry in Dashboard..."
    enable_dashboard_model_registry

    # Step 6: Configure model catalog sources
    echo ""
    log_step "Step 6/6: Configuring model catalog sources..."
    configure_model_catalog_sources

    # Verify and test
    echo ""
    verify_installation

    echo ""
    test_model_registry

    echo ""
    log_info "Done!"
    echo ""
    echo "Model Registry setup is complete."
    echo ""
    echo "To verify the API manually, run:"
    echo "  export TOKEN=\$(oc whoami -t)"
    echo "  curl -k -H \"Authorization: Bearer \$TOKEN\" \$(oc get routes -n istio-system -l app.kubernetes.io/name=modelregistry-public -o jsonpath='{.items[0].status.ingress[0].host}' | xargs -I{} echo 'https://{}')/api/model_registry/v1alpha3/registered_models"
    echo ""
    echo "To re-run with different options:"
    echo "  $(basename "$0") --skip-operators --skip-database  # Skip already-installed components"
    echo "  $(basename "$0") --external-db --db-host <host>    # Use external database"
    echo ""
}

# Run main function
main "$@"
