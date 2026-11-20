#!/usr/bin/env bash
# Live-cluster validation of Core BFF caller authentication and the caller
# credential policy (RHOAIENG-96081, RHOAIENG-101218).
#
# It creates a throwaway namespace with a ServiceAccount that may create
# ServingRuntimes and list/watch pods there, but holds no cluster-scoped
# permission (in particular no Namespace patch). It then drives a Core BFF with
# that ServiceAccount's token and with an admin token, and prints one PASS/FAIL
# row per check. Token values are never printed. The namespace is deleted on exit.
#
# Usage (from distributions/core-bff):
#   scripts/validate-caller-auth.sh                 # xKS mode, starts a local BFF
#   PLATFORM=OpenShift scripts/validate-caller-auth.sh
#   BFF_URL=https://dashboard.example.com scripts/validate-caller-auth.sh   # an already running BFF
#
# Environment:
#   PLATFORM     XKS (default) or OpenShift. Selects the expectations and, for a
#                local BFF, the --platform-type and token-header settings.
#   BFF_URL      Use a running BFF instead of starting one. It must be configured
#                for PLATFORM. A local BFF is started from ./bff otherwise, using
#                the current kubeconfig context as its service account.
#   ADMIN_TOKEN  Token of a caller who may patch namespaces. Defaults to
#                `oc whoami -t` when oc is logged in; admin rows are skipped without one.
#   KEEP_NAMESPACE=true  Do not delete the test namespace on exit.
set -euo pipefail

PLATFORM=${PLATFORM:-XKS}
NS=${TEST_NAMESPACE:-corebff-caller-auth-$RANDOM}
DASHBOARD_NS=${DASHBOARD_NAMESPACE:-opendatahub}
PORT=${PORT:-4321}
here=$(cd "$(dirname "$0")/.." && pwd)
work=$(mktemp -d)
bff_pid=""
ns_created=false
fails=0

for tool in kubectl curl; do
  command -v "$tool" >/dev/null 2>&1 || { echo >&2 "$tool is required"; exit 1; }
done

cleanup() {
  [[ -n "$bff_pid" ]] && kill "$bff_pid" 2>/dev/null || true
  # Only delete a namespace this run created: a name that already existed (for
  # example a TEST_NAMESPACE collision) is never touched.
  if [[ "$ns_created" == "true" && "${KEEP_NAMESPACE:-false}" != "true" ]]; then
    kubectl delete namespace "$NS" --wait=false >/dev/null 2>&1 || true
  fi
  rm -rf "$work"
}
trap cleanup EXIT

# A BFF started here must own PORT: if something already listens there, the
# checks below would run against that process instead. Refuse before creating
# anything on the cluster.
# curl exits 7 only when nothing accepts the connection (IPv4 or IPv6).
port_free() {
  local rc=0
  curl -s -o /dev/null --connect-timeout 2 "http://localhost:$1/" || rc=$?
  [[ $rc -eq 7 ]]
}
if [[ -z "${BFF_URL:-}" ]] && ! port_free "$PORT"; then
  echo >&2 "port $PORT is already in use; stop that process or set PORT to a free port"
  exit 1
fi

echo "Cluster: $(kubectl config current-context)  namespace: $NS  platform: $PLATFORM"
if ! kubectl create namespace "$NS" >/dev/null; then
  echo >&2 "could not create namespace $NS (it may already exist); not touching it"
  exit 1
