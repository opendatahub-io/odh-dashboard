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
  if [ $1 == "crc" ]; then
    log_info "Using CRC for oc. Skipping oc setup setup."
  elif [ -f "/tmp/oc-cli.tar.gz" ]; then
    log_info "Found oc CLI tarball at /tmp/oc-cli.tar.gz"
    tar -xzf /tmp/oc-cli.tar.gz -C /opt/oc/
    chmod +x /opt/oc/oc /opt/oc/kubectl
    log_success "OpenShift CLI (oc) installed successfully."
  elif command -v oc >/dev/null 2>&1; then
    log_success "oc CLI already installed at ${NC}$(command -v oc)${NC}."
  else
    log_warning "No oc CLI not found. Please provide oc-cli.targ.gz or install oc CLI manually."
  fi
}

# setup CRC
setup_crc() {
  log_info "Setting up CodeReady Containers (CRC)..."

  if [ ! -f "/opt/crc/crc" ]; then
    log_info "Downloading CRC..."
    CRC_VERSION="2.52"
    CRC_URL="https://mirror.openshift.com/pub/openshift-v4/clients/crc/${CRC_VERSION}/crc-linux-amd64.tar.xz"

    curl -L "$CRC_URL" -o /tmp/crc.tar.xz
    tar -xf /tmp/crc.tar.xz -C /tmp
    mv /tmp/crc-linux-$CRC_VERSION-amd64/crc /opt/crc/
    chmod +x /opt/crc/crc
    rm -rf /tmp/crc*

    log_success "CRC installed successfully at /opt/crc/crc"

  fi

  if [ -n "$CRC_PULL_SECRET_PATH" ] && [ -f "CRC_PULL_SECRET_PATH" ]; then
    log_info "Setting up CRC with pull secret..."
    /opt/crc/crc config set pull-secret-file "$CRC_PULL_SECRET_PATH"
  else
    log_warning "No pull secret provided. You'll need to set it up manually."
  fi

  # might need to add configuration for CRC for resource limits
  /opt/crc/crc setup

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
    exit 1

  fi

  log_success "Logged in to OpenShift cluster successfully."
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
