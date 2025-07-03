#!/bin/bash

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# check if oc binary exists and copy if provided
setup_oc_cli() {
  log_info "Setting up OpenShift CLI (oc)..."

  if [ "${OC_CLUSTER_TYPE}" == "crc" ]; then
    log_info "Using CRC for oc. Skipping oc setup setup."
  elif command -v oc >/dev/null 2>&1; then
    log_success "oc CLI already installed at ${NC}$(command -v oc)${NC}."
  elif [ -f "/tmp/oc-cli.tar.gz" ]; then
    log_info "Found oc CLI tarball at /tmp/oc-cli.tar.gz"
    tar -xzf /tmp/oc-cli.tar.gz -C /opt/oc/
    chmod +x /opt/oc/oc /opt/oc/kubectl
    log_success "OpenShift CLI (oc) installed successfully."
  else
    log_warning "No oc CLI not found. Please provide oc-cli.targ.gz or install oc CLI manually."
  fi
}

# setup CRC
setup_crc() {
  log_info "Setting up CodeReady Containers (CRC)..."

  # if no crc binary
  if [ ! -f "/opt/crc/crc" ]; then
    log_info "Downloading CRC..."
    CRC_VERSION="${CRC_VERSION-latest}"
    CRC_URL="${CRC_URL-https://mirror.openshift.com/pub/openshift-v4/clients/crc/${CRC_VERSION}/crc-linux-amd64.tar.xz}"

    if ! wget --show-progress=off "$CRC_URL" -O /tmp/crc.tar.xz; then
      log_error "Failed to download CRC from $CRC_URL"
      exit 1
    fi

    tar -xf /tmp/crc.tar.xz -C /tmp
    mv /tmp/crc-linux-"$CRC_VERSION"-amd64/crc /opt/crc/
    chmod +x /opt/crc/crc
    rm -rf /tmp/crc*

    log_success "CRC installed successfully at /opt/crc/crc"

  fi

  if [ -n "$CRC_PULL_SECRET_PATH" ] && [ -f "CRC_PULL_SECRET_PATH" ]; then
    log_info "Setting up CRC with pull secret..."
    /opt/crc/crc config set pull-secret-file "$CRC_PULL_SECRET_PATH"
  else
    log_error "No pull secret provided. Please set CRC_PULL_SECRET_PATH environment variable to your pull secret file."
    exit 1
  fi

  # might need to add configuration for CRC for resource limits
  # /opt/crc/crc config set cpus 4
  # /opt/crc/crc config set memory 8192
  # /opt/crc/crc config set disk-size 30

  if ! /opt/crc/crc setup; then
    log_error "CRC setup failed. Please check your configuration."
    exit 1
  fi

  log_success "CRC configured successsfully."
}

# Login to OpenShift cluster
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

    if [ -z "$OC_TOKEN" ] || [ -z "$OC_USER" ] && [ -z "$OC_PASSWORD" ]; then
      log_error "OC_TOKEN or OC_USER and OC_PASSWORD environment variables are not set. Please provide authentication details."
      exit 1
    fi

    if ! make login; then
      log_error "Failed to login to OpenShift cluster at $OC_URL."
      exit 1
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

# install operators
install_cluster_operators() {
  log_info "Installing OpenShift Data Hub operators..."

  # Example: Install ODH operator
  if ! oc apply -f /path/to/odh-operator.yaml; then
    log_error "Failed to install ODH operator."
    exit 1
  fi

  log_success "OpenShift Data Hub operators installed successfully."
}

# set project
set_project() {
  log_info "Setting OpenShift project to $OC_PROJECT..."

  if ! oc project "$OC_PROJECT"; then
    log_error "Failed to set OpenShift project to $OC_PROJECT."
    exit 1
  fi

  log_success "OpenShift project set to $OC_PROJECT."
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

# install operators

# Setup OpenShift CLI and CRC
setup_environment() {
  log_info "Setting up ODH Dashboard environment..."

  setup_oc_cli

  if [ "$OC_CLUSTER_TYPE" = "crc" ]; then
    setup_crc
    login_to_cluster "crc"
  else
    login_to_cluster "existing"
  fi

  wait_for_cluster
  install_cluster_operators

  log_success "ODH Dashboard environment setup complete."
}

install_node_dependencies() {
  log_info "Installing Node.js dependencies..."

  if [ ! -d "node_modules" ]; then
    npm install
  fi

  log_success "Node.js dependencies installed successfully."
}

# main
case "${1:-dev}" in
"setup")
  setup_environment
  ;;
"dev")
  if ! oc cluster-info >/dev/null 2>&1; then
    log_error "No OpenShift cluster found. running setup..."
    setup_environment
  fi

  log_info "Starting development environment..."

  install_node_dependencies

  exec npm run dev
  ;;
"bash")
  exec /bin/bash
  ;;
*)
  "Unknown command: $1"
  log_info "Available commands: setup, dev, bash"
  exit 1
  ;;

esac
