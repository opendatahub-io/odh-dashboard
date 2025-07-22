#!/bin/bash

set -e

. ./install/dev/operators.sh

#### Globals ####
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m' # no color

PLATFORM=$(uname -s)
ARCH=$(uname -m)

SETUP_CHOICE=${SETUP_CHOICE:-""}
CONTAINER_BUILDER=${CONTAINER_BUILDER:-""}
LOCAL_ENV_FILE=${LOCAL_ENV_FILE:-".env.local"}
OCP_DOWNLOAD_BASE_URL="https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable"
NPM_START_COMMAND=${NPM_START_COMMAND:-""}
CRC_PULL_SECRET_PATH=${CRC_PULL_SECRET_PATH:-""}

OC_URL=${OC_URL:-""}
OC_USER=${OC_USER:-""}
OC_PASSWORD=${OC_PASSWORD:-""}
OC_PROJECT=${OC_PROJECT:-""}
OC_CLUSTER_TYPE=${OC_CLUSTER_TYPE:-""}

CRC_URL="https://console.redhat.com/openshift/create/local"
CRC_VERSION="latest"
CRC_BASE_DOWNLOAD_URL="https://developers.redhat.com/content-gateway/rest/mirror/pub/openshift-v4/clients/crc/${CRC_VERSION}"
CRC_DEFAULT_CLUSTER_ROUTE="https://api.crc.testing:6443"
CRC_DEFAULT_ADMIN_USER="kubeadmin"
CRC_DEFAULT_ADMIN_PASSWORD="password"

#### Logging Functions ####
log_info() {
  echo -e "${CYAN}$(printf "%-7s" "INFO")${NC} ${DIM}|${NC} $1"
}

log_success() {
  echo -e "${GREEN}$(printf "%-7s" "SUCCESS")${NC} ${DIM}|${NC} $1"
}

log_error() {
  echo -e "${RED}$(printf "%-7s" "ERROR")${NC} ${DIM}|${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}$(printf "%-7s" "WARNING")${NC} ${DIM}|${NC} $1"
}

log_step() {
  echo -e "${CYAN}$(printf "%-7s" "STEP")${NC} ${DIM}|${NC} $1"
}

#### Panic handling ####
trap handle_panic EXIT

handle_panic() {
  if [ "$OC_CLUSTER_TYPE" == "crc" ]; then
    log_error "An error occurred during the setup. Cleaning up CRC..."
    teardown_crc
  fi
}

#### Main functions ####
teardown_crc() {
  local confirm_teardown
  if ! crc status >/dev/null 2>&1; then
    log_warning "CRC cluster status could not be found because the cluster isn't started or the crc command could not be found. Run ${CYAN}crc status${NC} to check if you think this is a mistake."
    return
  fi

  if ! crc status | grep -q "Running"; then
    log_info "CRC is not running. No need to stop it."
    return
  fi

  read -r -p "Do you want to stop and delete the CRC cluster? [y/N]: " confirm_teardown
  if [ "${confirm_teardown}" != "y" ]; then
    log_info "Skipping CRC teardown."
    return
  fi
  if ! crc stop; then
    log_warning "CRC not stopped, use ${CYAN}crc stop${NC} manually."
  fi
  if ! crc delete; then
    log_warning "CRC not deleted, use ${CYAN}crc delete${NC} manually."
  fi
}

