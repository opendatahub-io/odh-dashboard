#!/bin/bash

set -e

ALIAS=operator.sh

log_info() {
  echo -e "${BLUE}${ALIAS} | [INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}${ALIAS} | [SUCCESS]${NC} $1"
}

log_error() {
  echo -e "${RED}${ALIAS} | [ERROR]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}${ALIAS} | [WARNING]${NC} $1"
}

login_to_cluster() {
  local cluster_type="$1"

  if [ "$cluster_type" = "crc" ]; then
    log_info "Starting CRC cluster..."

    # if not already started, start
    if ! /opt/crc/crc status | grep -q "Running"; then
      log_info "Starting CRC cluster (this may take a while)..."
      /opt/crc/crc start
    fi

    # get CRC credentials and login
    /opt/crc/crc oc-env
    oc login -u developer -p developer https://api.crc.testing:6443

  else
    # login to existing cluster with oc cli
    log_info "Logging in to existing OpenShift cluster..."

    if [ -z "$OC_URL" ]; then
      log_error "OC_URL environment variable is not set. Please provide the OpenShift API URL."
      exit 1
    fi

    if [ -z "$OC_TOKEN" ] && { [ -z "$OC_USER" ] || [ -z "$OC_PASSWORD" ]; }; then
      log_error "OC_TOKEN or OC_USER and OC_PASSWORD environment variables are not set. Please provide authentication details."
      exit 1
    fi

    if [ -z "$OC_TOKEN" ]; then
      if ! oc login "$OC_URL" -u "$OC_USER" -p "$OC_PASSWORD" --insecure-skip-tls-verify=true; then
        log_error "Failed to login to OpenShift cluster with username and password."
        exit 1
      fi
    elif [ -n "$OC_USER" ] && [ -n "$OC_PASSWORD" ]; then
      if ! oc login "$OC_URL" -u "$OC_USER" -p "$OC_PASSWORD" --insecure-skip-tls-verify=true; then
        log_error "Failed to login to OpenShift cluster with username and password."
        exit 1
      fi
    fi

    # if [ -n "$OC_TOKEN" ]; then
    #   log_info "Using OC_TOKEN for authentication..."
    #   # if ! oc login "$OC_URL" --token="$OC_TOKEN"; then
    #   #   log_error "Failed to login to OpenShift cluster with token."
    #   #   exit 1
    #   # fi
    #   if ! make login
    # elif [ -n "$OC_USER" ] && [ -n "$OC_PASSWORD" ]; then
    #   log_info "Using OC_USER and OC_PASSWORD for authentication..."
    #   if ! oc login "$OC_URL" -u "$OC_USER" -p "$OC_PASSWORD"; then
    #     log_error "Failed to login to OpenShift cluster with username and password."
    #     exit 1
    #   fi
    # else
    #   log_error "No authentication method provided. Please set OC_TOKEN or OC_USER and OC_PASSWORD environment variables."
    #   exit 1
    # fi

  fi

  log_success "Logged in to OpenShift cluster successfully."
}

# verify operator installation
# TODO: Make checking more robust
# this can use oc wait or grep search for Succeeded condition
verify_operator_installation() {
  log_info "Verifying operator installation..."

  # Wait for all CSVs to be in Succeeded phase
  log_info "Waiting for ClusterServiceVersions to be ready..."

  # Fallback: check CSV phases directly
  local retries=60
  local wait_time=10

  sleep 5

  while [ $retries -gt 0 ]; do
    log_info "Checking CSV phases... (attempts remaining: $retries)"

    # Check if any CSVs are in Failed state
    if oc get csv --no-headers 2>/dev/null | grep -q "Failed\|InstallCheckFailed"; then
      log_error "Some operators failed to install:"
      oc get csv -A --no-headers 2>/dev/null | grep "Failed\|InstallCheckFailed"
      exit 1
    fi

    # Count CSVs in Succeeded phase
    local csv_count
    local total_csv
    csv_count=$(oc get csv --no-headers 2>/dev/null | grep -c "Succeeded" || echo "0")
    total_csv=$(oc get csv --no-headers 2>/dev/null | wc -l || echo "0")

    if [ "$csv_count" -eq "$total_csv" ] && [ "$total_csv" -gt 0 ]; then
      log_success "All operators installed successfully ($csv_count/$total_csv)."
      return 0
    fi

    log_info "Operators still installing... ($csv_count/$total_csv ready)"
    sleep $wait_time
    retries=$((retries - 1))
  done

  log_error "Operator installation verification failed after timeout."
  log_info "Current operator status:"
  oc get csv -A --no-headers 2>/dev/null || log_error "Unable to get CSV status"
  exit 1
}

