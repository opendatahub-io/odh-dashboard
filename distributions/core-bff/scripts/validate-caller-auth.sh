#!/usr/bin/env bash
# Live-cluster validation of Core BFF caller authentication and the caller
# credential policy (RHOAIENG-96081, RHOAIENG-101218).
#
# The kubeconfig must be able to create a Namespace, ServiceAccounts, Roles and
# RoleBindings, and on xKS a ClusterRole and ClusterRoleBinding scoped to that
# Namespace (the M7-8 positive control, skipped without it).
#
# It creates a throwaway namespace with a ServiceAccount that may create
# ServingRuntimes and list/watch pods there, but holds no cluster-scoped
# permission (in particular no Namespace patch). It then drives a Core BFF with
# that ServiceAccount's token and with an admin token, and prints one PASS/FAIL
# row per check. Token values are never printed and never passed on a command
# line: each credential header is written by the shell (a builtin, so no
# process argument) to a file only this user can read, and curl and the
# WebSocket client read it from there. The namespace is deleted on exit.
#
# Usage (from distributions/core-bff):
#   scripts/validate-caller-auth.sh                 # xKS mode, starts a local BFF
#   PLATFORM=OpenShift scripts/validate-caller-auth.sh
#   BFF_URL=https://dashboard.example.com scripts/validate-caller-auth.sh   # an already running BFF
#
# Environment:
#   PLATFORM     XKS (default) or OpenShift. Selects the expectations and, for a
#                local BFF, the --platform-type and token-header settings.
#   BFF_URL      Use a running BFF instead of starting one. It must be https://,
#                or http:// on a loopback host (localhost, 127.0.0.1, [::1]) for a
#                port-forward; tokens are never sent over remote plaintext. It must be configured
#                for PLATFORM. A local BFF is started from ./bff otherwise, using
#                the current kubeconfig context as its service account.
#   ADMIN_TOKEN  Token of a caller who may patch namespaces. Defaults to
#                `oc whoami -t` when oc is logged in; admin rows are skipped without one.
#   KEEP_NAMESPACE=true  Do not delete the test namespace on exit.
#   STRICT=true  Fail the run when any check is skipped (for example no node/ws,
#                no ServingRuntime CRD or no ADMIN_TOKEN).
set -euo pipefail
umask 077

PLATFORM=${PLATFORM:-XKS}
NS=${TEST_NAMESPACE:-corebff-caller-auth-$RANDOM}
DASHBOARD_NS=${DASHBOARD_NAMESPACE:-opendatahub}
PORT=${PORT:-4321}
here=$(cd "$(dirname "$0")/.." && pwd)
work=""
bff_pid=""
ns_created=false
cr_created=false
crb_created=false
# UIDs returned by a successful create; empty after an ambiguous result.
cr_uid=""
crb_uid=""
cleanup_failed=false
# Cluster-scoped objects this run creates carry RUN_LABEL=RUN_ID; cleanup
# deletes only this run's object, by UID.
RUN_LABEL=corebff-validate-run
RUN_ID=$(od -An -N8 -tx1 /dev/urandom | tr -d ' \n')
fails=0
skips=0

# The admin token is read once and removed from the environment, so the BFF,
# kubectl, curl and node started below never inherit it.
AD_INPUT=${ADMIN_TOKEN:-}
unset ADMIN_TOKEN

# Every curl call is bounded, so a BFF that accepts a connection and then
# stalls fails the run instead of hanging it.
CURL_TIMEOUTS=(--connect-timeout 5 --max-time 30)
# kubectl calls are bounded the same way.
KUBECTL=(kubectl --request-timeout=30s)

for tool in kubectl curl; do
  command -v "$tool" >/dev/null 2>&1 || { echo >&2 "$tool is required"; exit 1; }
done