setup_crc() {
  local crc_pull_secret_path="$1"
  local crc_url="$2"
  local crc_default_cluster_route="$3"
  local crc_default_admin_user="$4"
  local crc_default_admin_password="$5"

  log_info "Setting up CodeReady Containers (CRC)..."

  if command -v crc >/dev/null 2>&1; then
    log_info "CRC is already installed."
    if [ -z "$crc_pull_secret_path" ]; then
      echo -e "Go to ${CYAN}\033]8;;${crc_url}\a${crc_url}\033]8;;\a${NC} to get your CodeReady Containers pull secret."
      while true; do
        read -e -p "Enter the path to your CRC pull secret file: " temp_crc_pull_secret_path
        crc_pull_secret_path="${temp_crc_pull_secret_path/#\~/$HOME}"
        crc_pull_secret_path=$(realpath "$crc_pull_secret_path")
        if [ -f "$crc_pull_secret_path" ]; then
          log_info "Pull secret file found at: $crc_pull_secret_path"
          break
        else
          log_error "Pull secret file not found at: $crc_pull_secret_path"
          echo "Please enter a valid path to your CRC pull secret file."
        fi
      done
    else
      log_info "Using existing CRC pull secret at: $crc_pull_secret_path"
    fi

    log_info "Starting CRC cluster. This may take a while..."
    OC_URL="$crc_default_cluster_route"
    OC_USER="$crc_default_admin_user"

    crc setup
    crc start --pull-secret-file "$crc_pull_secret_path"

    OC_PASSWORD=$(crc console --credentials | grep 'kubeadmin -p' | sed 's/.*-p \([^ ]*\).*/\1/')
    # export OC_PASSWORD
    CRC_PULL_SECRET_PATH="$crc_pull_secret_path"

    return 0

  else
    log_error "CRC is not installed or is not in PATH"
    local install_crc
    read -p "Do you want to install CRC now? [y/N]: " install_crc

    if [ ! "$install_crc" == "y" ] && [ ! "$install_crc" == "Y" ]; then
      log_error "Cannot proceed without CRC. Please install CRC manually or through this script. Exiting."
      exit 1
    fi
  fi

  log_info "Installing CodeReady Containers (CRC)..."

  echo ""
  echo -e "Go to ${CYAN}\033]8;;${crc_url}\a${crc_url}\033]8;;\a${NC} to get your CodeReady Containers pull secret."
  while true; do
    read -e -p "Enter the path to your CRC pull secret file: " temp_crc_pull_secret_path
    crc_pull_secret_path="${temp_crc_pull_secret_path/#\~/$HOME}"
    crc_pull_secret_path=$(realpath "$crc_pull_secret_path")
    if [ -f "$crc_pull_secret_path" ]; then
      log_info "Pull secret file found at: $crc_pull_secret_path"
      break
    else
      log_error "Pull secret file not found at: $crc_pull_secret_path"
      echo "Please enter a valid path to your CRC pull secret file."
    fi
  done

  case "${PLATFORM}" in
  "Darwin")
    log_info "Detected macOS platform, installing CRC for macOS..."
    local installer_file="crc-macos-installer.pkg"

    wget -O- "${CRC_BASE_DOWNLOAD_URL}/crc-macos-installer.pkg" >"/tmp/${installer_file}"
    log_info "Downloaded CRC installer to /tmp/${installer_file}"

    log_warning "sudo permission required to install CRC. You can also install manually by running the installer file located at /tmp/${installer_file}."
    sudo installer -pkg "/tmp/${installer_file}" -target /
    ;;
  "Linux")
    # incase crc exists but not in PATH
    if [ -f "$HOME/crc/crc" ]; then
      log_info "CRC binary found at $HOME/crc/crc. Adding to PATH."
      export PATH="$PATH:$HOME/crc"
    else
      log_info "Detected Linux platform, installing CRC for Linux..."
      local installer_file

      case "$ARCH" in
      x86_64 | amd64)
        log_info "Detected x86_64 architecture, installing CRC for Linux x86_64 (amd64)..."
        installer_file="crc-linux-amd64.tar.xz"
        ;;
      arm64 | aarch64)
        log_info "Detected ARM64 architecture, installing CRC for Linux ARM64..."
        installer_file="crc-linux-arm64.tar.xz"
        ;;
      *)
        log_warning "Unsupported architecture: ${ARCH}. Please install CRC manually."
        exit 1
        ;;
      esac

      mkdir -p "$HOME/crc"
      log_info "Creating directory $HOME/crc for CRC installation files"

      local temp_dir
      temp_dir=$(mktemp -d)
      trap "rm -r '$temp_dir'" EXIT

      if ! wget -O- "${CRC_BASE_DOWNLOAD_URL}/${installer_file}" >"/tmp/${installer_file}"; then
        log_error "Failed to download CRC installer file: ${installer_file}"
        exit 1
      fi

      if ! tar -xvf "/tmp/${installer_file}" -C "$temp_dir/"; then
        log_error "Failed to extract CRC installer file: ${installer_file}"
        exit 1
      fi
      log_info "Extracted CRC files to ${temp_dir}"

      local extracted_crc_dir
      extracted_crc_dir=$(find "$temp_dir" -maxdepth 1 -name "crc-linux-*" -type d | head -n1)

      if [ -z "$extracted_crc_dir" ] || [ ! -d "$extracted_crc_dir" ]; then
        log_error "No extracted CRC directory found in ${temp_dir}. Please check the downloaded file."
        exit 1
      fi

      if [ ! -f "$extracted_crc_dir/crc" ]; then
        log_error "CRC binary not found in the extracted directory: ${extracted_crc_dir}"
        exit 1
      fi

      if ! cp -r "$extracted_crc_dir/crc" "$HOME/crc/"; then
        log_error "Failed to copy CRC binary to $HOME/crc/"
        exit 1
      fi
    fi

    chmod +x "$HOME/crc/crc"
    export PATH="$PATH:$HOME/crc"
    ;;

  esac

  log_info "Starting CRC cluster. This may take a while..."
  OC_URL="$crc_default_cluster_route"
  OC_USER="$crc_default_admin_user"

  crc setup
  crc start --pull-secret-file "$crc_pull_secret_path"

  OC_PASSWORD=$(crc console --credentials | grep 'kubeadmin -p' | sed 's/.*-p \([^ ]*\).*/\1/')
  # export OC_PASSWORD
  CRC_PULL_SECRET_PATH="$crc_pull_secret_path"

  log_success "CodeReady Containers (CRC) setup completed successfully."

  return 0
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

  if [ ${#missing_tools[@]} -gt 0 ]; then
    log_error "Missing prerequisites: ${missing_tools[*]}"
    log_info "Please install the missing tools before proceeding."
    exit 1
  fi

  log_success "All prerequisites are met."
}

container_create_env_file() {
  local oc_cluster_type="$1"
  local oc_url="$2"
  local oc_user="$3"
  local oc_password="$4"
  local oc_project="$5"
  local oc_token="$6"
  local container_builder="$7"
  local local_env_file="$8"
  local crc_default_cluster_route="$9"
  local crc_default_admin_user="${10}"
  local crc_default_admin_password="${11}"

  log_step "Creating environment files..."

  local container_builder_to_use

  if [ "$oc_cluster_type" == "crc" ]; then
    oc_url="$crc_default_cluster_route"
    oc_user="$crc_default_admin_user"
    oc_password="$crc_default_admin_password"
  else
    if [ -n "$oc_url" ]; then
      log_info "Using existing OpenShift cluster URL from environment variable: $oc_url"
    else
      echo ""
      read -p "Enter your OpenShift cluster API URL (e.g., https://api.cluster.example.com:6443): " oc_url
    fi

    if [ -n "$oc_user" ] && [ -n "$oc_password" ]; then
      log_info "Using existing OpenShift credentials from environment variables."
    else
      read -p "Enter your OpenShift cluster username (user must have cluster-admin privileges): " oc_user
      read -s -p "Enter your OpenShift cluster password: " oc_password
    fi

    if [ -z "$oc_project" ]; then
      echo ""
      read -p "Enter the OpenShift project name (default: opendatahub): " oc_project
      if [ -n "$oc_project" ]; then
        log_info "Using project: $oc_project"
      else
        oc_project="opendatahub"
        log_info "Using default project: $oc_project"
      fi
    fi
  fi

  if [ -n "$container_builder" ] &&
    {
      [ "$container_builder" == "docker" ] ||
        [ "$container_builder" == "podman" ]
    }; then
    log_info "Container builder set to: $container_builder"
    container_builder_to_use="$container_builder"
  elif command -v podman >/dev/null 2>&1; then
    container_builder_to_use="podman"
    log_info "Using Podman as container builder"
  elif command -v docker >/dev/null 2>&1; then
    container_builder_to_use="docker"
    log_info "Using Docker as container builder"
  else
    log_error "No container builder found. Please install Docker or Podman."
    exit 1
  fi

  if [ -f "$local_env_file" ]; then
    echo ""
    log_warning "Warning: $local_env_file already exists."

    read -r -p "Do you want to overwrite it (appends otherwise)? [y/N]: " overwrite_response

    if [ "$overwrite_response" == "y" ] || [ "$overwrite_response" == "Y" ]; then
      log_info "Overwriting $local_env_file"
      cat >"$local_env_file" <<EOF

# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$oc_cluster_type
OC_PROJECT=$oc_project

EOF
    else
      log_info "Appending to $local_env_file"
      cat >>"$local_env_file" <<EOF
# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$oc_cluster_type
OC_PROJECT=$oc_project

EOF
    fi
  else
    cat >"$local_env_file" <<EOF
# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$oc_cluster_type
OC_PROJECT=$oc_project

EOF
  fi

  cat >>"$local_env_file" <<EOF
# Existing Cluster Configuration
OC_URL=$oc_url
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

  cat >>"$local_env_file" <<EOF
# Development Configuration
NODE_ENV=development
NODE_TLS_REJECT_UNAUTHORIZED=0

# Container Configuration
CONTAINER_BUILDER=${container_builder_to_use}

# Start Command
START_COMMAND="cd frontend && npm run start:dev:ext"

EOF

  cat >>"$local_env_file" <<EOF
# Dev environment for startup script
DEVELOPMENT_ENVIRONMENT=container
EOF

  log_success "Environment file created at: ${YELLOW}${local_env_file}${NC}"

}

container_show_completed_message() {
  local local_env_file="$1"

  echo ""
  echo "Setup completed successfully!"
  echo ""

  echo ""
  echo "Next steps:"
  echo -e "1. Check your environment variables in ${YELLOW}$local_env_file${NC} file and make sure they are correct."
  echo -e "   Change the START_COMMAND variable in ${YELLOW}$local_env_file${NC} if you want to use a different command to start the development environment."
  echo -e "   Add a ${YELLOW}.env.development.local${NC} file if you need any variables for development."
  echo ""
  echo "2. Start the development environment. Please ensure your container environment allows host network binding (i.e. https://docs.docker.com/engine/network/drivers/host/):"
  echo -e "   ${CYAN}docker compose --env-file=$local_env_file up --watch${NC} (use --build to rebuild images)"
  echo -e "   Stop with ${CYAN}docker compose down${NC}"
  echo -e "   Stop with ${CYAN}docker compose down -v${NC} to remove volumes"
  echo -e "   You can change the start command in ${YELLOW}$local_env_file${NC} file."
  echo ""
  echo "3. Access the dashboard at:"
  echo -e "   ${CYAN}http://localhost:4010${NC}"
  echo ""
  echo "4. For local development without Docker:"
  echo -e "   - Backend: ${CYAN}cd backend && npm run start:dev${NC}"
  echo -e "   - Frontend: ${CYAN}cd frontend && npm run start:dev${NC}"
  echo -e "   - Frontend-only: ${CYAN}cd frontend && npm run start:dev:ext${NC}"
}

local_check_prerequisities() {
  local required_tools=("tar" "node" "npm" "yq" "wget")
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
  local oc_url="$1"
  local oc_user="$2"
  local oc_password="$3"
  local oc_token="$4"
  local oc_cluster_type="$5"

  if ! command -v oc >/dev/null 2>&1; then
    local install_oc
    log_error "OpenShift CLI (oc) is not installed."
    read -p "Do you want to install it now into /usr/local/bin (requires root privilege)? [y/N]: " install_oc

    if [ "$install_oc" == "y" ] || [ "$install_oc" == "Y" ]; then
      log_info "Installing OpenShift CLI (oc)..."

      case "${ARCH}" in
      amd64 | x86_64) OCP_ARCH="openshift-client-linux" ;;
      arm64 | aarch64) OCP_ARCH="openshift-client-linux-arm64" ;;
      *) echo "Unsupported architecture: ${ARCH}" && exit 1 ;;
      esac

      sudo wget -qO- "${OCP_DOWNLOAD_BASE_URL}/${OCP_ARCH}.tar.gz" | sudo tar zxv -C /usr/local/bin/ oc kubectl

      log_success "OpenShift CLI (oc) installed successfully in /usr/local/bin"

    else
      log_error "Cannot proceed without OpenShift CLI (oc). Please install OpenShift CLI manually or through this script. Exiting."
      exit 1
    fi
  fi

  if [ -n "$oc_url" ] && [ -n "$oc_user" ] && [ -n "$oc_password" ]; then
    log_info "Using existing OpenShift cluster credentials from environment variables."
    return
  elif [ -n "$oc_url" ] && [ -n "$oc_token" ]; then
    log_info "Using existing OpenShift token from environment variable."
    return
  fi

  read -p "Enter your OpenShift cluster API URL (e.g. https://api.xxx.openshiftapps.com:443) " oc_url
  read -p "Enter your OpenShift username: " oc_user
  read -s -p "Enter your OpenShift password: " oc_password
  echo ""

  export OC_URL="$oc_url"
  export OC_USER="$oc_user"
  export OC_PASSWORD="$oc_password"
  export OC_CLUSTER_TYPE="$oc_cluster_type"

  log_success "OpenShift CLI (oc) setup successful."

}