# install operators
install_cluster_operators() {
  log_info "Installing OpenShift Data Hub operators..."

  local debug_help="Try going to your cluster operator page, Open Data Hub, deleting the DSC, DSCI, and Auth objects, and reinstalling the DSCI, then DSC (in that order). Your cluster also might be limited in resources."

  local operators=("opendatahub-operator" "authorino-operator" "serverless-operator" "servicemeshoperator")
  local expected_operators=${#operators[@]}
  local missing_operators=()

  for operator in "${operators[@]}"; do
    if ! oc get csv -n openshift-operators | grep -q "$operator"; then
      missing_operators+=("$operator")
    fi
  done

  if [ ${#missing_operators[@]} -eq 0 ]; then
    log_info "All expected operators are already installed."
    return 0
  fi

  # return 0

  if ! oc apply -f ./install/dev/operators.yml; then
    log_error "Failed to install operators."
    exit 1
  fi

  # verify installations
  verify_operator_installation "$expected_operators"

  local odh_csv_name=""
  odh_csv_name=$(oc get csv -n openshift-operators -o name | grep opendatahub-operator)
  log_info "ODH CSV Name: $odh_csv_name"

  # get default dsc and dsci files
  if ! oc get "$odh_csv_name" \
    -n openshift-operators \
    -o jsonpath='{.metadata.annotations.alm-examples}' | yq '.[1]' -p json -o yaml >/tmp/dsci.yml; then
    log_error "Failed to get Data Science Cluster Initialization (DSCI) file."
    exit 1
  fi

  if ! oc get "$odh_csv_name" \
    -n openshift-operators \
    -o jsonpath='{.metadata.annotations.alm-examples}' | yq '.[0]' -p json -o yaml >/tmp/dsc.yml; then
    log_error "Failed to get Data Science Cluster (DSC) file."
    exit 1
  fi

  # apply dsci, wait, and then dsc
  if oc get dscinitialization default-dsci >/dev/null 2>&1; then
    log_info "Found existing Data Science Cluster Initialization (DSCI). Not applying DSCI file again."
  else
    log_info "Applying DSCI file..."
    if ! oc apply -f /tmp/dsci.yml; then
      log_error "Failed to apply Data Science Cluster Initialization (DSCI) file."
      exit 1
    fi
  fi

  log_info "Waiting for Data Science Cluster Initialization (DSCI) to be ready..."
  if ! oc wait --for=jsonpath='{.status.phase}'=Ready --timeout=200s dscinitialization/default-dsci; then
    log_error "Data Science Cluster Initialization (DSCI) did not become ready in time."
    echo "$debug_help"
    exit 1
  fi

  if oc get datasciencecluster default-dsc >/dev/null 2>&1; then
    log_info "Found existing Data Science Cluster (DSC). Not applying DSC file again."
  else
    log_info "Applying DSC file."
    if ! oc apply -f /tmp/dsc.yml; then
      log_error "Failed to apply Data Science Cluster (DSC) file."
      exit 1
    fi
  fi

  # log_info "Waiting for Data Science Cluster (DSC) to be ready..."
  # if ! oc wait --for=condition=Ready --timeout=600s datasciencecluster/default-dsc -n openshift-operators; then
  #   log_error "Data Science Cluster (DSC) did not become ready in time."
  #   echo "$debug_help"
  #   exit 1
  # fi

  log_success "OpenShift Data Hub operators and custom resources installed successfully."
}

# Ping cluster connection
wait_for_cluster() {
  log_info "Waiting for cluster connection..."

  local retries=30
  while [ $retries -gt 0 ]; do
    if oc status >/dev/null 2>&1; then
      log_success "Cluster is ready."
      return 0
    fi
    log_info "Waiting for cluster to be ready..."
    sleep 5
    retries=$((retries - 1))
  done

  log_error "Failed to connect to cluster"
  exit 1
}

set_project() {
  log_info "Setting OpenShift project to $OC_PROJECT..."

  if ! oc project "$OC_PROJECT"; then
    log_error "Failed to set OpenShift project to $OC_PROJECT."
    exit 1
  fi

  log_success "OpenShift project set to $OC_PROJECT."
}

# Setup OpenShift CLI and CRC
setup_environment() {
  log_info "Setting up OpenShift environment..."

  # mkdir -p /app/odh-dashboard /opt/crc /opt/oc &&
  #   chown -R 1001:0 /app /opt/crc /opt/oc &&
  #   chmod -R g=u /app /opt/crc /opt/oc
  # install_system_packages

  # setup_oc_cli

  if [ "$OC_CLUSTER_TYPE" = "crc" ]; then
    setup_crc
    login_to_cluster "crc"
  else
    login_to_cluster "existing"
  fi

  wait_for_cluster
  install_cluster_operators

  set_project

  log_success "ODH Dashboard environment setup complete."
}
