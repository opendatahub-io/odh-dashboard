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

PLATFORM=$(uname -s)
ARCH=$(uname -m)

# globals
SETUP_CHOICE=${SETUP_CHOICE:-""}
CONTAINER_BUILDER=${CONTAINER_BUILDER:-""}
LOCAL_ENV_FILE=${LOCAL_ENV_FILE:-".env.local"}
OCP_DOWNLOAD_BASE_URL="https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable"

OC_URL=${OC_URL:-""}
OC_USER=${OC_USER:-""}
OC_PASSWORD=${OC_PASSWORD:-""}
OC_PROJECT=${OC_PROJECT:-""}
OC_CLUSTER_TYPE=${OC_CLUSTER_TYPE:-""}

# crc globals for local cluster deployment
CRC_URL="https://console.redhat.com/openshift/create/local"
CRC_VERSION="latest"
CRC_BASE_DOWNLOAD_URL="https://developers.redhat.com/content-gateway/rest/mirror/pub/openshift-v4/clients/crc/${CRC_VERSION}"
CRC_DEFAULT_CLUSTER_ROUTE="https://api.crc.testing:6443"
CRC_DEFAULT_ADMIN_USER="kubeadmin"
CRC_DEFAULT_ADMIN_PASSWORD="password"

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

# crc is recommended to only be used on bare metal (no containerization)
setup_crc() {
  log_info "Setting up CodeReady Containers (CRC)..."

  if command -v crc >/dev/null 2>&1; then
    # --- start cluster only (crc already installed) ---
    log_info "CRC is already installed."
    if [ -z "$CRC_PULL_SECRET_PATH" ]; then
      echo -e "Go to ${CYAN}\033]8;;${CRC_URL}\a${CRC_URL}\033]8;;\a${NC} to get your CodeReady Containers pull secret."
      while true; do
        read -e -p "Enter the path to your CRC pull secret file: " temp_crc_pull_secret_path
        CRC_PULL_SECRET_PATH="${temp_crc_pull_secret_path/#\~/$HOME}"
        CRC_PULL_SECRET_PATH=$(realpath "$CRC_PULL_SECRET_PATH")
        if [ -f "$CRC_PULL_SECRET_PATH" ]; then
          log_success "Pull secret file found at: $CRC_PULL_SECRET_PATH"
          break
        else
          log_error "Pull secret file not found at: $CRC_PULL_SECRET_PATH"
          echo "Please enter a valid path to your CRC pull secret file."
        fi
      done
    else
      log_info "Using existing CRC pull secret at: $CRC_PULL_SECRET_PATH"
    fi

    log_info "Starting CRC cluster..."
    # export env variables for cluster setup script (only needed for local development choice)
    export OC_URL="$CRC_DEFAULT_CLUSTER_ROUTE"
    export OC_USER="$CRC_DEFAULT_ADMIN_USER"

    crc setup
    crc start --pull-secret-file "$CRC_PULL_SECRET_PATH"

    OC_PASSWORD=$(crc console --credentials | grep 'kubeadmin -p' | sed 's/.*-p \([^ ]*\).*/\1/')
    export OC_PASSWORD

    return 0
  else
    log_error "CRC is not installed"
    local install_crc
    read -p "Do you want to install CRC now? [y/N]: " install_crc

    if [ ! "$install_crc" == "y" ] && [ ! "$install_crc" == "Y" ]; then
      log_error "Cannot proceed without CRC. Please install CRC manually or through this script. Exiting."
      exit 1
    fi
  fi

  # --- installation process + start cluster ---
  log_info "Installing CodeReady Containers (CRC)..."

  echo ""
  echo -e "Go to ${CYAN}\033]8;;${CRC_URL}\a${CRC_URL}\033]8;;\a${NC} to get your CodeReady Containers pull secret."
  while true; do
    read -e -p "Enter the path to your CRC pull secret file: " temp_crc_pull_secret_path
    CRC_PULL_SECRET_PATH="${temp_crc_pull_secret_path/#\~/$HOME}"
    CRC_PULL_SECRET_PATH=$(realpath "$CRC_PULL_SECRET_PATH")
    if [ -f "$CRC_PULL_SECRET_PATH" ]; then
      log_success "Pull secret file found at: $CRC_PULL_SECRET_PATH"
      break
    else
      log_error "Pull secret file not found at: $CRC_PULL_SECRET_PATH"
      echo "Please enter a valid path to your CRC pull secret file."
    fi
  done

  # get correct installer and install based on platform and architecture
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
    log_info "Detected Linux platform, installing CRC for Linux..."
    local installer_file="crc-linux-${ARCH}.tar.xz"

    mkdir "$HOME/crc"
    log_info "Creating directory $HOME/crc for CRC installation files"

    wget -O- "${CRC_BASE_DOWNLOAD_URL}/crc-linux-${ARCH}.tar.xz" >"/tmp/${installer_file}"
    tar -xvf "/tmp/${installer_file}" -C "/tmp/"
    log_info "Extracted CRC files to /tmp"

    local extracted_crc_dir
    extracted_crc_dir=$(find /tmp -maxdepth 1 - name "crc-linux-*" -type d | head -n1)
    mv "$extracted_crc_dir"/* "$HOME/crc/"

    rm -r /tmp/crc-linux-*

    chmod +x "$HOME/crc/crc"
    export PATH="$PATH:$HOME/crc"
    ;;

  esac

  log_info "Setting up CodeReady Containers (CRC)"
  crc setup

  log_info "Starting CodeReady Containers (CRC)"
  crc start --pull-secret-file "$CRC_PULL_SECRET_PATH"

  # export env variables for cluster setup script (only for local development choice)
  export OC_URL="$CRC_DEFAULT_CLUSTER_ROUTE"
  export OC_USER="$CRC_DEFAULT_ADMIN_USER"
  export OC_PASSWORD="$CRC_DEFAULT_ADMIN_PASSWORD"

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

  local container_builder

  if [ "$OC_CLUSTER_TYPE" == "crc" ]; then
    OC_URL=${CRC_DEFAULT_CLUSTER_ROUTE}
    OC_USER=${CRC_DEFAULT_ADMIN_USER}
    OC_PASSWORD=${CRC_DEFAULT_ADMIN_PASSWORD}
  else
    # Existing cluster setup
    if [ -n "$OC_URL" ]; then
      log_info "Using existing OpenShift cluster URL from environment variable: $OC_URL"
    else
      echo ""
      read -p "Enter your OpenShift cluster API URL (e.g., https://api.cluster.example.com:6443): " OC_URL
    fi

    if [ -n "$OC_USER" ] && [ -n "$OC_PASSWORD" ]; then
      log_info "Using existing OpenShift credentials from environment variables."
    else
      read -p "Enter your OpenShift cluster username: " OC_USER
      read -s -p "Enter your OpenShift cluster password: " OC_PASSWORD

      # echo ""
      # echo "Authentication method:"
      # echo "1) Username/Password"
      # echo "2) Token"
      # echo ""
      # while true; do
      #   read -p "Enter your choice (1 or 2): " auth_choice
      #   case $auth_choice in
      #   1)
      #     read -p "Enter your OpenShift username: " OC_USER
      #     read -s -p "Enter your OpenShift password: " OC_PASSWORD
      #     echo ""
      #     break
      #     ;;
      #   2)
      #     read -s -p "Enter your OpenShift token: " OC_TOKEN
      #     echo ""
      #     break
      #     ;;
      #   *)
      #     echo "Please enter 1 or 2"
      #     ;;
      #   esac
      # done
    fi

    if [ -z "$OC_PROJECT" ]; then
      echo ""
      read -p "Enter the OpenShift project name (default: opendatahub): " OC_PROJECT
      if [ -n "$OC_PROJECT" ]; then
        log_info "Using project: $OC_PROJECT"
      else
        OC_PROJECT="opendatahub"
        log_info "Using default project: $OC_PROJECT"
      fi
    fi
  fi

  # check container builder
  if [ -n "$CONTAINER_BUILDER" ] &&
    {
      [ "$CONTAINER_BUILDER" == "docker" ] ||
        [ "$CONTAINER_BUILDER" == "podman" ]
    }; then
    log_info "Container builder set to: $CONTAINER_BUILDER"
    container_builder="$CONTAINER_BUILDER"
  elif command -v podman >/dev/null 2>&1; then
    container_builder="podman"
    log_info "Using Podman as container builder"
  elif command -v docker >/dev/null 2>&1; then
    container_builder="docker"
    log_info "Using Docker as container builder"
  else
    log_error "No container builder found. Please install Docker or Podman."
    exit 1
  fi

  # overwrite or append to .env.local file
  if [ -f "$LOCAL_ENV_FILE" ]; then
    echo ""
    log_warning "Warning: $LOCAL_ENV_FILE already exists."

    read -r -p "Do you want to overwrite it (appends otherwise)? [y/N]: " overwrite_response

    if [ "$overwrite_response" == "y" ] || [ "$overwrite_response" == "Y" ]; then
      log_info "Overwriting $LOCAL_ENV_FILE"
      # create or append to .env.local file
      cat >"$LOCAL_ENV_FILE" <<EOF

# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$OC_CLUSTER_TYPE
OC_PROJECT=$OC_PROJECT

EOF
    else
      log_info "Appending to $LOCAL_ENV_FILE"
      cat >>"$LOCAL_ENV_FILE" <<EOF
# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$OC_CLUSTER_TYPE
OC_PROJECT=$OC_PROJECT

EOF
    fi
  else
    cat >"$LOCAL_ENV_FILE" <<EOF
# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$OC_CLUSTER_TYPE
OC_PROJECT=$OC_PROJECT

EOF
  fi

  # if [ "$CLUSTER_TYPE" == "existing" ]; then

  cat >>"$LOCAL_ENV_FILE" <<EOF
# Existing Cluster Configuration
OC_URL=$OC_URL
EOF

  if [ -n "$OC_TOKEN" ]; then
    cat >>"$LOCAL_ENV_FILE" <<EOF
OC_TOKEN=$OC_TOKEN
EOF
  fi

  if [ -n "$OC_USER" ]; then
    cat >>"$LOCAL_ENV_FILE" <<EOF
OC_USER=$OC_USER
OC_PASSWORD=$OC_PASSWORD
EOF
  fi
  cat >>"$LOCAL_ENV_FILE" <<EOF

EOF

  cat >>"$LOCAL_ENV_FILE" <<EOF
# Development Configuration
NODE_ENV=development
NODE_TLS_REJECT_UNAUTHORIZED=0

# Container Configuration
CONTAINER_BUILDER=${container_builder}

# Start Command
START_COMMAND="cd frontend && npm run start:dev:ext"

EOF

  cat >>"$LOCAL_ENV_FILE" <<EOF
# Dev environment for startup script
DEVELOPMENT_ENVIRONMENT=container
EOF

  log_success "Environment file created at: ${YELLOW}$LOCAL_ENV_FILE${NC}"

}

container_show_completed_message() {
  echo ""
  echo "Setup completed successfully!"
  echo ""

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
  echo -e "   You can change the start command in ${YELLOW}.env.local${NC} file."
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
  # check if oc is installed and ask to install if not
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

  # check if oc is logged in to a cluster
  # read -p "Do you want to log in now? (y/N): " login_oc

  if [ -n "$OC_URL" ] && [ -n "$OC_USER" ] && [ -n "$OC_PASSWORD" ]; then
    log_info "Using existing OpenShift cluster credentials from environment variables."
    return
  elif [ -n "$OC_URL" ] && [ -n "$OC_TOKEN" ]; then
    log_info "Using existing OpenShift token from environment variable."
    return
  fi

  local oc_url
  local oc_user
  local oc_password

  read -p "Enter your OpenShift cluster API URL (e.g. https://api.xxx.openshiftapps.com:443) " oc_url
  read -p "Enter your OpenShift username: " oc_user
  read -s -p "Enter your OpenShift password: " oc_password
  echo ""

  # used by local_setup_cluster() -> setup_environment()
  #         local_create_env_file
  export OC_URL="$oc_url"
  export OC_USER="$oc_user"
  export OC_PASSWORD="$oc_password"
  export OC_CLUSTER_TYPE

  log_success "OpenShift CLI (oc) setup successful."

}

local_setup_cluster() {
  # uses functions from install/dev/operators.sh
  # logs in to cluster and installs operators
  setup_environment
}

local_create_env_file() {
  log_step "Creating ${LOCAL_ENV_FILE} file..."

  if [ -z "$OC_PROJECT" ]; then
    read -p "Enter the OpenShift project name (default: opendatahub): " OC_PROJECT
    if [ -n "$OC_PROJECT" ]; then
      log_info "Using project: $OC_PROJECT"
    else
      OC_PROJECT="opendatahub"
      log_info "Using default project: $OC_PROJECT"
    fi
  fi

  if [ -f "$LOCAL_ENV_FILE" ]; then
    echo ""
    log_warning "Warning: $LOCAL_ENV_FILE already exists."

    read -r -p "Do you want to overwrite it (appends otherwise)? [y/N]: " overwrite_response

    if [ "$overwrite_response" == "y" ] || [ "$overwrite_response" == "Y" ]; then
      log_info "Overwriting $LOCAL_ENV_FILE"
      # create or append to .env.local file
      cat >"$LOCAL_ENV_FILE" <<EOF

# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$OC_CLUSTER_TYPE
OC_PROJECT=$OC_PROJECT

EOF
    else
      log_info "Appending to $LOCAL_ENV_FILE"
      cat >>"$LOCAL_ENV_FILE" <<EOF
# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$OC_CLUSTER_TYPE
OC_PROJECT=$OC_PROJECT

EOF
    fi
  else
    cat >"$LOCAL_ENV_FILE" <<EOF
# ODH Dashboard Development Environment Configuration
# Generated by setup-dev.sh on $(date)

# Cluster Configuration
OC_CLUSTER_TYPE=$OC_CLUSTER_TYPE
OC_PROJECT=$OC_PROJECT

EOF
  fi

  # if [ "$CLUSTER_TYPE" == "existing" ]; then

  cat >>"$LOCAL_ENV_FILE" <<EOF
# Existing Cluster Configuration
OC_URL=$OC_URL
EOF

  if [ -n "$OC_TOKEN" ]; then
    cat >>"$LOCAL_ENV_FILE" <<EOF
OC_TOKEN=$OC_TOKEN
EOF
  fi

  if [ -n "$OC_USER" ]; then
    cat >>"$LOCAL_ENV_FILE" <<EOF
OC_USER=$OC_USER
OC_PASSWORD=$OC_PASSWORD
EOF
  fi
  cat >>"$LOCAL_ENV_FILE" <<EOF

EOF

  cat >>"$LOCAL_ENV_FILE" <<EOF
# Development Configuration
NODE_ENV=development
NODE_TLS_REJECT_UNAUTHORIZED=0

# Container Configuration
CONTAINER_BUILDER=${container_builder}

# Start Command
START_COMMAND="cd frontend && npm run start:dev:ext"
EOF

  if [ -n "$CRC_PULL_SECRET_PATH" ]; then
    cat >>"$LOCAL_ENV_FILE" <<EOF
CRC_PULL_SECRET_PATH=$CRC_PULL_SECRET_PATH
EOF
  fi

  cat >>"$LOCAL_ENV_FILE" <<EOF
DEVELOPMENT_ENVIRONMENT=local
EOF

  log_success "Environment file created at: ${YELLOW}$LOCAL_ENV_FILE${NC}"

}

local_install_node_dependencies() {
  log_step "Installing Node.js dependencies and building project..."

  local install_node_deps
  read -p "Install Node.js dependencies and build project? [y/N]: " install_node_deps

  if [ "$install_node_deps" != "y" ] && [ "$install_node_deps" != "Y" ]; then
    log_info "Skipping Node.js dependencies installation."
    return
  fi

  npm install
  npm run build

  log_success "Node.js dependencies installed successfully."
}

local_show_completed_message() {
  echo ""
  echo "Setup completed successfully!"
  echo ""
  echo "Next steps:"
  echo -e "1. ${CYAN}npm install && npm run build${NC} if not done automatically."
  echo "2. Start the development environment:"
  echo -e "   For frontend only (backend in cluster): ${CYAN}cd frontend && npm run start:dev:ext${NC}"
  echo -e "   For both backend and frontend${CYAN}npm run dev${NC}"
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
    # --no-env-file)
    #   NO_ENV_FILE=true
    #   shift
    #   ;;
    --skip-env-creation)
      SKIP_ENV_CREATION=true
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
  echo "  --env-file FILE                  Specify custom environment file (default: .env.local)"
  # echo "  --no-env-file                    Skip creating a new environment file"
  echo "  --skip-env-creation              Skip creating a new environment file"
  echo "  --cluster-type TYPE              Set cluster type (crc|existing)"
  echo "  --development-environment TYPE   Set development environment (local|container)"
  echo "  --container-builder BUILDER      Set container builder (docker|podman)"
  echo "  --skip-deps                      Skip Node.js dependencies installation"
  echo "  --verbose, -v                    Enable verbose output"
  echo "  --help, -h                       Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0 --env-file .env.custom --cluster-type crc"
  echo "  $0 --development-environment container --container-builder podman"
  echo "  $0 --skip-deps --verbose"
}

# TODO: Add support for flags and sourcing an existing env file
main() {
  parse_flags "$@"

  # if [ -f "$LOCAL_ENV_FILE" ] && [ ! $NO_ENV_FILE ]; then
  #   log_info "Loading existing environment file: $LOCAL_ENV_FILE"
  #   local env_filepath
  #   env_filepath="${LOCAL_ENV_FILE/#\~/$HOME}"
  #   env_filepath=$(realpath "$env_filepath")
  #   set -a
  #   . "$env_filepath"
  #   set +a
  # else
  #   log_info "No existing environment file found."
  # fi

  echo "OpenDataHub Dashboard Development Setup"

  # user sets development environment variable if they want
  if [ -z "$DEVELOPMENT_ENVIRONMENT" ]; then
    echo ""
    echo "Preferred development environment:"
    echo "1) Local"
    echo "2) Container (Docker or Podman)"
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

  # Ask user for cluster type
  if [ -z "$OC_CLUSTER_TYPE" ]; then
    echo ""
    echo "Which OpenShift setup would you like to use?"
    echo "1) CRC running locally (CodeReady Containers)"
    echo "2) Existing OpenShift cluster"
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
    # creates local CRC cluster (if selected)
    # creates .env.local file with cluster and development environment variables
    # containers install oc, login to cluster, install operators, set project, and start development environment
    log_info "Using container setup"
    container_check_prerequisites
    if [ "$OC_CLUSTER_TYPE" == "crc" ]; then
      setup_crc
    fi

    if [ ! $SKIP_ENV_CREATION ]; then
      container_create_env_file
    fi

    if [ ! $SKIP_DEPS ]; then
      log_warning "Cannot skip dependency installation in container setup. Node dependencies will be installed."
    fi

    container_show_completed_message
    ;;
  "local")
    # creates local CRC cluster (if selected)
    # creates .env.local file with variables to be reused for this script
    # installs oc onto users machine
    # logins to cluster, installs operators, sets project
    # installs node dependencies, and starts development environment
    log_info "Using local setup"
    local_check_prerequisities
    if [ "$OC_CLUSTER_TYPE" == "crc" ]; then
      setup_crc
    fi
    local_setup_oc
    local_setup_cluster

    if [ ! $SKIP_ENV_CREATION ]; then
      local_create_env_file
    fi

    if [ ! $SKIP_DEPS ]; then
      local_install_node_dependencies
    fi

    local_show_completed_message
    ;;
  *)
    log_error "Invalid setup type: $SETUP_CHOICE"
    log_info "Usage: $0 [container|local]"
    exit 1
    ;;
  esac

  if [ "$OC_CLUSTER_TYPE" == "crc" ]; then
    echo "CodeReady Containers (CRC) is set up and running."
    echo -e "   ${CYAN}crc -h${NC} to see available commands."
    echo -e "You can access the CRC OpenShift cluster using: ${CYAN}crc console${NC}"
  fi

  echo ""
  echo -e "This setup uses existing variables from ${CYAN}${LOCAL_ENV_FILE}${NC} by default. You can modify variables in this file to suit your needs or delete it to start fresh."

}

main "$@"