local_setup_cluster() {
  if [ -z "$OC_PROJECT" ]; then
    read -p "Enter the OpenShift project name (default: opendatahub): " oc_project
    if [ -n "$OC_PROJECT" ]; then
      log_info "Using project: $OC_PROJECT"
    else
      OC_PROJECT="opendatahub"
      log_info "Using default project: $OC_PROJECT"
    fi
  fi
  setup_environment "${OC_CLUSTER_TYPE}" "${OC_URL}" "${OC_TOKEN}" "${OC_USER}" "${OC_PASSWORD}" "${OC_PROJECT}"
}

local_create_env_file() {
  local oc_cluster_type="$1"
  local oc_url="$2"
  local oc_user="$3"
  local oc_password="$4"
  local oc_project="$5"
  local oc_token="$6"
  local container_builder="$7"
  local local_env_file="$8"
  local crc_pull_secret_path="$9"

  log_step "Creating $local_env_file file..."

  if [ -f "$local_env_file" ]; then
    echo ""
    log_warning "Warning: $local_env_file already exists."

    read -r -p "Do you want to overwrite it (appends otherwise)? [y/N]: " overwrite_response

    if [ "$overwrite_response" == "y" ] || [ "$overwrite_response" == "Y" ]; then
      log_info "Overwriting $local_env_file"
      cat >"$local_env_file" <<EOF

# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$oc_cluster_type
OC_PROJECT=$oc_project

EOF
    else
      log_info "Appending to $local_env_file"
      cat >>"$local_env_file" <<EOF
# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$oc_cluster_type
OC_PROJECT=$oc_project

EOF
    fi
  else
    cat >"$local_env_file" <<EOF
# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$oc_cluster_type
OC_PROJECT=$oc_project

EOF
  fi

  cat >>"$local_env_file" <<EOF
# Existing Cluster Configuration
OC_URL=$oc_url
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

  cat >>"$local_env_file" <<EOF
# Development Configuration
NODE_ENV=development
NODE_TLS_REJECT_UNAUTHORIZED=0

# Container Configuration
CONTAINER_BUILDER=${container_builder}

# Start Command
START_COMMAND="cd frontend && npm run start:dev:ext"
EOF

  if [ -n "$crc_pull_secret_path" ]; then
    cat >>"$local_env_file" <<EOF
CRC_PULL_SECRET_PATH=$crc_pull_secret_path
EOF
  fi

  cat >>"$local_env_file" <<EOF
DEVELOPMENT_ENVIRONMENT=local
EOF

  log_success "Environment file created at: ${YELLOW}$local_env_file${NC}"

}

