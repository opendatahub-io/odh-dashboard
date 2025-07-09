#!/bin/bash

set -e

# source operators script for local setup
. ./install/dev/operators.sh

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

ARCH=$(uname -m)

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

log_step() {
  echo -e "${CYAN}[STEP]${NC} $1"
}

container_check_prerequisites() {
  log_step "Checking prerequisites..."

  local missing_tools=()

  if ! command -v docker >/dev/null 2>&1 && ! command -v podman >/dev/null 2>&1; then
    missing_tools+=("Docker or Podman")
  fi

  if ! docker compose >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
    missing_tools+=("Docker Compose")
  fi

  # check for node and npm

  if [ ${#missing_tools[@]} -gt 0 ]; then
    log_error "Missing prerequisites: ${missing_tools[*]}"
    log_info "Please install the missing tools before proceeding."
    exit 1
  fi

  log_success "All prerequisites are met."
}

container_create_env_file() {
  log_step "Creating environment files..."

  local local_env_file=".env.local"
  local oc_url=""
  local oc_token=""
  local oc_user=""
  local oc_password=""
  local oc_project="opendatahub"
  local crc_pull_secret_path=""
  local oc_cli_tarball=""
  local container_builder
  # local container_development="false"

  # echo ""
  # echo "Develop environment in containers or locally?"
  # echo "1) Container (Docker or Podman)"
  # echo "2) Local (without containers)"
  # while true; do
  #   read -p "Enter your choice (1 or 2): " dev_choice
  #   case $dev_choice in
  #   1)
  #     log_info "Using container setup"
  #     container_development="true"
  #     break
  #     ;;
  #   2)
  #     log_info "Using local setup"
  #     container_development="false"
  #     break
  #     ;;
  #   *)
  #     echo "Please enter 1 or 2"
  #     ;;
  #   esac
  # done
  # case $SETUP_CHOICE in
  #   "local")
  #     container_development="false"
  #   ""

  # Ask user for cluster type
  echo ""
  echo "Which OpenShift setup would you like to use?"
  echo "1) Local CRC (CodeReady Containers)"
  echo "2) Existing OpenShift cluster"
  echo ""
  while true; do
    read -p "Enter your choice (1 or 2): " choice
    case $choice in
    1)
      cluster_type="crc"
      log_info "Using local CRC setup"
      break
      ;;
    2)
      cluster_type="existing"
      log_info "Using existing OpenShift cluster"
      break
      ;;
    *)
      echo "Please enter 1 or 2"
      ;;
    esac
  done

  if [ "$cluster_type" == "crc" ]; then
    echo ""
    while true; do
      read -e -p "Enter the path (absolute or relative) to your CRC pull secret file: " crc_pull_secret_path
      echo "$crc_pull_secret_path"
      if [ -f "$crc_pull_secret_path" ]; then
        crc_pull_secret_path=$(realpath "$crc_pull_secret_path")
        log_success "Pull secret file found at: $crc_pull_secret_path"
        break
      else
        log_error "Pull secret file not found at: $crc_pull_secret_path"
        echo "Please enter a valid path to your CRC pull secret file."
      fi
    done
  else
    # Existing cluster setup
    echo ""
    read -p "Enter your OpenShift cluster URL (e.g., https://api.cluster.example.com:6443): " oc_url

    # get oc cli tarball
    # echo ""
    # echo "Enter the path to your OpenShift CLI (oc)"
    #
    # while true; do
    #   read -e -p "Path: " oc_cli_tarball
    #   if [ -f "$oc_cli_tarball" ]; then
    #     oc_cli_tarball=$(realpath "$oc_cli_tarball")
    #     log_success "OC CLI tarball found at: $oc_cli_tarball"
    #     break
    #   else
    #     log_error "OC CLI tarball not found at: $oc_cli_tarball"
    #     echo "Please enter a valid path to your OpenShift CLI tarball."
    #   fi
    # done

    echo ""
    echo "Authentication method:"
    echo "1) Username/Password"
    echo "2) Token"
    echo ""
    while true; do
      read -p "Enter your choice (1 or 2): " auth_choice
      case $auth_choice in
      1)
        read -p "Enter your OpenShift username: " oc_user
        read -s -p "Enter your OpenShift password: " oc_password
        echo ""
        break
        ;;
      2)
        read -s -p "Enter your OpenShift token: " oc_token
        echo ""
        break
        ;;
      *)
        echo "Please enter 1 or 2"
        ;;
      esac
    done

    echo ""
    read -p "Enter the OpenShift project name (default: opendatahub): " oc_project
    if [ -n "$oc_project" ]; then
      log_info "Using project: $oc_project"
    else
      oc_project="opendatahub"
      log_info "Using default project: $oc_project"
    fi
  fi

  # check container builder
  if [ -n "$CONTAINER_BUILDER" ]; then
    log_info "Container builder set to: $CONTAINER_BUILDER"
    container_builder="$CONTAINER_BUILDER"
  elif command -v docker >/dev/null 2>&1; then
    container_builder="docker"
    log_info "Using Docker as container builder"
  elif command -v podman >/dev/null 2>&1; then
    container_builder="podman"
    log_info "Using Podman as container builder"
  fi

  # overwrite or append to .env.local file
  if [ -f "$local_env_file" ]; then
    echo ""
    log_warning "Warning: $local_env_file already exists."

    read -r -p "Do you want to overwrite it (appends otherwise)? (y/N): " overwrite_response

    if [ "$overwrite_response" == "y" ] || [ "$overwrite_response" == "Y" ]; then
      log_info "Overwriting $local_env_file"
      # create or append to .env.local file
      cat >"$local_env_file" <<EOF

# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$cluster_type
OC_PROJECT=$oc_project

EOF
    else
      log_info "Appending to $local_env_file"
      cat >>"$local_env_file" <<EOF
# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$cluster_type
OC_PROJECT=$oc_project

EOF
    fi
  else
    cat >"$local_env_file" <<EOF
# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$cluster_type
OC_PROJECT=$oc_project

EOF
  fi

  if [ "$cluster_type" == "crc" ]; then
    cat >>"$local_env_file" <<EOF
# CRC Configuration
CRC_PULL_SECRET_PATH=$crc_pull_secret_path

EOF

  else
    cat >>"$local_env_file" <<EOF
# Existing Cluster Configuration
OC_URL=$oc_url
OC_CLI_TARBALL=$oc_cli_tarball
EOF

    if [ -n "$oc_token" ]; then
      cat >>"$local_env_file" <<EOF
OC_TOKEN=$oc_token
EOF
    fi

    if [ -n "$oc_user" ]; then
      cat >>"$local_env_file" <<EOF
OC_USER=$oc_user
OC_PASSWORD=$oc_password
EOF
    fi
    cat >>"$local_env_file" <<EOF

EOF
  fi

  cat >>"$local_env_file" <<EOF
# Development Configuration
NODE_ENV=development
NODE_TLS_REJECT_UNAUTHORIZED=0

# Docker Configuration
CONTAINER_BUILDER=${container_builder}

# Start Command
START_COMMAND="cd frontend && npm run start:dev:ext"
EOF

  log_success "Environment file created at: ${YELLOW}$local_env_file${NC}"

}

container_show_completed_message() {
  echo ""
  echo "Setup completed successfully!"
  echo ""
  echo "Next steps:"
  echo -e "1. Check your environment variables in ${YELLOW}.env.local${NC} file and make sure they are correct."
  echo -e "   Change the START_COMMAND variable in ${YELLOW}.env.local${NC} if you want to use a different command to start the development environment."
  echo -e "   Add a ${YELLOW}.env.development.local${NC} file if you need any variables for development."
  echo ""
  echo "2. Start the development environment. Please ensure your container environment allows host network binding (i.e. https://docs.docker.com/engine/network/drivers/host/):"
  echo -e "   ${CYAN}docker compose --env-file=.env.local up --watch${NC} (use --build to rebuild images)"
  echo -e "   Stop with ${CYAN}docker compose down${NC}"
  echo -e "   Stop with ${CYAN}docker compose down -v${NC} to remove volumes"
  echo ""
  echo "3. Access the dashboard at:"
  echo -e "   ${CYAN}http://localhost:4010${NC}"
  echo ""
  echo "4. For local development without Docker:"
  echo -e "   - Backend: ${CYAN}cd backend && npm run start:dev${NC}"
  echo -e "   - Frontend: ${CYAN}cd frontend && npm run start:dev${NC}"
  echo -e "   - Frontend-only: ${CYAN}cd frontend && npm run start:dev:ext${NC}"
}

# --- Local setup steps ---
local_check_prerequisities() {
  # requires oc, tar, node, npm

  local required_tools=("tar" "node" "npm" "yq")
  local missing_tools=()

  for tool in "${required_tools[@]}"; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      missing_tools+=("$tool")
    fi
  done

  if [ "${#missing_tools[@]}" -gt 0 ]; then
    log_error "Missing required tools: ${missing_tools[*]}"
    log_info "Please install the missing tools before proceeding."
    exit 1
  fi
}