fi
ns_created=true
kubectl label namespace "$NS" purpose=core-bff-caller-auth-validation >/dev/null
kubectl -n "$NS" create serviceaccount caller-test >/dev/null
kubectl apply -f - >/dev/null <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata: {name: serving-editor, namespace: $NS}
rules:
  - apiGroups: ["serving.kserve.io"]
    resources: ["servingruntimes"]
    verbs: ["get", "list", "watch", "create"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata: {name: serving-editor, namespace: $NS}
subjects: [{kind: ServiceAccount, name: caller-test, namespace: $NS}]
roleRef: {kind: Role, name: serving-editor, apiGroup: rbac.authorization.k8s.io}
EOF
SA=$(kubectl -n "$NS" create token caller-test --duration=1h)
AD=${ADMIN_TOKEN:-$(command -v oc >/dev/null 2>&1 && oc whoami -t 2>/dev/null || true)}

if [[ -z "${BFF_URL:-}" ]]; then
  args=(--port "$PORT" --platform-type="$PLATFORM" --namespace="$DASHBOARD_NS" --static-assets-dir="$here/bff/static")
  [[ "$PLATFORM" == "XKS" ]] && args+=(--auth-token-headers=Authorization,x-forwarded-access-token)
  (cd "$here/bff" && go build -o "$work/core-bff" ./cmd)
  LOG_LEVEL=debug "$work/core-bff" "${args[@]}" >"$work/bff.log" 2>&1 &
  bff_pid=$!
  BFF_URL=http://localhost:$PORT
  ready=false
  for _ in $(seq 1 60); do
    if ! kill -0 "$bff_pid" 2>/dev/null; then
      echo >&2 "core-bff exited during startup; last log lines:"
      tail -n 20 "$work/bff.log" >&2
      exit 1
    fi
    if curl -sf "$BFF_URL/healthcheck" >/dev/null; then ready=true; break; fi
    sleep 1
  done
  if [[ "$ready" != "true" ]]; then
    echo >&2 "core-bff did not become ready on port $PORT within 60s; last log lines:"
    tail -n 20 "$work/bff.log" >&2
    exit 1
  fi
fi
B=$BFF_URL

code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
body() { curl -s "$@"; }
check() { # id description expected actual
  local verdict=PASS
  [[ "$3" == "$4" ]] || { verdict=FAIL; fails=$((fails + 1)); }
  printf '%-4s %-58s expect %-18s got %-18s %s\n' "$1" "$2" "$3" "$4" "$verdict"
}
skip() { printf '%-4s %-58s SKIP (%s)\n' "$1" "$2" "$3"; }
ns_label() { kubectl get namespace "$NS" -o jsonpath='{.metadata.labels.modelmesh-enabled}'; }

if [[ "$PLATFORM" == "XKS" ]]; then
  H=Authorization; V="Bearer $SA"
else
  H=x-forwarded-access-token; V=$SA
fi

echo "== Caller credential headers =="
if [[ "$PLATFORM" == "XKS" ]]; then
  check H1 "Authorization: Bearer" 200 "$(code -H "Authorization: Bearer $SA" "$B/api/v1/user")"
  check H2 "x-forwarded-access-token" 200 "$(code -H "x-forwarded-access-token: $SA" "$B/api/v1/user")"
  check H3 "both headers, same token" 200 "$(code -H "Authorization: Bearer $SA" -H "x-forwarded-access-token: $SA" "$B/api/v1/user")"
  check H4 "both headers, different tokens" 401 "$(code -H "Authorization: Bearer $SA" -H "x-forwarded-access-token: other-token" "$B/api/v1/user")"
  check H5 "Basic scheme with a valid fallback (no fall-through)" 401 "$(code -H "Authorization: Basic dXNlcjpwYXNz" -H "x-forwarded-access-token: $SA" "$B/api/v1/user")"
else
  check H1 "x-forwarded-access-token" 200 "$(code -H "x-forwarded-access-token: $SA" "$B/api/v1/user")"
  check H2 "Authorization alone is not read (single-header mode)" 401 "$(code -H "Authorization: Bearer $SA" "$B/api/v1/user")"
fi
check H6 "no credential" 401 "$(code "$B/api/v1/user")"
check H7 "token the API server rejects" 401 "$(code -H "$H: ${V%"$SA"}not-a-real-token" "$B/api/v1/user")"
check H8 "identity headers without a credential" 401 "$(code -H "X-Forwarded-User: admin" -H "Impersonate-User: admin" "$B/api/v1/user")"

echo "== Kubernetes HTTP proxy =="
check P1 "caller lists pods in its namespace" 200 "$(code -H "$H: $V" "$B/api/k8s/api/v1/namespaces/$NS/pods")"
check P2 "caller lists all namespaces (not permitted)" 403 "$(code -H "$H: $V" "$B/api/k8s/api/v1/namespaces")"
check P3 "Impersonate-User/Group spoof is stripped" 403 "$(code -H "$H: $V" -H "Impersonate-User: system:admin" -H "Impersonate-Group: system:masters" "$B/api/k8s/api/v1/namespaces")"
check P4 "X-Remote-User spoof is stripped" 403 "$(code -H "$H: $V" -H "X-Remote-User: system:admin" -H "X-Remote-Group: system:masters" "$B/api/k8s/api/v1/namespaces")"
check P5 "no credential: the BFF identity must not act" 401 "$(code "$B/api/k8s/api/v1/namespaces")"
sr='{"apiVersion":"serving.kserve.io/v1alpha1","kind":"ServingRuntime","metadata":{"name":"probe"},"spec":{"containers":[{"name":"kserve-container","image":"quay.io/example/probe:1"}],"supportedModelFormats":[{"name":"onnx"}]}}'
check P6 "caller dry-run creates a ServingRuntime where allowed" 201 "$(code -X POST -H "$H: $V" -H 'Content-Type: application/json' -d "$sr" "$B/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/$NS/servingruntimes?dryRun=All")"
check P7 "caller dry-run create where not allowed" 403 "$(code -X POST -H "$H: $V" -H 'Content-Type: application/json' -d "$sr" "$B/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/default/servingruntimes?dryRun=All")"

echo "== Kubernetes WebSocket proxy =="
ws_module=$(cd "$here" && node -e 'try{console.log(require.resolve("ws"))}catch{}' 2>/dev/null || true)
if [[ -n "$ws_module" ]]; then
  cat >"$work/ws.js" <<'EOF'
const WebSocket = require(process.env.WS_MODULE);
const [url, ...kv] = process.argv.slice(2);
const headers = {};
for (let i = 0; i + 1 < kv.length; i += 2) headers[kv[i]] = kv[i + 1];
const ws = new WebSocket(url, [], { headers, origin: new URL(url).origin.replace(/^ws/, 'http') });
const done = (s) => { console.log(s); try { ws.terminate(); } catch {} process.exit(0); };
ws.on('upgrade', (res) => done(String(res.statusCode)));
ws.on('unexpected-response', (_q, res) => done(String(res.statusCode)));
ws.on('error', (e) => done('error'));
setTimeout(() => done('timeout'), 8000);
EOF
  wsb=${B/#http/ws}
  ws() { WS_MODULE=$ws_module node "$work/ws.js" "$@"; }
  check W1 "caller watches pods in its namespace" 101 "$(ws "$wsb/wss/k8s/api/v1/namespaces/$NS/pods?watch=true" "$H" "$V")"
  check W2 "caller watches all namespaces (not permitted)" 403 "$(ws "$wsb/wss/k8s/api/v1/namespaces?watch=true" "$H" "$V")"
  check W3 "no credential" 401 "$(ws "$wsb/wss/k8s/api/v1/namespaces/$NS/pods?watch=true")"
else
  skip W1-3 "WebSocket checks" "node with the ws package not found"
fi

echo "== Namespace mutation (credential policy) =="
if [[ "$PLATFORM" == "XKS" ]]; then
  check M1 "caller without Namespace patch, dry run" '{"applied":false}' "$(body -H "$H: $V" "$B/api/namespaces/$NS/1?dryRun=All")"
  check M2 "caller without Namespace patch" '{"applied":false}' "$(body -H "$H: $V" "$B/api/namespaces/$NS/1")"
  check M3 "  ...and nothing was written" "" "$(ns_label)"
else
  check M1 "service account applies after the caller's SSAR" '{"applied":true}' "$(body -H "$H: $V" "$B/api/namespaces/$NS/1")"
  check M2 "  ...label written by the service account" "false" "$(ns_label)"
fi
check M4 "caller who fails the access review" 403 "$(code -H "$H: $V" "$B/api/namespaces/default/1")"
if [[ -n "$AD" ]]; then
  AH=$H; AV=${V%"$SA"}$AD
  check M5 "admin applies the mutation" '{"applied":true}' "$(body -H "$AH: $AV" "$B/api/namespaces/$NS/1")"
  check M6 "admin resets the platform" '{"applied":true}' "$(body -H "$AH: $AV" "$B/api/namespaces/$NS/3")"
else
  skip M5-6 "admin mutation" "no ADMIN_TOKEN"
fi

if [[ -n "$bff_pid" ]]; then
  echo "== Logs =="
  leaks=$(grep -cF "$SA" "$work/bff.log" || true)
  [[ -n "$AD" ]] && leaks=$((leaks + $(grep -cF "$AD" "$work/bff.log" || true)))
  check L1 "token values in the debug log" 0 "$leaks"
fi

echo
if ((fails > 0)); then
  echo "$fails check(s) failed"
  exit 1
fi
echo "all checks passed"