local_install_node_dependencies() {
  log_step "Installing Node.js dependencies and building project..."

  npm install
  npm run build

  log_success "Node.js dependencies installed successfully."
}

local_show_completed_message() {
  echo ""
  echo "Setup completed successfully!"
  echo ""
  echo "Next steps:"
  echo -e "1. If ${CYAN}oc${NC} was installed, ensure to add it to your PATH within your .bashrc/.zshrc/etc."
  echo "2. Start the development environment:"
  echo -e "   For frontend only (backend in cluster): ${CYAN}cd frontend && npm run start:dev:ext${NC}"
  echo -e "   For both backend and frontend: ${CYAN}npm run dev${NC}"
  echo -e "   ${CYAN}npm run start:dev${NC} in /frontend and /backend for each component separately."
  echo ""
  echo "3. Access the dashboard at:"
  echo -e "   ${CYAN}http://localhost:4010${NC}"
}

parse_flags() {
  while [[ $# -gt 0 ]]; do
    case $1 in
    --env-file=*)
      LOCAL_ENV_FILE="${1#*=}"
      shift
      ;;
    --env-file)
      if [ -n "$2" ] && [ "${2:0:1}" != "-" ]; then
        LOCAL_ENV_FILE="$2"
        shift 2
      else
        log_error "Error: --env-file requires a file path"
        exit 1
      fi
      ;;
    --recreate-env-file)
      RECREATE_ENV_FILE=true
      shift
      ;;
    --cluster-type=*)
      OC_CLUSTER_TYPE="${1#*=}"
      shift
      ;;
    --cluster-type)
      if [ -n "$2" ] && [ "${2:0:1}" != "-" ]; then
        OC_CLUSTER_TYPE="$2"
        shift 2
      else
        log_error "Error: --cluster-type requires a value (crc|existing)"
        exit 1
      fi
      ;;
    --development-environment=*)
      DEVELOPMENT_ENVIRONMENT="${1#*=}"
      shift
      ;;
    --development-environment)
      if [ -n "$2" ] && [ "${2:0:1}" != "-" ]; then
        DEVELOPMENT_ENVIRONMENT="$2"
        shift 2
      else
        log_error "Error: --development-environment requires a value (local|container)"
        exit 1
      fi
      ;;
    --start-command=*)
      NPM_START_COMMAND="${1#*=}"
      shift
      ;;
    --start-command)
      if [ -n "$2" ] && [ "${2:0:1}" != "-" ]; then
        NPM_START_COMMAND="$2"
        shift 2
      else
        log_error "Error: --development-environment requires a value (local|container)"
        exit 1
      fi
      ;;
    --container-builder=*)
      CONTAINER_BUILDER="${1#*=}"
      shift
      ;;
    --container-builder)
      if [ -n "$2" ] && [ "${2:0:1}" != "-" ]; then
        CONTAINER_BUILDER="$2"
        shift 2
      else
        log_error "Error: --container-builder requires a value (docker|podman)"
        exit 1
      fi
      ;;
    --skip-deps)
      SKIP_DEPS=true
      shift
      ;;
    --help | -h)
      show_help
      exit 0
      ;;
    --verbose | -v)
      VERBOSE=true
      shift
      ;;
    -*)
      log_error "Unknown option: $1"
      show_help
      exit 1
      ;;
    *)
      log_error "Unknown argument: $1"
      show_help
      exit 1
      ;;
    esac
  done
}

