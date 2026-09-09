#!/usr/bin/env bash
# Verify the downstream image can reach a ROSA-hosted OpenShell gateway.
set -euo pipefail

required=(AGENT_OPS_IMAGE OPENSHELL_GATEWAY_URL ROSA_BEARER_TOKEN OPENSHELL_WORKSPACE)
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
curl_config="$(mktemp "${TMPDIR:-/tmp}/agent-ops-rosa-curl.XXXXXX")"
chmod 600 "$curl_config"
printf '%s\n' "header = Authorization: Bearer $ROSA_BEARER_TOKEN" > "$curl_config"

show_container_logs() {
  echo "Container logs for $container_name:" >&2
  "$CONTAINER_TOOL" logs "$container_name" >&2 || true
}

cleanup() {
  "$CONTAINER_TOOL" rm --force "$container_name" >/dev/null 2>&1 || true
  rm -f "$curl_config"
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

# This is deliberately read-only. Upstream owns sandbox lifecycle behavior.
if ! curl "${curl_args[@]}" --fail --output /dev/null \
  --config "$curl_config" \
  "$base_url/api/v1/workspaces/$OPENSHELL_WORKSPACE"; then
  show_container_logs
  exit 1
fi

echo "ROSA gateway integration check passed for workspace $OPENSHELL_WORKSPACE."
