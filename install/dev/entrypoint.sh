#!/bin/bash

set -e

. ./install/dev/operators.sh

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# add to packages array to add packages to install
install_system_packages() {
  log_info "Installing system packages..."

  local packages=("wget" "tar" "curl" "git")
  local missing_packages=()

  for package in "${packages[@]}"; do
    if ! rpm -q "$package" >/dev/null 2>&1; then
      missing_packages+=("$package")
    fi
  done

  if [ ${#missing_packages[@]} -gt 0 ]; then
    log_info "Missing packages: ${missing_packages[*]}"

    if ! dnf update -y -q; then
      log_error "Failed to update system packages."
      exit 1
    fi

    if ! dnf install -y -q "${missing_packages[@]}"; then
      log_error "Failed to install system packages."
      exit 1
    fi

    log_success "System packages installed successfully."
  else
    log_info "All system packages already installed."
  fi

  if ! id -u 1001 >/dev/null 2>&1; then
    log_warning "UID 1001 not found. Creating user with UID 1001..."
    useradd -u 1001 -m -s /bin/bash default
  fi

  mkdir -p /app/odh-dashboard /opt/crc /opt/oc /opt/app-root/src/.kube &&
    chown -R 1001:0 /app /opt/crc /opt/oc /opt/app-root/src/.kube &&
    chmod -R g=u /app /opt/crc /opt/oc /opt/app-root/src/.kube
}

setup_oc_cli() {
  local oc_cluster_type="$1"

  log_info "Setting up OpenShift CLI (oc)..."
  echo "$oc_cluster_type"

  if [ "${oc_cluster_type}" == "crc" ]; then
    log_info "Using CRC for oc. Skipping oc setup setup."
  elif command -v oc >/dev/null 2>&1; then
    log_success "oc CLI already installed at ${NC}$(command -v oc)${NC}."
  elif [ -f "/tmp/oc-cli.tar.gz" ]; then
    log_info "Found oc CLI tarball at /tmp/oc-cli.tar.gz"
    tar -xzf /tmp/oc-cli.tar.gz -C /opt/oc/
    chmod +x /opt/oc/oc /opt/oc/kubectl

    ln -sf /opt/oc/oc /usr/local/bin/oc
    ln -sf /opt/oc/kubectl /usr/local/bin/kubectl
    log_success "OpenShift CLI (oc) installed successfully."
  else
    log_error "No oc CLI not found. Please provide oc-cli.targ.gz or install oc CLI manually."
    exit 1
  fi
}

install_node_dependencies() {
  log_info "Installing Node.js dependencies..."

  npm install

  log_success "Node.js dependencies installed successfully."
}

if ! oc cluster-info >/dev/null 2>&1; then
  log_info "No OpenShift cluster found. running setup..."

  setup_environment "${OC_CLUSTER_TYPE}" "${OC_URL}" "${OC_TOKEN}" "${OC_USER}" "${OC_PASSWORD}" "${OC_PROJECT}"
fi

log_info "Starting ${NODE_ENV} environment..."
case "${1:-dev}" in
"dev")
  npm run dev
  ;;
"frontend-start:dev:ext")
  cd frontend && npm run start:dev:ext
  ;;
*)
  log_info "Using $1 as the start command."
  eval "$1"
  ;;

esac
