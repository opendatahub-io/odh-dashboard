#!/usr/bin/env bash
# feast-dev-portforward.sh
#
# Manages port-forwards for FeatureStore registry services during local development.
#
# Commands:
#   start              Discover FeatureStores, port-forward all, update .env.local (default)
#   status             Show all active Feast port-forwards and whether each port is reachable
#   stop               Kill all active Feast port-forwards
#   stop <crd-name>    Kill the port-forward for a specific FeatureStore by CRD name
#
# Start options:
#   --base-port PORT   Starting local port for start command (default: 6570)
#   --no-env-update    Skip updating .env.local
#   --dry-run          Show what start would do without making any changes
#   -h, --help         Show this help
#
# Requirements: kubectl or oc, jq, python3 (for .env.local editing)
#
# Examples:
#   ./packages/feature-store/scripts/feast-dev-portforward.sh
#   ./packages/feature-store/scripts/feast-dev-portforward.sh --base-port 8440
#   ./packages/feature-store/scripts/feast-dev-portforward.sh status
#   ./packages/feature-store/scripts/feast-dev-portforward.sh stop
#   ./packages/feature-store/scripts/feast-dev-portforward.sh stop <crd-name>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"

# --------------------------------------------------------------------------- #
# Defaults
# --------------------------------------------------------------------------- #
BASE_PORT=6570
UPDATE_ENV=true
DRY_RUN=false
SUBCOMMAND="start"

# --------------------------------------------------------------------------- #
# Colours
# --------------------------------------------------------------------------- #
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[ OK ]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERR ]${NC}  $*" >&2; }

# --------------------------------------------------------------------------- #
# Usage
# --------------------------------------------------------------------------- #
usage() {
  grep '^#' "$0" | grep -v '^#!/' | sed 's/^# \{0,1\}//'
}

# --------------------------------------------------------------------------- #
# Argument parsing — first positional arg is the subcommand
# --------------------------------------------------------------------------- #
STOP_TARGET=""

if [[ $# -gt 0 ]]; then
  case $1 in
    start)   SUBCOMMAND="start"; shift ;;
    status)  SUBCOMMAND="status"; shift ;;
    stop)
      SUBCOMMAND="stop"
      shift
      # Optional: specific CRD name to stop
      if [[ $# -gt 0 ]] && [[ "$1" != --* ]]; then
        STOP_TARGET="$1"; shift
      fi
      ;;
    -h|--help) usage; exit 0 ;;
  esac
fi

while [[ $# -gt 0 ]]; do
  case $1 in
    --base-port)      BASE_PORT="$2"; shift 2 ;;
    --no-env-update)  UPDATE_ENV=false; shift ;;
    --dry-run)        DRY_RUN=true; shift ;;
    -h|--help)        usage; exit 0 ;;
    *) log_error "Unknown option: $1"; echo ""; usage; exit 1 ;;
  esac
done

# --------------------------------------------------------------------------- #
# Shared helper — find active Feast port-forward processes
# Returns lines of: PID LOCAL_PORT SVC_NAME NAMESPACE
# --------------------------------------------------------------------------- #
find_active_forwards() {
  # Match: kubectl/oc port-forward svc/feast-*-registry-rest LOCAL:TARGET -n NS
  ps -eo pid,args 2>/dev/null \
    | grep 'port-forward' \
    | grep 'feast-.*-registry-rest' \
    | grep -v grep \
    | while read -r PID ARGS; do
        # Extract fields from the command line
        SVC=$(echo "$ARGS" | grep -oE 'svc/feast-[^ ]+' | sed 's|svc/||')
        LOCAL_PORT=$(echo "$ARGS" | grep -oE '[0-9]+:[0-9]+' | cut -d: -f1)
        NS=$(echo "$ARGS" | awk -F'-n ' '{print $2}' | awk '{print $1}')
        echo "$PID $LOCAL_PORT $SVC $NS"
      done
}