local_setup_oc() {
  # check if oc is installed and ask to install if not
  if ! command -v oc >/dev/null 2>&1; then
    local install_oc
    log_error "OpenShift CLI (oc) is not installed."
    read -p "Do you want to install it now into /usr/local/bin (requires root privilege)? (y/N): " install_oc

    if [ "$install_oc" == "y" ] || [ "$install_oc" == "Y" ]; then
      log_info "Installing OpenShift CLI (oc)..."

      case "${ARCH}" in
      amd64 | x86_64) OCP_ARCH="openshift-client-linux" ;;
      arm64 | aarch64) OCP_ARCH="openshift-client-linux-arm64" ;;
      *) echo "Unsupported architecture: ${ARCH}" && exit 1 ;;
      esac

      sudo wget -qO- "https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/${OCP_ARCH}.tar.gz" | sudo tar zxv -C /usr/local/bin/ oc kubectl

      log_success "OpenShift CLI (oc) installed successfully in /usr/local/bin"

    else
      log_error "Cannot proceed without OpenShift CLI (oc). Please install OpenShift CLI manually or through this script. Exiting."
      exit 1
    fi
  fi

  # check if oc is logged in to a cluster
  if ! oc cluster-info >/dev/null 2>&1; then
    log_error "OpenShift CLI (oc) is not logged in to a cluster."
    read -p "Do you want to log in now? (y/N): " login_oc

    if [ -n "$OC_URL" ] && [ -n "$OC_USER" ] && [ -n "$OC_PASSWORD" ]; then
      log_info "Using existing OpenShift cluster credentials from environment variables."
      return
    elif [ -n "$OC_URL" ] && [ -n "$OC_TOKEN" ]; then
      log_info "Using existing OpenShift token from environment variable."
      return
    elif [ "$login_oc" == "y" ] || [ "$login_oc" == "Y" ]; then
      log_info "Logging in to OpenShift cluster..."
    else
      log_error "Cannot proceed without logging in to OpenShift cluster. Please login manually or via this script. Exiting."
      exit 1
    fi

    if [ "$login_oc" == "y" ] || [ "$login_oc" == "Y" ]; then
      read -p "Enter your OpenShift cluster API URL (e.g. https://api.xxx.openshiftapps.com:443) " oc_url
      read -p "Enter your OpenShift username: " oc_user
      read -s -p "Enter your OpenShift password: " oc_password
      echo ""

      export OC_URL="$oc_url"
      export OC_USER="$oc_user"
      export OC_PASSWORD="$oc_password"
    else
      log_error "Cannot proceed without logging in to OpenShift cluster. Please login manually or via this script. Exiting."
      exit 1
    fi
  else
    local cluster_info
    cluster_info=$(oc cluster-info)
    log_info "OpenShift CLI (oc) is already logged in to a cluster. Use oc login to switch clusters."
    log_info "$cluster_info"
  fi

  log_success "OpenShift CLI (oc) setup successful."

}

local_setup_cluster() {
  # uses functions from install/dev/operators.sh
  setup_environment
}

local_install_node_dependencies() {
  log_step "Installing Node.js dependencies and building project..."

  local install_node_deps
  read -p "Install Node.js dependencies and build project? (y/N): " install_node_deps

  if [ "$install_node_deps" != "y" ] && [ "$install_node_deps" != "Y" ]; then
    log_info "Skipping Node.js dependencies installation."
    return
  fi

  npm install
  npm run build

  # if [ ! -d "backend/node_modules" ]; then
  #   log_info "Installing backend dependencies..."
  #   (cd backend && npm install)
  # else
  #   log_success "Backend dependencies already installed."
  # fi
  #
  # if [ ! -d "frontend/node_modules" ]; then
  #   log_info "Installing frontend dependencies..."
  #   (cd frontend && npm install)
  # else
  #   log_success "Frontend dependencies already installed."
  # fi

  log_success "Node.js dependencies installed successfully."
}

local_show_completed_message() {
  echo ""
  echo "Setup completed successfully!"
  echo ""
  echo "Next steps:"
  echo -e "1. ${CYAN}npm install && npm run build${NC} if not done automatically."
  echo "2. Start the development environment:"
  echo -e "   ${CYAN}cd frontend && npm run start:dev:ext${NC}"
  echo -e "   ${CYAN}npm run dev${NC}"
  echo ""
  echo "3. Access the dashboard at:"
  echo -e "   ${CYAN}http://localhost:4010${NC}"
}

main() {
  echo "OpenDataHub Dashboard Development Setup"
  read -p "Would you like to develop locally or in a container? (container/local) [default: local]: " SETUP_CHOICE

  if [ -z "$SETUP_CHOICE" ]; then
    SETUP_CHOICE="local"
  fi

  case $SETUP_CHOICE in
  "container")
    log_info "Using container setup"
    container_check_prerequisites
    container_create_env_file
    container_show_completed_message
    ;;
  "local")
    log_info "Using local setup"
    local_check_prerequisities
    local_setup_oc
    local_setup_cluster
    local_install_node_dependencies
    local_show_completed_message
    ;;
  *)
    log_error "Invalid setup type: $SETUP_CHOICE"
    log_info "Usage: $0 [container|local]"
    exit 1
    ;;
  esac

  # TODO: install node deps

}

main "@"