# delete_owned removes a cluster-scoped RBAC object this run created, with a
# UID precondition so an object recreated under the same name is never
# deleted. With the UID from a successful create it deletes that object; after
# an ambiguous create it first reads the ownership label and deletes only an
# object carrying this run's value. Any failure to read or delete (other than
# NotFound) is reported with the object's name and fails the run.
delete_owned() {
  local resource=$1 name=$2 uid=$3 out meta run
  if [[ -z "$uid" ]]; then
    if ! out=$("${KUBECTL[@]}" get "$resource.rbac.authorization.k8s.io" "$name" \
      -o "jsonpath={.metadata.uid} {.metadata.labels.$RUN_LABEL}" 2>&1); then
      [[ "$out" == *"(NotFound)"* ]] && return 0
      cleanup_warn "$resource/$name" "could not read it to check its $RUN_LABEL=$RUN_ID label"
      return 0
    fi
    meta=$out
    uid=${meta%% *}
    run=${meta#* }
    [[ -n "$uid" && "$run" == "$RUN_ID" ]] || return 0
  fi
  printf '{"kind":"DeleteOptions","apiVersion":"v1","preconditions":{"uid":"%s"}}' "$uid" >"$work/delete-$resource.json"
  if ! out=$("${KUBECTL[@]}" delete --raw "/apis/rbac.authorization.k8s.io/v1/$resource/$name" \
    -f "$work/delete-$resource.json" 2>&1); then
    [[ "$out" == *"(NotFound)"* ]] && return 0
    cleanup_warn "$resource/$name" "delete failed"
  fi
}

cleanup_warn() {
  echo >&2 "cleanup: $1 (label $RUN_LABEL=$RUN_ID) may be left behind: $2; delete it by hand"
  cleanup_failed=true
}

cleanup() {
  local rc=$?
  if [[ -n "$bff_pid" ]]; then
    kill "$bff_pid" 2>/dev/null || true
    wait "$bff_pid" 2>/dev/null || true
  fi
  # Only delete a namespace this run created: a name that already existed (for
  # example a TEST_NAMESPACE collision) is never touched.
  # The cluster-scoped grant for the namespace-patch control is removed even
  # with KEEP_NAMESPACE: it names only this run's namespace, but is not left behind.
  # Each is deleted only if this run created it.
  if [[ "$crb_created" == "true" ]]; then
    delete_owned clusterrolebindings "corebff-validate-$NS" "$crb_uid"
  fi
  if [[ "$cr_created" == "true" ]]; then
    delete_owned clusterroles "corebff-validate-$NS" "$cr_uid"
  fi
  if [[ "$ns_created" == "true" && "${KEEP_NAMESPACE:-false}" != "true" ]]; then
    "${KUBECTL[@]}" delete namespace "$NS" --wait=false >/dev/null 2>&1 || true
  fi
  [[ -n "$work" ]] && rm -rf "$work"
  if [[ "$cleanup_failed" == "true" && $rc -eq 0 ]]; then
    exit 1
  fi
  return 0
}
trap cleanup EXIT
work=$(mktemp -d)
chmod 700 "$work"

# A BFF started here must own PORT: if something already listens there, the
# checks below would run against that process instead. Refuse before creating
# anything on the cluster.
# curl exits 7 only when nothing accepts the connection (IPv4 or IPv6).
port_free() {
  local rc=0
  curl -s -o /dev/null --connect-timeout 2 --max-time 5 "http://localhost:$1/" || rc=$?
  [[ $rc -eq 7 ]]
}
# Tokens are sent to BFF_URL, so a remote target must use TLS. Checked before
# any namespace or token is created.
loopback_http='^http://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?(/.*)?$'
if [[ -n "${BFF_URL:-}" && ! "$BFF_URL" =~ ^https:// && ! "$BFF_URL" =~ $loopback_http ]]; then
  echo >&2 "BFF_URL must be https://, or http:// on localhost, 127.0.0.1 or [::1]; refusing to send tokens over plaintext"
  exit 1
fi
if [[ -z "${BFF_URL:-}" ]] && ! port_free "$PORT"; then
  echo >&2 "port $PORT is already in use; stop that process or set PORT to a free port"
  exit 1
fi

echo "Cluster: $("${KUBECTL[@]}" config current-context)  namespace: $NS  platform: $PLATFORM"
if ! "${KUBECTL[@]}" create namespace "$NS" >/dev/null; then
  echo >&2 "could not create namespace $NS (it may already exist); not touching it"
  exit 1
fi
ns_created=true
"${KUBECTL[@]}" label namespace "$NS" purpose=core-bff-caller-auth-validation >/dev/null
"${KUBECTL[@]}" -n "$NS" create serviceaccount caller-test >/dev/null
"${KUBECTL[@]}" apply -f - >/dev/null <<EOF
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
SA=$("${KUBECTL[@]}" -n "$NS" create token caller-test --duration=1h)
AD=${AD_INPUT:-$(command -v oc >/dev/null 2>&1 && oc --request-timeout=30s whoami -t 2>/dev/null || true)}
unset AD_INPUT

if [[ -z "${BFF_URL:-}" ]]; then
  args=(--port "$PORT" --platform-type="$PLATFORM" --namespace="$DASHBOARD_NS" --static-assets-dir="$here/bff/static")
  [[ "$PLATFORM" == "XKS" ]] && args+=(--auth-token-headers=Authorization,x-forwarded-access-token)
  (cd "$here/bff" && go build -o "$work/core-bff" ./cmd)
  LOG_LEVEL=debug "$work/core-bff" "${args[@]}" >"$work/bff.log" 2>&1 &
  bff_pid=$!
  BFF_URL=http://localhost:$PORT
  ready=false
  deadline=$((SECONDS + 60))
  while ((SECONDS < deadline)); do
    if ! kill -0 "$bff_pid" 2>/dev/null; then
      echo >&2 "core-bff exited during startup; last log lines:"
      tail -n 20 "$work/bff.log" >&2
      exit 1
    fi
    if curl -sf --connect-timeout 2 --max-time 5 "$BFF_URL/healthcheck" >/dev/null; then ready=true; break; fi
    sleep 1
  done
  if [[ "$ready" != "true" ]]; then
    echo >&2 "core-bff did not become ready on port $PORT within 60s; last log lines:"
    tail -n 20 "$work/bff.log" >&2
    exit 1
  fi
fi
B=$BFF_URL

# code and body print what curl printed, or "curl-exit-N" when curl exits
# nonzero (a timeout can print a 200 status and still exit 28), so check can
# fail the request before comparing anything.
curl_or_exit() {
  local out rc=0
  out=$(curl -s "${CURL_TIMEOUTS[@]}" "$@") || rc=$?
  if ((rc != 0)); then printf 'curl-exit-%d' "$rc"; else printf '%s' "$out"; fi
}
code() { curl_or_exit -o /dev/null -w '%{http_code}' "$@"; }
body() { curl_or_exit "$@"; }
check() { # id description expected actual
  local verdict=PASS
  if [[ "$4" == curl-exit-* || "$4" == kubectl-exit-* ]]; then
    verdict=FAIL; fails=$((fails + 1))
  elif [[ "$3" != "$4" ]]; then
    verdict=FAIL; fails=$((fails + 1))
  fi
  printf '%-4s %-58s expect %-18s got %-18s %s\n' "$1" "$2" "$3" "$4" "$verdict"
}
skip() { skips=$((skips + 1)); printf '%-4s %-58s SKIP (%s)\n' "$1" "$2" "$3"; }
# ns_label prints the label value, or "kubectl-exit-N" when the lookup fails,
# so an absent label (empty output) is never confused with a failed read.
ns_label() {
  local out rc=0
  out=$("${KUBECTL[@]}" get namespace "$NS" -o jsonpath='{.metadata.labels.modelmesh-enabled}') || rc=$?
  if ((rc != 0)); then printf 'kubectl-exit-%d' "$rc"; else printf '%s' "$out"; fi
}

if [[ "$PLATFORM" == "XKS" ]]; then
  H=Authorization; P="Bearer "
else
  H=x-forwarded-access-token; P=""
fi

# Credential header files. printf is a shell builtin, so the token never
# appears in a process argument list; curl reads the header with -H @file.
hdr() { printf '%s: %s\n' "$2" "$3" >"$work/$1.hdr"; printf '%s' "$work/$1.hdr"; }
CALLER=$(hdr caller "$H" "$P$SA")
SA_AUTH=$(hdr sa-auth Authorization "Bearer $SA")
SA_XFAT=$(hdr sa-xfat x-forwarded-access-token "$SA")

echo "== Caller credential headers =="
if [[ "$PLATFORM" == "XKS" ]]; then
  check H1 "Authorization: Bearer" 200 "$(code -H "@$SA_AUTH" "$B/api/v1/user")"
  check H2 "x-forwarded-access-token" 200 "$(code -H "@$SA_XFAT" "$B/api/v1/user")"
  check H3 "both headers, same token" 200 "$(code -H "@$SA_AUTH" -H "@$SA_XFAT" "$B/api/v1/user")"
  check H4 "both headers, different tokens" 401 "$(code -H "@$SA_AUTH" -H "x-forwarded-access-token: other-token" "$B/api/v1/user")"
  check H5 "Basic scheme with a valid fallback (no fall-through)" 401 "$(code -H "Authorization: Basic dXNlcjpwYXNz" -H "@$SA_XFAT" "$B/api/v1/user")"
else
  check H1 "x-forwarded-access-token" 200 "$(code -H "@$SA_XFAT" "$B/api/v1/user")"
  check H2 "Authorization alone is not read (single-header mode)" 401 "$(code -H "@$SA_AUTH" "$B/api/v1/user")"
fi
check H6 "no credential" 401 "$(code "$B/api/v1/user")"
check H7 "token the API server rejects" 401 "$(code -H "$H: ${P}not-a-real-token" "$B/api/v1/user")"
check H8 "identity headers without a credential" 401 "$(code -H "X-Forwarded-User: admin" -H "Impersonate-User: admin" "$B/api/v1/user")"

echo "== Kubernetes HTTP proxy =="
check P1 "caller lists pods in its namespace" 200 "$(code -H "@$CALLER" "$B/api/k8s/api/v1/namespaces/$NS/pods")"
check P2 "caller lists all namespaces (not permitted)" 403 "$(code -H "@$CALLER" "$B/api/k8s/api/v1/namespaces")"
# P3 uses the request P1 showed the caller may make: had the Impersonate-*
# headers reached the API server, the caller (who may not impersonate) would
# get 403. P4 is only an effective-access check: the API server ignores
# X-Remote-* on a bearer-token connection without a trusted front-proxy
# certificate, so a 200 cannot prove they were stripped. That stripping is
# shown by TestK8sProxy_StripsCallerSuppliedIdentityAndCredentialHeaders in
# bff/internal/proxy/caller_auth_test.go, which inspects the upstream headers.
check P3 "Impersonate-User/Group spoof is stripped" 200 "$(code -H "@$CALLER" -H "Impersonate-User: system:admin" -H "Impersonate-Group: system:masters" "$B/api/k8s/api/v1/namespaces/$NS/pods")"
check P4 "X-Remote-* spoof: caller keeps its own access" 200 "$(code -H "@$CALLER" -H "X-Remote-User: system:admin" -H "X-Remote-Group: system:masters" "$B/api/k8s/api/v1/namespaces/$NS/pods")"
check P5 "no credential: the BFF identity must not act" 401 "$(code "$B/api/k8s/api/v1/namespaces")"
sr='{"apiVersion":"serving.kserve.io/v1alpha1","kind":"ServingRuntime","metadata":{"name":"probe"},"spec":{"containers":[{"name":"kserve-container","image":"quay.io/example/probe:1"}],"supportedModelFormats":[{"name":"onnx"}]}}'
# Skip only when the CRD is really absent; a denied or failed lookup fails the
# run rather than skipping silently.
crd_rc=0
crd_out=$("${KUBECTL[@]}" get crd servingruntimes.serving.kserve.io -o name 2>&1) || crd_rc=$?
if ((crd_rc != 0)) && [[ "$crd_out" != *NotFound* ]]; then
  check P6 "ServingRuntime CRD lookup" "found or NotFound" "kubectl-exit-$crd_rc"
elif ((crd_rc == 0)); then
  check P6 "caller dry-run creates a ServingRuntime where allowed" 201 "$(code -X POST -H "@$CALLER" -H 'Content-Type: application/json' -d "$sr" "$B/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/$NS/servingruntimes?dryRun=All")"
  check P7 "caller dry-run create where not allowed" 403 "$(code -X POST -H "@$CALLER" -H 'Content-Type: application/json' -d "$sr" "$B/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/default/servingruntimes?dryRun=All")"
else
  skip P6-7 "ServingRuntime dry-run creates" "the ServingRuntime CRD is not installed"
fi

echo "== Kubernetes WebSocket proxy =="
ws_module=$(cd "$here" && node -e 'try{console.log(require.resolve("ws"))}catch{}' 2>/dev/null || true)
if [[ -n "$ws_module" ]]; then
  cat >"$work/ws.js" <<'EOF'
const WebSocket = require(process.env.WS_MODULE);
const fs = require('fs');
// The optional second argument is a header file ("Name: value" lines), so the
// credential is never a process argument.
const [url, headerFile] = process.argv.slice(2);
const headers = {};
if (headerFile) {
  for (const line of fs.readFileSync(headerFile, 'utf8').split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
}
const ws = new WebSocket(url, [], { headers, origin: new URL(url).origin.replace(/^ws/, 'http') });
const done = (s) => { console.log(s); try { ws.terminate(); } catch {} process.exit(0); };
ws.on('upgrade', (res) => done(String(res.statusCode)));
ws.on('unexpected-response', (_q, res) => done(String(res.statusCode)));
ws.on('error', (e) => done('error'));
setTimeout(() => done('timeout'), 8000);
EOF
  wsb=${B/#http/ws}
  ws() { WS_MODULE=$ws_module node "$work/ws.js" "$@"; }
  check W1 "caller watches pods in its namespace" 101 "$(ws "$wsb/wss/k8s/api/v1/namespaces/$NS/pods?watch=true" "$CALLER")"
  check W2 "caller watches all namespaces (not permitted)" 403 "$(ws "$wsb/wss/k8s/api/v1/namespaces?watch=true" "$CALLER")"
  check W3 "no credential" 401 "$(ws "$wsb/wss/k8s/api/v1/namespaces/$NS/pods?watch=true")"
else
  skip W1-3 "WebSocket checks" "node with the ws package not found"
fi

echo "== Namespace mutation (credential policy) =="
if [[ "$PLATFORM" == "XKS" ]]; then
  check M1 "caller without Namespace patch, dry run" '{"applied":false}' "$(body -H "@$CALLER" "$B/api/namespaces/$NS/1?dryRun=All")"
  check M2 "caller without Namespace patch" '{"applied":false}' "$(body -H "@$CALLER" "$B/api/namespaces/$NS/1")"
  check M3 "  ...and nothing was written" "" "$(ns_label)"
  # Positive control, so M1-M3 cannot pass on a BFF that never uses the
  # caller's credentials: a second ServiceAccount may patch only this
  # namespace, and its mutation must apply.
  # It needs cluster-scoped RBAC create rights; without them the rows are
  # skipped (and STRICT=true fails the run) rather than aborting it.
  "${KUBECTL[@]}" -n "$NS" create serviceaccount ns-patcher >/dev/null
  "${KUBECTL[@]}" -n "$NS" create rolebinding ns-patcher-serving --role=serving-editor --serviceaccount="$NS:ns-patcher" >/dev/null
  # created_by_us creates the object with this run's ownership label and
  # reports the outcome: 0 created; 1 a confirmed refusal (AlreadyExists, or
  # Forbidden), so the object is not this run's and cleanup never touches it;
  # 2 ambiguous (a client timeout can follow a server-side create), so cleanup
  # checks the label and deletes only this run's object (delete_owned).
  # On success created_uid holds the new object's UID, which cleanup deletes by.
  created_by_us() {
    local out rc=0
    created_uid=""
    out=$("${KUBECTL[@]}" create "$@" --dry-run=client -o json |
      "${KUBECTL[@]}" label --local -f - "$RUN_LABEL=$RUN_ID" -o json |
      "${KUBECTL[@]}" create -f - -o 'jsonpath={.metadata.uid}' 2>&1) || rc=$?
    if ((rc == 0)); then
      created_uid=$out
      return 0
    fi
    [[ "$out" == *"Error from server (AlreadyExists)"* || "$out" == *"Error from server (Forbidden)"* ]] && return 1
    return 2
  }
  cr_rc=0
  created_by_us clusterrole "corebff-validate-$NS" --verb=get,patch --resource=namespaces --resource-name="$NS" || cr_rc=$?
  ((cr_rc != 1)) && cr_created=true
  cr_uid=$created_uid
  crb_rc=1
  if ((cr_rc == 0)); then
    crb_rc=0
    created_by_us clusterrolebinding "corebff-validate-$NS" --clusterrole="corebff-validate-$NS" --serviceaccount="$NS:ns-patcher" || crb_rc=$?
    ((crb_rc != 1)) && crb_created=true
    crb_uid=$created_uid
  fi
  if ((cr_rc == 0 && crb_rc == 0)); then
    PATCHER_TOKEN=$("${KUBECTL[@]}" -n "$NS" create token ns-patcher --duration=1h)
    printf '%s\n' "$PATCHER_TOKEN" >>"$work/needles"
    PATCHER=$(hdr patcher "$H" "$P$PATCHER_TOKEN")
    check M7 "caller allowed to patch only this Namespace" '{"applied":true}' "$(body -H "@$PATCHER" "$B/api/namespaces/$NS/1")"
    check M8 "  ...label written with the caller's credentials" "false" "$(ns_label)"
  else
    skip M7-8 "caller allowed to patch only this Namespace" "may not create ClusterRoles/ClusterRoleBindings"
  fi
else
  check M1 "service account applies after the caller's SSAR" '{"applied":true}' "$(body -H "@$CALLER" "$B/api/namespaces/$NS/1")"
  check M2 "  ...label written by the service account" "false" "$(ns_label)"
fi
check M4 "caller who fails the access review" 403 "$(code -H "@$CALLER" "$B/api/namespaces/default/1")"
if [[ -n "$AD" ]]; then
  ADMIN=$(hdr admin "$H" "$P$AD")
  check M5 "admin applies the mutation" '{"applied":true}' "$(body -H "@$ADMIN" "$B/api/namespaces/$NS/1")"
  check M6 "admin resets the platform" '{"applied":true}' "$(body -H "@$ADMIN" "$B/api/namespaces/$NS/3")"
else
  skip M5-6 "admin mutation" "no ADMIN_TOKEN"
fi

if [[ -n "$bff_pid" ]]; then
  echo "== Logs =="
  # The tokens are matched from a file (grep -f), never from an argument.
  printf '%s\n' "$SA" >>"$work/needles"
  [[ -n "$AD" ]] && printf '%s\n' "$AD" >>"$work/needles"
  leaks=$(grep -cFf "$work/needles" "$work/bff.log" || true)
  check L1 "token values in the debug log" 0 "$leaks"
else
  skip L1 "token values in the debug log" "BFF_URL given; its log is not available"
fi

echo
((skips > 0)) && echo "$skips check group(s) skipped"
if ((fails > 0)); then
  echo "$fails check(s) failed"
  exit 1
fi
if ((skips > 0)) && [[ "${STRICT:-false}" == "true" ]]; then
  echo "STRICT=true and checks were skipped"
  exit 1
fi
echo "all checks passed"