# --------------------------------------------------------------------------- #
# STATUS command
# --------------------------------------------------------------------------- #
cmd_status() {
  echo ""
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${BLUE}  Feast Port-Forward Status${NC}"
  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  local ROWS
  ROWS=$(find_active_forwards)

  if [[ -z "$ROWS" ]]; then
    echo ""
    log_warn "No active Feast port-forwards found."
    echo ""
    echo -e "  Run  ${YELLOW}./packages/feature-store/scripts/feast-dev-portforward.sh${NC}  to begin."
    echo ""
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    return
  fi

  echo ""
  while IFS=" " read -r PID LOCAL_PORT SVC NS; do
    [[ -z "$PID" ]] && continue

    # Check if the port is actually accepting connections
    if command -v nc &>/dev/null; then
      if nc -z localhost "$LOCAL_PORT" &>/dev/null 2>&1; then
        REACHABLE="${GREEN}reachable${NC}"
      else
        REACHABLE="${RED}not reachable${NC}"
      fi
    else
      REACHABLE="${YELLOW}(nc not found, skipping check)${NC}"
    fi

    echo -e "  ${BLUE}${SVC}${NC}  (namespace: ${NS})"
    echo -e "    PID      : $PID"
    echo -e "    Port     : localhost:${LOCAL_PORT}"
    echo -e "    Status   : $(echo -e "$REACHABLE")"
    echo ""
  done <<< "$ROWS"

  echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

# --------------------------------------------------------------------------- #
# STOP command
# --------------------------------------------------------------------------- #
cmd_stop() {
  local TARGET="$1"  # empty = stop all

  local ROWS
  ROWS=$(find_active_forwards)

  if [[ -z "$ROWS" ]]; then
    log_warn "No active Feast port-forwards found — nothing to stop."
    return
  fi

  local KILLED=0
  while IFS=" " read -r PID LOCAL_PORT SVC NS; do
    [[ -z "$PID" ]] && continue

    # If a specific CRD name was given, skip non-matching services
    # Service name is feast-{crd-name}-registry-rest, so check if $TARGET is contained
    if [[ -n "$TARGET" ]] && [[ "$SVC" != *"${TARGET}"* ]]; then
      continue
    fi

    if kill "$PID" 2>/dev/null; then
      log_ok "Stopped  $SVC  (localhost:${LOCAL_PORT}, PID $PID, namespace $NS)"
      KILLED=$((KILLED + 1))
    else
      log_warn "Could not kill PID $PID — may have already exited"
    fi
  done <<< "$ROWS"

  if [[ "$KILLED" -eq 0 ]]; then
    if [[ -n "$TARGET" ]]; then
      log_warn "No running port-forward matched '${TARGET}'."
      echo ""
      echo "  Run  ./packages/feature-store/scripts/feast-dev-portforward.sh status  to see what's active."
    else
      log_warn "Nothing was stopped."
    fi
  else
    log_ok "Stopped $KILLED port-forward(s)."
  fi
}

# --------------------------------------------------------------------------- #
# Dispatch non-start subcommands early (no cluster connection needed)
# --------------------------------------------------------------------------- #
if [[ "$SUBCOMMAND" == "status" ]]; then
  cmd_status
  exit 0
fi

if [[ "$SUBCOMMAND" == "stop" ]]; then
  cmd_stop "$STOP_TARGET"
  exit 0
fi

# --------------------------------------------------------------------------- #
# From here: START command
# --------------------------------------------------------------------------- #

# --------------------------------------------------------------------------- #
# Dependency checks
# --------------------------------------------------------------------------- #
KUBECTL=""
if command -v kubectl &>/dev/null; then
  KUBECTL="kubectl"
elif command -v oc &>/dev/null; then
  KUBECTL="oc"
else
  log_error "Neither kubectl nor oc found in PATH. Please install one."
  exit 1
fi

if ! command -v jq &>/dev/null; then
  log_error "jq is required but not found."
  echo "  macOS:  brew install jq"
  echo "  RHEL:   sudo dnf install jq"
  exit 1
fi

if ! command -v python3 &>/dev/null; then
  log_error "python3 is required but not found."
  echo "  macOS:  python3 ships with Xcode CLI tools (xcode-select --install)"
  echo "  RHEL:   sudo dnf install python3"
  exit 1
fi

log_info "Using CLI: $KUBECTL"

# --------------------------------------------------------------------------- #
# Cluster connectivity check
# --------------------------------------------------------------------------- #
log_info "Checking cluster connectivity..."

if ! "$KUBECTL" cluster-info &>/dev/null 2>&1; then
  log_error "Cannot connect to the cluster. Are you logged in?"
  echo ""
  echo "  Try: oc login --server=<url> -u <user> -p <password>"
  echo "   or: kubectl config use-context <ctx>"
  exit 1
fi

CURRENT_SERVER=$("$KUBECTL" config view --minify -o jsonpath='{.clusters[0].cluster.server}' 2>/dev/null || echo "unknown")
CURRENT_USER=$("$KUBECTL" auth whoami --output=jsonpath='{.status.userInfo.username}' 2>/dev/null \
  || "$KUBECTL" config view --minify -o jsonpath='{.users[0].user.username}' 2>/dev/null \
  || echo "unknown")

log_ok "Cluster : $CURRENT_SERVER"
log_ok "User    : $CURRENT_USER"
echo ""

# --------------------------------------------------------------------------- #
# Discover Feast-enabled namespaces
# --------------------------------------------------------------------------- #
log_info "Discovering namespaces with label opendatahub.io/feast=true ..."

NAMESPACES=()

if "$KUBECTL" api-resources --api-group=project.openshift.io 2>/dev/null | grep -q projects; then
  RESOURCE="projects.project.openshift.io"
else
  RESOURCE="namespaces"
fi

while IFS= read -r ns; do
  [[ -n "$ns" ]] && NAMESPACES+=("$ns")
done < <("$KUBECTL" get "$RESOURCE" \
    -l 'opendatahub.io/feast=true' \
    -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' 2>/dev/null || true)

if [[ ${#NAMESPACES[@]} -eq 0 ]]; then
  log_warn "No namespaces found with label 'opendatahub.io/feast=true'."
  echo ""
  echo "  To label an existing namespace:"
  echo "    $KUBECTL label namespace <ns> opendatahub.io/feast=true"
  echo ""
  echo "  Or list all accessible namespaces:"
  echo "    $KUBECTL get $RESOURCE"
  exit 0
fi

log_ok "Found ${#NAMESPACES[@]} Feast namespace(s): ${NAMESPACES[*]}"
echo ""

# --------------------------------------------------------------------------- #
# Discover FeatureStore CRDs with feature-store-ui=enabled
# --------------------------------------------------------------------------- #
log_info "Scanning for FeatureStore CRDs with label feature-store-ui=enabled ..."

# Parallel indexed arrays (bash 3.2 compatible — no associative arrays)
CRD_NAMES=()
CRD_NS_LIST=()    # same index as CRD_NAMES
CRD_TLS_LIST=()   # same index as CRD_NAMES

for NS in "${NAMESPACES[@]}"; do
  CRD_JSON=$("$KUBECTL" get featurestores.feast.dev \
    -n "$NS" \
    -l 'feature-store-ui=enabled' \
    -o json 2>/dev/null || echo '{"items":[]}')

  COUNT=$(echo "$CRD_JSON" | jq '.items | length')
  if [[ "$COUNT" -eq 0 ]]; then
    log_info "  namespace $NS — no enabled FeatureStore CRDs"
    continue
  fi

  while IFS= read -r CRD_NAME; do
    [[ -z "$CRD_NAME" ]] && continue

    TLS_DISABLE=$(echo "$CRD_JSON" | jq -r \
      --arg n "$CRD_NAME" \
      '.items[] | select(.metadata.name == $n)
       | .spec.services.registry.local.server.tls.disable // false')

    CRD_NAMES+=("$CRD_NAME")
    CRD_NS_LIST+=("$NS")
    CRD_TLS_LIST+=("$TLS_DISABLE")

    PROTO=$([[ "$TLS_DISABLE" == "true" ]] && echo "http/80" || echo "https/443")
    log_ok "  namespace $NS  →  $CRD_NAME  [$PROTO]"
  done < <(echo "$CRD_JSON" | jq -r '.items[].metadata.name')
done

if [[ ${#CRD_NAMES[@]} -eq 0 ]]; then
  log_warn "No FeatureStore CRDs with 'feature-store-ui=enabled' found in any namespace."
  echo ""
  echo "  To enable the UI for a FeatureStore:"
  echo "    $KUBECTL label featurestore <name> -n <ns> feature-store-ui=enabled"
  exit 0
fi

log_ok "Total FeatureStore(s) to forward: ${#CRD_NAMES[@]}"

# --------------------------------------------------------------------------- #
# Detect CRD name collisions across namespaces
# --------------------------------------------------------------------------- #
# The backend derives the env var from the service name (feast-{crd-name}-registry-rest)
# without including the namespace. Two CRDs with the same name in different namespaces
# map to the same env var — only the last one written to .env.local will be used.
SEEN_NAMES=()
COLLISION_FOUND=false

IDX=0
for CRD_NAME in "${CRD_NAMES[@]}"; do
  for SEEN in "${SEEN_NAMES[@]:-}"; do
    if [[ "$SEEN" == "$CRD_NAME" ]]; then
      if [[ "$COLLISION_FOUND" == "false" ]]; then
        echo ""
        echo -e "${YELLOW}┌─────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${YELLOW}│  WARNING: CRD name collision detected                       │${NC}"
        echo -e "${YELLOW}└─────────────────────────────────────────────────────────────┘${NC}"
        COLLISION_FOUND=true
      fi
      NS="${CRD_NS_LIST[$IDX]}"
      SVC_NAME="feast-${CRD_NAME}-registry-rest"
      ENV_VAR="FEAST_$(echo "$SVC_NAME" | tr '[:lower:]-' '[:upper:]_')_PORT"
      echo -e "${YELLOW}  CRD name '${CRD_NAME}' exists in multiple namespaces.${NC}"
      echo -e "${YELLOW}  Both map to env var: ${ENV_VAR}${NC}"
      echo -e "${YELLOW}  Only one namespace will work in local dev (last port wins).${NC}"
      echo -e "${YELLOW}  Affected: $(grep "$CRD_NAME" <<< "${CRD_NAMES[*]}" || true)${NC}"
      echo ""
      echo -e "  To fix, rename one of the FeatureStore CRDs on the cluster:"
      echo -e "    Namespace with conflict: ${NS}"
      echo ""
    fi
  done
  SEEN_NAMES+=("$CRD_NAME")
  IDX=$((IDX + 1))
done

echo ""

# --------------------------------------------------------------------------- #
# Kill any stale port-forwards for the same services before starting fresh ones
# --------------------------------------------------------------------------- #
kill_stale_forward() {
  local SVC="$1" NS="$2"
  local PIDS
  PIDS=$(ps -eo pid,args | grep "port-forward" | grep -F "svc/$SVC" | grep -F -- "-n $NS" | grep -v grep | awk '{print $1}' || true)
  if [[ -n "$PIDS" ]]; then
    log_info "Stopping stale port-forward for $SVC in $NS (PIDs: $PIDS)"
    for pid in $PIDS; do kill "$pid" 2>/dev/null || true; done
    sleep 0.5
  fi
}

# --------------------------------------------------------------------------- #
# Assign ports and start port-forwards
# --------------------------------------------------------------------------- #
PORT_LIST=()
PF_PIDS=()
PF_LOG_FILES=()
ENV_LINES=()

CURRENT_PORT=$BASE_PORT
IDX=0

for CRD_NAME in "${CRD_NAMES[@]}"; do
  NS="${CRD_NS_LIST[$IDX]}"
  TLS_DISABLE="${CRD_TLS_LIST[$IDX]}"

  # Service name follows the convention in featureStoreUtils.ts
  SVC_NAME="feast-${CRD_NAME}-registry-rest"

  TARGET_PORT=$([[ "$TLS_DISABLE" == "true" ]] && echo 80 || echo 443)
  PROTOCOL=$([[ "$TLS_DISABLE" == "true" ]] && echo "http" || echo "https")

  LOCAL_PORT=$CURRENT_PORT
  PORT_LIST+=("$LOCAL_PORT")
  ((CURRENT_PORT++))

  # Env var: FEAST_<SVC_NAME_UPPER_UNDERSCORE>_PORT
  # e.g., feast-credit-test-registry-rest → FEAST_FEAST_CREDIT_TEST_REGISTRY_REST_PORT
  ENV_VAR="FEAST_$(echo "$SVC_NAME" | tr '[:lower:]-' '[:upper:]_')_PORT"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${YELLOW}[DRY-RUN]${NC} $KUBECTL port-forward svc/$SVC_NAME $LOCAL_PORT:$TARGET_PORT -n $NS"
    echo -e "  ${YELLOW}[DRY-RUN]${NC} .env.local ← ${ENV_VAR}=${LOCAL_PORT}"
    echo ""
    ENV_LINES+=("${ENV_VAR}=${LOCAL_PORT}  # $SVC_NAME in $NS")
    IDX=$((IDX + 1))
    continue
  fi

  kill_stale_forward "$SVC_NAME" "$NS"

  LOG_FILE=$(mktemp /tmp/feast-pf-XXXXXX)
  PF_LOG_FILES+=("$LOG_FILE")

  "$KUBECTL" port-forward "svc/$SVC_NAME" "$LOCAL_PORT:$TARGET_PORT" -n "$NS" \
    >"$LOG_FILE" 2>&1 &
  PF_PID=$!
  PF_PIDS+=("$PF_PID")

  sleep 1

  if ! kill -0 "$PF_PID" 2>/dev/null; then
    log_error "Port-forward failed for $SVC_NAME — check: $LOG_FILE"
    cat "$LOG_FILE" >&2
    PORT_LIST[$IDX]="FAILED"
    IDX=$((IDX + 1))
    continue
  fi

  # Only write the env var if the process is confirmed alive
  ENV_LINES+=("${ENV_VAR}=${LOCAL_PORT}  # $SVC_NAME in $NS")
  log_ok "  localhost:${LOCAL_PORT} ↔ ${SVC_NAME}:${TARGET_PORT}  (${PROTOCOL}, namespace $NS, PID $PF_PID)"
  IDX=$((IDX + 1))
done

# --------------------------------------------------------------------------- #
# Update .env.local
# --------------------------------------------------------------------------- #
MARKER_BEGIN="## BEGIN feast-dev-portforward (auto-generated — do not edit this block manually)"
MARKER_END="## END feast-dev-portforward"

update_env_local() {
  local ENV_BLOCK
  ENV_BLOCK="${MARKER_BEGIN}
# Generated by scripts/feast-dev-portforward.sh on $(date)
# Cluster: ${CURRENT_SERVER}
# User:    ${CURRENT_USER}
# FEAST_REGISTRY_SERVICE_PORT is the fallback used when no per-service port var is set.
# It is set to the base port (${BASE_PORT}), which is the port of the first forwarded service.
FEAST_REGISTRY_SERVICE_PORT=${BASE_PORT}"

  for LINE in "${ENV_LINES[@]}"; do
    ENV_BLOCK="${ENV_BLOCK}
${LINE}"
  done
  ENV_BLOCK="${ENV_BLOCK}
${MARKER_END}"

  if [[ ! -f "$ENV_FILE" ]]; then
    log_warn ".env.local not found at $ENV_FILE — creating it."
    touch "$ENV_FILE"
  fi

  if grep -qF "$MARKER_BEGIN" "$ENV_FILE"; then
    ENV_FILE="$ENV_FILE" ENV_BLOCK="$ENV_BLOCK" \
      MARKER_BEGIN="$MARKER_BEGIN" MARKER_END="$MARKER_END" \
      python3 - <<'PYEOF'
import re, pathlib, os

env_file = pathlib.Path(os.environ['ENV_FILE'])
new_block = os.environ['ENV_BLOCK']
begin  = os.environ['MARKER_BEGIN']
end    = os.environ['MARKER_END']

content = env_file.read_text()
pattern = re.compile(
    r'(?:\n)?[ \t]*' + re.escape(begin) + r'.*?' + re.escape(end) + r'[ \t]*(?:\n)?',
    re.DOTALL,
)
replaced = pattern.sub('\n' + new_block + '\n', content, count=1)
if replaced == content:
    replaced = content.rstrip('\n') + '\n\n' + new_block + '\n'
env_file.write_text(replaced)
PYEOF
    log_ok "Updated FEAST block in $ENV_FILE"
  else
    { echo ""; echo "$ENV_BLOCK"; } >> "$ENV_FILE"
    log_ok "Appended FEAST block to $ENV_FILE"
  fi
}

if [[ "$UPDATE_ENV" == "true" ]] && [[ ${#ENV_LINES[@]} -gt 0 ]]; then
  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}[DRY-RUN]${NC} Would write to $ENV_FILE:"
    echo ""
    echo "  $MARKER_BEGIN"
    echo "  FEAST_REGISTRY_SERVICE_PORT=$BASE_PORT"
    for LINE in "${ENV_LINES[@]}"; do echo "  $LINE"; done
    echo "  $MARKER_END"
    echo ""
  else
    update_env_local
  fi
fi

# --------------------------------------------------------------------------- #
# Summary table
# --------------------------------------------------------------------------- #
echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${GREEN}  Feast Dev Port-Forward Summary${NC}"
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
IDX=0
for CRD_NAME in "${CRD_NAMES[@]}"; do
  NS="${CRD_NS_LIST[$IDX]}"
  TLS_DISABLE="${CRD_TLS_LIST[$IDX]}"
  TARGET_PORT=$([[ "$TLS_DISABLE" == "true" ]] && echo 80 || echo 443)
  SVC_NAME="feast-${CRD_NAME}-registry-rest"
  LOCAL_PORT="${PORT_LIST[$IDX]:-FAILED}"
  echo -e "  ${BLUE}$CRD_NAME${NC}  (namespace: $NS)"
  echo -e "    Service  : $SVC_NAME"
  echo -e "    Forward  : localhost:${LOCAL_PORT} → svc:${TARGET_PORT}"
  IDX=$((IDX + 1))
done
echo ""
if [[ "$DRY_RUN" != "true" ]] && [[ ${#PF_PIDS[@]} -gt 0 ]]; then
  echo -e "  Active PIDs : ${PF_PIDS[*]}"
  echo ""
  echo -e "  ${YELLOW}Press Ctrl+C to stop all port-forwards and exit${NC}"
  echo -e "  Or in another terminal:"
  echo -e "    ${YELLOW}./packages/feature-store/scripts/feast-dev-portforward.sh stop${NC}"
fi
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# --------------------------------------------------------------------------- #
# Stay alive with a live monitor — prints when a forward dies or is killed
# --------------------------------------------------------------------------- #
if [[ "$DRY_RUN" != "true" ]] && [[ ${#PF_PIDS[@]} -gt 0 ]]; then
  cleanup() {
    echo ""
    log_info "Stopping all port-forwards..."
    for PID in "${PF_PIDS[@]}"; do
      kill "$PID" 2>/dev/null && log_ok "Stopped PID $PID" || true
    done
    for LOG in "${PF_LOG_FILES[@]}"; do
      rm -f "$LOG"
    done
    echo ""
    log_warn "Port-forwards stopped. Run the script again before your next dev session."
    echo ""
  }
  trap cleanup SIGINT SIGTERM

  # Parallel array tracking which PIDs have already been reported as dead
  PF_REPORTED=()
  for _ in "${PF_PIDS[@]}"; do PF_REPORTED+=(false); done

  MONITOR_INTERVAL=5   # seconds between liveness checks
  HEARTBEAT_EVERY=60   # print "all OK" line every N seconds
  LAST_HEARTBEAT=0

  echo -e "  ${BLUE}[MONITOR]${NC} Watching ${#PF_PIDS[@]} port-forward(s) — Ctrl+C to stop all"
  echo ""

  while true; do
    sleep "$MONITOR_INTERVAL"

    NOW=$(date +%s)
    ALIVE=0
    IDX=0

    for PID in "${PF_PIDS[@]}"; do
      SVC_NAME="feast-${CRD_NAMES[$IDX]}-registry-rest"
      LOCAL_PORT="${PORT_LIST[$IDX]:-?}"

      if kill -0 "$PID" 2>/dev/null; then
        ALIVE=$((ALIVE + 1))
      else
        if [[ "${PF_REPORTED[$IDX]}" == "false" ]]; then
          echo -e "  ${RED}[DOWN]${NC}  $(date '+%H:%M:%S')  $SVC_NAME  localhost:${LOCAL_PORT}  (PID $PID exited)"
          PF_REPORTED[$IDX]=true
        fi
      fi
      IDX=$((IDX + 1))
    done

    # Exit once all are gone
    if [[ "$ALIVE" -eq 0 ]]; then
      echo ""
      log_warn "All port-forwards have stopped."
      for LOG in "${PF_LOG_FILES[@]}"; do rm -f "$LOG"; done
      echo ""
      log_warn "Port-forwards stopped. Run the script again before your next dev session."
      echo ""
      break
    fi

    # Periodic heartbeat so you know it's still watching
    if (( NOW - LAST_HEARTBEAT >= HEARTBEAT_EVERY )); then
      echo -e "  ${GREEN}[OK]${NC}    $(date '+%H:%M:%S')  ${ALIVE}/${#PF_PIDS[@]} port-forward(s) active"
      LAST_HEARTBEAT=$NOW
    fi
  done
fi
