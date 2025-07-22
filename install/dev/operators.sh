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
  local oc_url="$1"
  local oc_token="$2"
  local oc_user="$3"
  local oc_password="$4"

  log_info "Logging in to existing OpenShift cluster..."

  if [ -z "$oc_url" ]; then
    log_error "OC_URL environment variable is not set. Please provide the OpenShift API URL."
    exit 1
  fi

  if [ -z "$oc_token" ] && { [ -z "$oc_user" ] || [ -z "$oc_password" ]; }; then
    log_error "OC_TOKEN or OC_USER and OC_PASSWORD environment variables are not set. Please provide authentication details."
    exit 1
  fi

  if [ -n "$oc_token" ]; then
    if ! oc login --token="$oc_token" --server="$oc_url" --insecure-skip-tls-verify=true; then
      log_error "Failed to login to OpenShift cluster with token."
      exit 1
    fi
  elif [ -n "$oc_user" ] && [ -n "$oc_password" ]; then
    if ! oc login "$oc_url" -u "$oc_user" -p "$oc_password" --insecure-skip-tls-verify=true; then
      log_error "Failed to login to OpenShift cluster with username and password."
      exit 1
    fi
  fi

  log_success "Logged in to OpenShift cluster successfully."
}

verify_operator_installation() {
  local operators=("$@")

  log_info "Verifying installation of operators: ${operators[*]}"

  local retries=60
  local warning_threshold=30
  local wait_time=10

  sleep 5

  while [ $retries -gt 0 ]; do
    log_info "Checking operator CSV phases... (attempts remaining: $retries)"

    if [ "$retries" == "$warning_threshold" ]; then
      log_warning "Some operators may not have minimum availability. Please check the operator status in the OpenShift console."
    fi

    local failed_operators=()
    local missing_operators=()
    local succeeded_operators=()

    for operator in "${operators[@]}"; do
      local csv_info
      csv_info=$(oc get csv -A --no-headers 2>/dev/null | grep "$operator" | head -n1)

      if [ -n "$csv_info" ]; then
        local csv_status=$(echo "$csv_info" | awk '{print $NF}')
        local namespace=$(echo "$csv_info" | awk '{print $1}')

        case "$csv_status" in
        "Succeeded")
          succeeded_operators+=("$operator")
          ;;
        "Failed" | "InstallCheckFailed")
          failed_operators+=("$operator")
          log_error "$operator: $csv_status (in $namespace)"
          ;;
        *)
          log_info "$operator: $csv_status (in $namespace)"
          ;;
        esac
      else
        missing_operators+=("$operator")
      fi
    done

    if [ ${#failed_operators[@]} -gt 0 ]; then
      log_error "The following operators failed to install: ${failed_operators[*]}"
      exit 1
    fi

    if [ ${#succeeded_operators[@]} -eq ${#operators[@]} ]; then
      log_info "All required operators installed successfully (${#succeeded_operators[@]}/${#operators[@]}): ${succeeded_operators[*]}"
      return 0
    fi

    if [ ${#missing_operators[@]} -gt 0 ]; then
      log_info "Still waiting for operators: ${missing_operators[*]}"
    fi

    log_info "Operators status: ${#succeeded_operators[@]}/${#operators[@]} ready"
    sleep $wait_time
    retries=$((retries - 1))
  done

  log_error "Operator installation verification failed after timeout."
  log_info "Current operator status for required operators:"
  for operator in "${operators[@]}"; do
    local csv_info
    csv_info=$(oc get csv -A --no-headers 2>/dev/null | grep "$operator" | head -n1 || echo "$operator: Not Found")
    log_info "  $csv_info"
  done
  exit 1
}

check_operators_ready() {
  local operators=("$@")

  for operator in "${operators[@]}"; do
    local csv_info
    csv_info=$(oc get csv -A --no-headers 2>/dev/null | grep "$operator" | head -n1)

    if [ -z "$csv_info" ]; then
      return 1
    fi

    local csv_status
    csv_status=$(echo "$csv_info" | awk '{print $NF}')

    if [ "$csv_status" != "Succeeded" ]; then
      return 1
    fi
  done

  return 0
}

# to add/change installed operators, edit ./install/dev/operators.yml and add the operator name to the local operators array
install_cluster_operators() {
  log_info "Installing OpenShift Data Hub operators..."

  local debug_help="Try going to your cluster operator page, Open Data Hub, deleting the DSC, DSCI, and Auth objects, and reinstalling the DSCI, then DSC (in that order). Your cluster also might be limited in resources."

  local operators=("opendatahub-operator" "authorino-operator" "serverless-operator" "servicemeshoperator")

  if check_operators_ready "${operators[@]}"; then
    log_info "All required operators are already installed and ready. Skipping installation."
  else
    log_info "Installing operators..."
    if ! oc apply -f ./install/dev/operators.yml; then
      log_error "Failed to install operators."
      exit 1
    fi
    verify_operator_installation "${operators[@]}"
  fi

  # Following code installs and verifies the DSCI and DSC custom resources in the ODH operator
  local odh_csv_name
  odh_csv_name=$(oc get csv -A -o name | grep opendatahub-operator | head -n1)
  if [ -z "$odh_csv_name" ]; then
    log_error "Could not find opendatahub-operator CSV after installation"
    exit 1
  fi

  local odh_namespace
  odh_namespace=$(oc get csv -A --no-headers | grep opendatahub-operator | head -n1 | awk '{print $1}')
  log_info "ODH CSV Name: $odh_csv_name in namespace: $odh_namespace"

  if ! oc get csv "${odh_csv_name#*/}" \
    -n "$odh_namespace" \
    -o jsonpath='{.metadata.annotations.alm-examples}' | yq '.[1]' -p json -o yaml >/tmp/dsci.yml; then
    log_error "Failed to get Data Science Cluster Initialization (DSCI) file."
    exit 1
  fi

  if ! oc get csv "${odh_csv_name#*/}" \
    -n "$odh_namespace" \
    -o jsonpath='{.metadata.annotations.alm-examples}' | yq '.[0]' -p json -o yaml >/tmp/dsc.yml; then
    log_error "Failed to get Data Science Cluster (DSC) file."
    exit 1
  fi

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

  log_success "OpenShift Data Hub operators and custom resources installed successfully."
}

wait_for_cluster() {
  log_info "Waiting for cluster connection..."

  local retries=30
  while [ $retries -gt 0 ]; do
    if oc status >/dev/null 2>&1; then
      log_info "Cluster is ready."
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
  local oc_project="$1"

  log_info "Setting OpenShift project to $oc_project..."

  if ! oc project "$oc_project"; then
    log_error "Failed to set OpenShift project to $oc_project."
    exit 1
  fi

  log_info "OpenShift project set to $oc_project."
}

setup_environment() {
  local oc_cluster_type="$1"
  local oc_url="$2"
  local oc_token="$3"
  local oc_user="$4"
  local oc_password="$5"
  local oc_project="$6"

  log_info "Setting up OpenShift environment..."

  if [ "$oc_cluster_type" = "crc" ]; then
    login_to_cluster "$oc_url" "$oc_token" "$oc_user" "$oc_password"
  else
    login_to_cluster "$oc_url" "$oc_token" "$oc_user" "$oc_password"
  fi

  wait_for_cluster
  install_cluster_operators

  set_project "$oc_project"

  log_success "ODH Dashboard environment setup complete."
}
