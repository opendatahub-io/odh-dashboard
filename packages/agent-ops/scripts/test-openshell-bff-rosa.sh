#!/usr/bin/env bash
# Verify the downstream image and an authenticated user flow against OpenShell.
set -euo pipefail

required=(
  AGENT_OPS_IMAGE
  OPENSHELL_GATEWAY_URL
  OPENSHELL_SANDBOX_IMAGE
  OPENSHELL_WORKSPACE
  ROSA_BEARER_TOKEN
)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "ERROR: $name is required" >&2
    exit 2
  fi
done

if [[ ! "$OPENSHELL_WORKSPACE" =~ ^[a-z0-9]([-a-z0-9]*[a-z0-9])?$ ]] || (( ${#OPENSHELL_WORKSPACE} > 63 )); then
  echo "ERROR: OPENSHELL_WORKSPACE must be a DNS-1123 label" >&2
  exit 2
fi
if [[ "$ROSA_BEARER_TOKEN" == *$'\n'* || "$ROSA_BEARER_TOKEN" == *$'\r'* ]]; then
  echo "ERROR: ROSA_BEARER_TOKEN must not contain a newline" >&2
  exit 2
fi

CONTAINER_TOOL="${CONTAINER_TOOL:-docker}"
if [[ "$CONTAINER_TOOL" != "docker" && "$CONTAINER_TOOL" != "podman" ]]; then
  echo "ERROR: CONTAINER_TOOL must be docker or podman" >&2
  exit 2
fi
if ! command -v "$CONTAINER_TOOL" >/dev/null 2>&1; then
  echo "ERROR: $CONTAINER_TOOL is not installed" >&2
  exit 1
fi

tls_args=()
if [[ -n "${GATEWAY_CERT_DIR:-}" ]]; then
  for certificate in ca.crt tls.crt tls.key; do
    if [[ ! -f "$GATEWAY_CERT_DIR/$certificate" ]]; then
      echo "ERROR: GATEWAY_CERT_DIR must contain $certificate" >&2
      exit 2
    fi
  done
  tls_args=(
    --volume "$GATEWAY_CERT_DIR:/etc/openshell-gateway:ro"
    --env GATEWAY_CA_CERT=/etc/openshell-gateway/ca.crt
    --env GATEWAY_CLIENT_CERT=/etc/openshell-gateway/tls.crt
    --env GATEWAY_CLIENT_KEY=/etc/openshell-gateway/tls.key
  )
fi

host_port="${AGENT_OPS_PORT:-4021}"
container_name="agent-ops-rosa-poc-$RANDOM"
base_url="http://127.0.0.1:$host_port"
curl_args=(--silent --show-error --connect-timeout 5 --max-time 15)
invalid_bearer_token="invalid-agent-ops-token"

show_container_logs() {
  local container_logs
  container_logs="$("$CONTAINER_TOOL" logs "$container_name" 2>&1 || true)"
  container_logs="${container_logs//"$ROSA_BEARER_TOKEN"/[REDACTED]}"
  container_logs="${container_logs//"$invalid_bearer_token"/[REDACTED]}"
  echo "Container logs for $container_name:" >&2
  printf '%s\n' "$container_logs" >&2
}

assert_logs_do_not_contain_tokens() {
  local container_logs
  container_logs="$("$CONTAINER_TOOL" logs "$container_name" 2>&1 || true)"
  if [[ "$container_logs" == *"$ROSA_BEARER_TOKEN"* || "$container_logs" == *"$invalid_bearer_token"* ]]; then
    echo "ERROR: BFF logs contain a bearer token" >&2
    return 1
  fi
}

cleanup() {
  "$CONTAINER_TOOL" rm --force "$container_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

if curl "${curl_args[@]}" --fail "$base_url/api/v1/healthz" >/dev/null 2>&1; then
  echo "ERROR: port $host_port is already in use by a healthy HTTP service" >&2
  exit 2
fi

"$CONTAINER_TOOL" run --detach --name "$container_name" \
  --publish "127.0.0.1:${host_port}:8080" \
  --env "OPENSHELL_GATEWAY_URL=$OPENSHELL_GATEWAY_URL" \
  "${tls_args[@]}" \
  "$AGENT_OPS_IMAGE" >/dev/null

ready=false
for _ in $(seq 1 30); do
  if curl "${curl_args[@]}" --fail "$base_url/api/v1/healthz" >/dev/null; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  echo "ERROR: BFF did not become healthy within 30 seconds" >&2
  show_container_logs
  exit 1
fi

gateway_ready=false
for _ in $(seq 1 30); do
  if curl "${curl_args[@]}" --fail "$base_url/api/v1/readyz" >/dev/null 2>&1; then
    gateway_ready=true
    break
  fi
  sleep 1
done
if [[ "$gateway_ready" != true ]]; then
  echo "ERROR: BFF did not reach the OpenShell gateway within 30 seconds" >&2
  show_container_logs
  exit 1
fi

test_status=0
OPENSHELL_BFF_URL="$base_url" \
OPENSHELL_INVALID_BEARER_TOKEN="$invalid_bearer_token" \
npx --no-install jest \
  --config ../contract-tests/jest.preset.js \
  --runInBand \
  --runTestsByPath contract-tests/__tests__/testOpenShellBffBlackBox.test.ts || test_status=$?

if ! assert_logs_do_not_contain_tokens; then
  exit 1
fi
if (( test_status != 0 )); then
  show_container_logs
  exit "$test_status"
fi

echo "ROSA gateway integration check passed for workspace $OPENSHELL_WORKSPACE."