show_help() {
  echo "OpenDataHub Dashboard Development Setup"
  echo ""
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Options:"
  # echo "  --env-file FILE                  Specify custom environment file (default: .env.local)"
  echo "  --recreate-env-file              Creating a new environment file"
  echo "  --cluster-type TYPE              Set cluster type (crc|existing)"
  echo "  --development-environment TYPE   Set development environment (local|container)"
  echo "  --start-command COMMAND          Set custom start command for the development environment"
  echo "  --container-builder BUILDER      Set container builder (docker|podman)"
  echo "  --skip-deps                      Skip Node.js dependencies installation"
  echo "  --verbose, -v                    Enable verbose output"
  echo "  --help, -h                       Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 --cluster-type crc --skip-deps"
  echo "  $0 --development-environment container --container-builder docker"
  echo "  $0 --skip-deps --verbose"
}

main() {
  parse_flags "$@"

  echo "OpenDataHub Dashboard Development Setup"

  if [ -z "$DEVELOPMENT_ENVIRONMENT" ]; then
    echo ""
    echo "Preferred development environment:"
    echo "1) Local"
    echo "2) Container (Docker or Podman) [currently only Docker is supported due to host network binding issues]"
    echo ""
    while true; do
      read -p "Enter your choice (1 or 2): " dev_env_choice
      case $dev_env_choice in
      1)
        log_info "Using local development environment"
        SETUP_CHOICE="local"
        break
        ;;
      2)
        log_info "Using container development environment"
        SETUP_CHOICE="container"
        break
        ;;
      *)
        echo "Please enter 1 or 2"
        ;;
      esac
    done

    if [ -z "$SETUP_CHOICE" ]; then
      SETUP_CHOICE="local"
    fi
  else
    if [ "$DEVELOPMENT_ENVIRONMENT" != "container" ] && [ "$DEVELOPMENT_ENVIRONMENT" != "local" ]; then
      log_error "Invalid development environment: $DEVELOPMENT_ENVIRONMENT"
      log_info "Usage: $0 [container|local]"
      exit 1
    fi
    SETUP_CHOICE="$DEVELOPMENT_ENVIRONMENT"
  fi

  if [ -z "$OC_CLUSTER_TYPE" ]; then
    echo ""
    echo "Which OpenShift setup would you like to use?"
    echo "1) CRC running locally (CodeReady Containers). High resource requirements"
    echo "2) Existing OpenShift cluster (recommended for most users)"
    echo ""
    while true; do
      read -p "Enter your choice (1 or 2): " choice
      case $choice in
      1)
        OC_CLUSTER_TYPE="crc"
        log_info "Using local CRC setup"
        break
        ;;
      2)
        OC_CLUSTER_TYPE="existing"
        log_info "Using existing OpenShift cluster"
        break
        ;;
      *)

        echo "Please enter 1 or 2"
        ;;
      esac
    done

  else
    if [ "$OC_CLUSTER_TYPE" != "crc" ] && [ "$OC_CLUSTER_TYPE" != "existing" ]; then
      log_error "Invalid cluster type: $OC_CLUSTER_TYPE"
      log_info "Usage: $0 [crc|existing]"
      exit 1
    fi
    log_info "Using cluster type: $OC_CLUSTER_TYPE"
  fi

  case $SETUP_CHOICE in
  "container")
    log_info "Using container setup"
    container_check_prerequisites
    if [ "$OC_CLUSTER_TYPE" == "crc" ]; then
      setup_crc "$CRC_PULL_SECRET_PATH" "$CRC_URL" "$CRC_DEFAULT_CLUSTER_ROUTE" "$CRC_DEFAULT_ADMIN_USER" "$CRC_DEFAULT_ADMIN_PASSWORD"
    fi

    if [ "$RECREATE_ENV_FILE" ] || [ ! -f "$LOCAL_ENV_FILE" ]; then
      container_create_env_file "$OC_CLUSTER_TYPE" "$OC_URL" "$OC_USER" "$OC_PASSWORD" "$OC_PROJECT" "$OC_TOKEN" "$CONTAINER_BUILDER" "$LOCAL_ENV_FILE" "$CRC_DEFAULT_CLUSTER_ROUTE" "$CRC_DEFAULT_ADMIN_USER" "$CRC_DEFAULT_ADMIN_PASSWORD"
    fi

    if [ "$SKIP_DEPS" ]; then
      log_warning "Cannot skip dependency installation in container setup. Node dependencies will be installed."
    fi

    # container entrypoint handles operator installations since this assumes we aren't installing oc locally
    # LOCAL_ENV_FILE has values that are passed to the container

    container_show_completed_message "$LOCAL_ENV_FILE"
    ;;
  "local")
    log_info "Using local setup"
    local_check_prerequisities
    if [ "$OC_CLUSTER_TYPE" == "crc" ]; then
      setup_crc "$CRC_PULL_SECRET_PATH" "$CRC_URL" "$CRC_DEFAULT_CLUSTER_ROUTE" "$CRC_DEFAULT_ADMIN_USER" "$CRC_DEFAULT_ADMIN_PASSWORD"
    fi
    local_setup_oc "$OC_URL" "$OC_USER" "$OC_PASSWORD" "$OC_TOKEN" "$OC_CLUSTER_TYPE"
    local_setup_cluster

    if [ "$RECREATE_ENV_FILE" ] || [ ! -f "$LOCAL_ENV_FILE" ]; then
      local_create_env_file "$OC_CLUSTER_TYPE" "$OC_URL" "$OC_USER" "$OC_PASSWORD" "$OC_PROJECT" "$OC_TOKEN" "$CONTAINER_BUILDER" "$LOCAL_ENV_FILE" "$CRC_PULL_SECRET_PATH"
    fi

    if [ ! "$SKIP_DEPS" ]; then
      local_install_node_dependencies
    fi

    if [ -n "$NPM_START_COMMAND" ]; then
      log_info "Starting development environment with command: $NPM_START_COMMAND"
      eval "$NPM_START_COMMAND"
    else
      local_show_completed_message
    fi
    ;;
  *)
    log_error "Invalid setup type: ${SETUP_CHOICE}"
    log_info "Usage: $0 [container|local]"
    exit 1
    ;;
  esac

  if [ "$OC_CLUSTER_TYPE" == "crc" ]; then
    echo "CodeReady Containers (CRC) is set up and running."
    echo -e "Ensure to add the CRC binary to your PATH within your .bashrc/.zshrc/etc. , e.g. ${CYAN}export PATH=\$PATH:\$HOME/crc${NC}"
    echo -e "   ${CYAN}crc -h${NC} to see available commands."
    echo -e "You can access the CRC OpenShift cluster using: ${CYAN}crc console${NC}"
  fi

  echo ""
  echo -e "This setup uses existing variables from ${CYAN}${LOCAL_ENV_FILE}${NC} by default. You can modify variables in this file to suit your needs, delete it to start fresh, or set --recreate-env-file to append/recreate the env file."

}

main "$@"
